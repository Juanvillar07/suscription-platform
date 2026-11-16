import { applyDecorators, Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FrequencyType, PaymentStatus, Role, SubscriptionStatus } from '@prisma/client';
import { ApiAuth, ApiErrors } from '../common/api-docs.decorators';
import { AdminPaymentResponse, AdminStatsResponse, AdminSubscriptionsPage } from '../common/api.schema';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

const ApiPagination = (def: number) =>
  applyDecorators(
    ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Página (desde 1)' }),
    ApiQuery({ name: 'pageSize', required: false, type: Number, example: def, description: 'Elementos por página (máx. 100)' }),
  );

@ApiTags('Admin · Reportes')
@ApiAuth()
@ApiErrors([403, 'Requiere rol ADMIN'])
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar suscripciones', description: 'Con usuario y plan, de la más reciente a la más antigua.' })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus, enumName: 'SubscriptionStatus' })
  @ApiQuery({ name: 'planId', required: false, description: 'Filtrar por id de plan (uuid)' })
  @ApiPagination(20)
  @ApiOkResponse({ type: AdminSubscriptionsPage })
  async subscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('planId') planId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    const where = {
      ...(status && Object.values(SubscriptionStatus).includes(status) ? { status } : {}),
      ...(planId ? { planId } : {}),
    };
    const take = Math.min(pageSize, 100);
    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { select: { id: true, name: true, price: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }

  @Get('payments')
  @ApiOperation({ summary: 'Listar pagos', description: 'Todos los cobros registrados, del más reciente al más antiguo.' })
  @ApiPagination(50)
  @ApiOkResponse({ type: [AdminPaymentResponse] })
  listPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize = 50,
  ) {
    const take = Math.min(pageSize, 100);
    return this.payments.listAll(take, (page - 1) * take);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Métricas',
    description: 'Conteo por estado, MRR (ingreso recurrente normalizado a 1 mes) e ingresos aprobados del mes en curso. Montos en COP.',
  })
  @ApiOkResponse({ type: AdminStatsResponse })
  async stats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [active, paused, cancelled, activeSubs, monthPayments] = await Promise.all([
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.AUTHORIZED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAUSED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.prisma.subscription.findMany({
        where: { status: SubscriptionStatus.AUTHORIZED },
        select: { plan: { select: { price: true, frequency: true, frequencyType: true } } },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.APPROVED, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // MRR: ingreso recurrente normalizado a 1 mes
    const mrr = activeSubs.reduce((acc, { plan }) => {
        const months = plan.frequencyType === FrequencyType.MONTHS ? plan.frequency : plan.frequency / 30;
        return acc + plan.price / months;
      }, 0);

    return {
      activeSubscriptions: active,
      pausedSubscriptions: paused,
      cancelledSubscriptions: cancelled,
      mrr: Math.round(mrr),
      paymentsThisMonth: monthPayments._count,
      revenueThisMonth: monthPayments._sum.amount ?? 0,
      currency: 'COP',
    };
  }
}
