import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { MercadoPagoClient } from './mercadopago.client';

@Injectable()
export class MercadoPagoService extends MercadoPagoClient {
  private readonly webhookSecret: string;
  readonly backUrl: string;

  constructor(config: ConfigService) {
    super(config.get<string>('MP_ACCESS_TOKEN') ?? '');
    this.webhookSecret = config.get<string>('MP_WEBHOOK_SECRET') ?? '';
    this.backUrl = config.get<string>('MP_BACK_URL') ?? 'https://www.mercadopago.com.co';
  }

  get isWebhookSecretConfigured() {
    return this.webhookSecret.length > 0;
  }

  /**
   * Valida el header x-signature de un webhook.
   * Formato: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839"
   * Manifest: "id:{data.id};request-id:{x-request-id};ts:{ts};"
   * https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
   */
  verifyWebhookSignature(params: {
    signatureHeader?: string;
    requestId?: string;
    dataId?: string;
  }): boolean {
    const { signatureHeader, requestId, dataId } = params;
    if (!this.webhookSecret || !signatureHeader) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => {
        const [k, ...v] = p.trim().split('=');
        return [k, v.join('=')];
      }),
    );
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    let manifest = '';
    // Si data.id es alfanumérico MP lo envía en minúsculas en el manifest
    if (dataId) manifest += `id:${dataId.toLowerCase()};`;
    if (requestId) manifest += `request-id:${requestId};`;
    manifest += `ts:${ts};`;

    const expected = createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(v1, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
