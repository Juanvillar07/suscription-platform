import { Injectable, Logger } from '@nestjs/common';
import { MpAuthorizedPayment, MpPayment } from '../mercadopago/mercadopago.client';
import { mapPaymentStatus, toDate } from '../mercadopago/mercadopago.mappers';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { subscription: { userId } },
      orderBy: { createdAt: 'desc' },
      include: { subscription: { select: { id: true, plan: { select: { name: true } } } } },
    });
  }

  listAll(take = 50, skip = 0) {
    return this.prisma.payment.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          select: { id: true, user: { select: { email: true, name: true } }, plan: { select: { name: true } } },
        },
      },
    });
  }

  /** Factura de suscripción (topic subscription_authorized_payment) */
  async upsertFromAuthorizedPayment(ap: MpAuthorizedPayment) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { mpPreapprovalId: ap.preapproval_id },
    });
    if (!subscription) {
      this.logger.warn(`authorized_payment ${ap.id}: preapproval ${ap.preapproval_id} desconocido`);
      return null;
    }

    const status = mapPaymentStatus(ap.payment?.status ?? ap.status);
    const mpPaymentId = ap.payment?.id ? String(ap.payment.id) : null;
    const data = {
      subscriptionId: subscription.id,
      mpPaymentId,
      amount: Math.round(ap.transaction_amount),
      currency: ap.currency_id,
      status,
      statusDetail: ap.payment?.status_detail ?? ap.status,
      paidAt: status === 'APPROVED' ? toDate(ap.debit_date ?? ap.date_created) : null,
    };

    // Puede que el webhook "payment" haya llegado antes y ya exista por mpPaymentId
    const existing = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { mpAuthorizedPaymentId: String(ap.id) },
          ...(mpPaymentId ? [{ mpPaymentId }] : []),
        ],
      },
    });
    if (existing) {
      return this.prisma.payment.update({
        where: { id: existing.id },
        data: { ...data, mpAuthorizedPaymentId: String(ap.id) },
      });
    }
    return this.prisma.payment.create({ data: { ...data, mpAuthorizedPaymentId: String(ap.id) } });
  }

  /** Pago (topic payment). Solo se registra si pertenece a una suscripción nuestra */
  async upsertFromPayment(p: MpPayment) {
    const preapprovalId =
      p.point_of_interaction?.transaction_data?.subscription_id ??
      (typeof p.metadata?.preapproval_id === 'string' ? p.metadata.preapproval_id : undefined);

    const subscription = preapprovalId
      ? await this.prisma.subscription.findUnique({ where: { mpPreapprovalId: preapprovalId } })
      : p.external_reference
        ? await this.prisma.subscription.findUnique({ where: { id: p.external_reference } }).catch(() => null)
        : null;

    if (!subscription) {
      this.logger.warn(`payment ${p.id}: no se pudo asociar a ninguna suscripción`);
      return null;
    }

    const status = mapPaymentStatus(p.status);
    const data = {
      subscriptionId: subscription.id,
      amount: Math.round(p.transaction_amount),
      currency: p.currency_id,
      status,
      statusDetail: p.status_detail ?? null,
      paidAt: toDate(p.date_approved),
    };
    return this.prisma.payment.upsert({
      where: { mpPaymentId: String(p.id) },
      create: { ...data, mpPaymentId: String(p.id) },
      update: data,
    });
  }
}
