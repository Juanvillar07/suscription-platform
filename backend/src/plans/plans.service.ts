import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Plan } from '@prisma/client';
import { MercadoPagoApiError } from '../mercadopago/mercadopago.client';
import { buildAutoRecurring } from '../mercadopago/mercadopago.mappers';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from './dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoService,
  ) {}

  findActive() {
    return this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  }

  findAll() {
    return this.prisma.plan.findMany({ orderBy: { price: 'asc' } });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    if (await this.prisma.plan.findUnique({ where: { slug: dto.slug } })) {
      throw new ConflictException('Ya existe un plan con ese slug');
    }
    const plan = await this.prisma.plan.create({ data: { ...dto, freeTrialDays: dto.freeTrialDays ?? null } });
    return this.syncWithMercadoPago(plan.id);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const current = await this.findOne(id);
    const plan = await this.prisma.plan.update({ where: { id }, data: dto });

    const mpFieldsChanged =
      dto.name !== undefined || dto.price !== undefined || dto.frequency !== undefined || dto.frequencyType !== undefined;
    if (mpFieldsChanged && current.mpPreapprovalPlanId) {
      try {
        await this.mp.updatePlan(current.mpPreapprovalPlanId, {
          reason: plan.name,
          auto_recurring: {
            frequency: plan.frequency,
            frequency_type: buildAutoRecurring(plan).frequency_type,
            transaction_amount: plan.price,
            currency_id: plan.currency,
          },
        });
      } catch (e) {
        throw this.toHttpError(e);
      }
    }
    return plan;
  }

  deactivate(id: string) {
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }

  /** Crea el preapproval_plan en MP si el plan aún no lo tiene */
  async syncWithMercadoPago(id: string): Promise<Plan> {
    const plan = await this.findOne(id);
    if (plan.mpPreapprovalPlanId) return plan;
    try {
      const mpPlan = await this.mp.createPlan({
        reason: plan.name,
        auto_recurring: buildAutoRecurring(plan),
        back_url: this.mp.backUrl,
      });
      this.logger.log(`Plan ${plan.slug} creado en MP: ${mpPlan.id}`);
      return this.prisma.plan.update({ where: { id }, data: { mpPreapprovalPlanId: mpPlan.id } });
    } catch (e) {
      throw this.toHttpError(e);
    }
  }

  private toHttpError(e: unknown) {
    if (e instanceof MercadoPagoApiError) {
      this.logger.error(`MP ${e.status}: ${JSON.stringify(e.body)}`);
      // El cuerpo completo de MP queda solo en el log del servidor
      return new BadGatewayException(`Mercado Pago: ${e.message}`);
    }
    return e as Error;
  }
}
