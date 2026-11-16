import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { MercadoPagoService } from './mercadopago.service';

describe('MercadoPagoService.verifyWebhookSignature', () => {
  const secret = 'test-secret';
  const service = new MercadoPagoService(
    new ConfigService({ MP_ACCESS_TOKEN: 'x', MP_WEBHOOK_SECRET: secret }),
  );

  const sign = (dataId: string, requestId: string, ts: string) =>
    createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');

  it('acepta una firma válida', () => {
    const v1 = sign('123456', 'req-1', '1704908010');
    expect(
      service.verifyWebhookSignature({
        signatureHeader: `ts=1704908010,v1=${v1}`,
        requestId: 'req-1',
        dataId: '123456',
      }),
    ).toBe(true);
  });

  it('normaliza data.id alfanumérico a minúsculas', () => {
    const v1 = sign('abc123', 'req-2', '1');
    expect(
      service.verifyWebhookSignature({ signatureHeader: `ts=1,v1=${v1}`, requestId: 'req-2', dataId: 'ABC123' }),
    ).toBe(true);
  });

  it('rechaza una firma manipulada', () => {
    const v1 = sign('123456', 'req-1', '1704908010');
    expect(
      service.verifyWebhookSignature({
        signatureHeader: `ts=1704908010,v1=${v1}`,
        requestId: 'req-1',
        dataId: '999999',
      }),
    ).toBe(false);
  });

  it('rechaza si falta el header', () => {
    expect(service.verifyWebhookSignature({ requestId: 'r', dataId: '1' })).toBe(false);
  });
});
