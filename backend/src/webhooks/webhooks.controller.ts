import { Body, Controller, Headers, HttpCode, Logger, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '../common/api-docs.decorators';
import { WebhookAckResponse } from '../common/api.schema';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { WebhooksService } from './webhooks.service';

interface MpWebhookBody {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooks: WebhooksService,
    private readonly mp: MercadoPagoService,
  ) {}

  /**
   * Notificaciones de Mercado Pago. Configurar en el panel de la app:
   *   URL: https://<tu-túnel>/api/webhooks/mercadopago
   *   Eventos: "Planes y suscripciones" y "Pagos"
   */
  @Post('mercadopago')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Recibir notificación de Mercado Pago',
    description: [
      'Endpoint que llama Mercado Pago (no el frontend). Configúralo en el panel de tu aplicación de MP con los eventos',
      '**Planes y suscripciones** y **Pagos**.',
      '',
      '1. Valida la firma `x-signature` (HMAC-SHA256 de `id:{data.id};request-id:{x-request-id};ts:{ts};` con `MP_WEBHOOK_SECRET`).',
      '   Si `MP_WEBHOOK_SECRET` está vacío no se valida (solo desarrollo).',
      '2. Guarda el evento en `WebhookEvent` (idempotente por `x-request-id`) y responde 200 de inmediato.',
      '3. En segundo plano consulta el recurso real en la API de Mercado Pago según el `type`:',
      '   - `subscription_preapproval` → `GET /preapproval/{id}` → actualiza la suscripción.',
      '   - `subscription_authorized_payment` → `GET /authorized_payments/{id}` → registra el cobro.',
      '   - `payment` → `GET /v1/payments/{id}` → registra el pago.',
    ].join('\n'),
  })
  @ApiHeader({ name: 'x-signature', required: false, description: 'Firma de Mercado Pago: `ts=<timestamp>,v1=<hmac>`' })
  @ApiHeader({ name: 'x-request-id', required: false, description: 'id único de la notificación (idempotencia)' })
  @ApiQuery({ name: 'data.id', required: false, description: 'id del recurso notificado', example: '2c938084726fca480172750000000000' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['subscription_preapproval', 'subscription_authorized_payment', 'payment'],
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'subscription_preapproval' },
        action: { type: 'string', example: 'updated' },
        data: { type: 'object', properties: { id: { type: 'string', example: '2c938084726fca480172750000000000' } } },
        entity: { type: 'string', example: 'preapproval' },
        application_id: { type: 'string', example: '4416489986279405' },
        date: { type: 'string', format: 'date-time' },
        version: { type: 'number', example: 8 },
      },
    },
  })
  @ApiOkResponse({ type: WebhookAckResponse })
  @ApiErrors([401, 'Firma inválida'])
  async mercadopago(
    @Body() body: MpWebhookBody,
    @Query() query: Record<string, string>,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const topic = body?.type ?? body?.topic ?? query.type ?? query.topic;
    const dataId = String(query['data.id'] ?? body?.data?.id ?? query.id ?? '');
    if (!topic || !dataId) return { ignored: true };

    const signatureValid = this.mp.verifyWebhookSignature({
      signatureHeader: signature,
      requestId,
      dataId,
    });
    if (this.mp.isWebhookSecretConfigured && !signatureValid) {
      this.logger.warn(`Firma inválida para ${topic}/${dataId}`);
      throw new UnauthorizedException('Firma inválida');
    }

    const event = await this.webhooks.record({
      topic,
      action: body?.action,
      dataId,
      requestId,
      signatureValid,
      payload: { body, query },
    });
    if (!event) return { duplicated: true };

    // Respondemos 200 de inmediato; MP reintenta si tardamos > 22 s
    void this.webhooks.process(event.id, topic, dataId);
    return { received: true };
  }
}
