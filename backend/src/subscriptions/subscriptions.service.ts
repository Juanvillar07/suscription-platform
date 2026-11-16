import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, SubscriptionStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators';
import { MercadoPagoApiError, MpPreapproval, MpPreapprovalStatus } from '../mercadopago/mercadopago.client';
import { mapPreapprovalStatus, toDate } from '../mercadopago/mercadopago.mappers';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto';

const OPEN_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.PENDING,
  SubscriptionStatus.AUTHORIZED,
  SubscriptionStatus.PAUSED,
];

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoService,
  ) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan no disponible');
    if (!plan.mpPreapprovalPlanId) {
      throw new BadRequestException('El plan no está sincronizado con Mercado Pago');
    }

    const open = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: OPEN_STATUSES } },
    });
    if (open) throw new ConflictException('Ya tienes una suscripción en curso');

    const subscription = await this.prisma.subscription.create({
      data: { userId, planId: plan.id, payerEmail: dto.payerEmail.toLowerCase() },
    });

    try {
      const preapproval = await this.mp.createPreapproval({
        preapproval_plan_id: plan.mpPreapprovalPlanId,
        reason: plan.name,
        external_reference: subscription.id,
        payer_email: dto.payerEmail,
        card_token_id: dto.cardTokenId,
        back_url: this.mp.backUrl,
        status: 'authorized',
      });
      return this.applyPreapproval(subscription.id, preapproval);
    } catch (e) {
      this.logger.warn(`Alta rechazada para plan=${plan.slug} payer_email=${dto.payerEmail}`);
      // Si MP rechaza el alta, no dejamos una suscripción PENDING huérfana
      await this.prisma.subscription.delete({ where: { id: subscription.id } });
      throw this.toHttpError(e);
    }
  }

  findCurrent(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  pause(user: AuthUser, id: string) {
    return this.changeStatus(user, id, 'paused', [SubscriptionStatus.AUTHORIZED]);
  }

  resume(user: AuthUser, id: string) {
    return this.changeStatus(user, id, 'authorized', [SubscriptionStatus.PAUSED]);
  }

  cancel(user: AuthUser, id: string) {
    return this.changeStatus(user, id, 'cancelled', OPEN_STATUSES);
  }

  /** Trae el estado real desde MP (útil si no llegan webhooks en local) */
  async sync(user: AuthUser, id: string) {
    const sub = await this.getOwned(user, id);
    if (!sub.mpPreapprovalId) return sub;
    try {
      const preapproval = await this.mp.getPreapproval(sub.mpPreapprovalId);
      return this.applyPreapproval(sub.id, preapproval);
    } catch (e) {
      throw this.toHttpError(e);
    }
  }

  /** Usado por el webhook subscription_preapproval */
  async syncByPreapprovalId(preapprovalId: string) {
    const preapproval = await this.mp.getPreapproval(preapprovalId);
    const sub =
      (await this.prisma.subscription.findUnique({ where: { mpPreapprovalId: preapprovalId } })) ??
      (preapproval.external_reference
        ? await this.prisma.subscription.findUnique({ where: { id: preapproval.external_reference } }).catch(() => null)
        : null);
    if (!sub) {
      this.logger.warn(`preapproval ${preapprovalId} no corresponde a ninguna suscripción local`);
      return null;
    }
    return this.applyPreapproval(sub.id, preapproval);
  }

  private async changeStatus(
    user: AuthUser,
    id: string,
    target: MpPreapprovalStatus,
    allowedFrom: SubscriptionStatus[],
  ) {
    const sub = await this.getOwned(user, id);
    if (!allowedFrom.includes(sub.status)) {
      throw new BadRequestException(`No se puede pasar de ${sub.status} a ${target}`);
    }
    if (!sub.mpPreapprovalId) {
      throw new BadRequestException('La suscripción no existe en Mercado Pago');
    }
    try {
      const preapproval = await this.mp.updatePreapproval(sub.mpPreapprovalId, { status: target });
      return this.applyPreapproval(sub.id, preapproval);
    } catch (e) {
      throw this.toHttpError(e);
    }
  }

  private async getOwned(user: AuthUser, id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    if (sub.userId !== user.id && user.role !== Role.ADMIN) throw new ForbiddenException();
    return sub;
  }

  private applyPreapproval(subscriptionId: string, p: MpPreapproval) {
    const status = mapPreapprovalStatus(p.status);
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        mpPreapprovalId: p.id,
        status,
        startDate: toDate(p.auto_recurring?.start_date ?? p.date_created),
        nextPaymentDate: status === SubscriptionStatus.AUTHORIZED ? toDate(p.next_payment_date) : null,
        cancelledAt: status === SubscriptionStatus.CANCELLED ? new Date() : null,
      },
      include: { plan: true },
    });
  }

  private toHttpError(e: unknown) {
    if (e instanceof MercadoPagoApiError) {
      this.logger.error(`MP ${e.status}: ${JSON.stringify(e.body)}`);
      const Ctor = e.status >= 500 ? BadGatewayException : BadRequestException;
      return new Ctor({ message: `Mercado Pago: ${e.message}`, details: e.body });
    }
    return e as Error;
  }
}
