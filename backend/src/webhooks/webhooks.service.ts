import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface IncomingWebhook {
  topic: string;
  action?: string;
  dataId: string;
  requestId?: string;
  signatureValid: boolean;
  payload: unknown;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mp: MercadoPagoService,
    private readonly subscriptions: SubscriptionsService,
    private readonly payments: PaymentsService,
  ) {}

  /** Registra el evento. Devuelve null si ya se había recibido (idempotencia por x-request-id) */
  async record(evt: IncomingWebhook) {
    try {
      return await this.prisma.webhookEvent.create({
        data: {
          topic: evt.topic,
          action: evt.action,
          dataId: evt.dataId,
          requestId: evt.requestId,
          signatureValid: evt.signatureValid,
          payload: (evt.payload ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
      throw e;
    }
  }

  /** Procesa el evento consultando siempre el recurso real en la API de MP */
  async process(eventId: string, topic: string, dataId: string) {
    try {
      switch (topic) {
        case 'subscription_preapproval':
        case 'preapproval':
          await this.subscriptions.syncByPreapprovalId(dataId);
          break;
        case 'subscription_authorized_payment':
        case 'authorized_payment':
          await this.payments.upsertFromAuthorizedPayment(await this.mp.getAuthorizedPayment(dataId));
          break;
        case 'payment':
          await this.payments.upsertFromPayment(await this.mp.getPayment(dataId));
          break;
        default:
          this.logger.debug(`Topic ignorado: ${topic}`);
      }
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date() },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Error procesando ${topic}/${dataId}: ${message}`);
      await this.prisma.webhookEvent.update({ where: { id: eventId }, data: { error: message } });
    }
  }
}
