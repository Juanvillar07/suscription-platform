import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiExtraModels, ApiOkResponse, ApiOperation, ApiParam, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ApiAuth, ApiErrors } from '../common/api-docs.decorators';
import { SubscriptionResponse, UserPaymentResponse } from '../common/api.schema';
import { AuthUser, CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { PaymentsService } from '../payments/payments.service';
import { CreateSubscriptionDto } from './dto';
import { SubscriptionsService } from './subscriptions.service';

const SubIdParam = () => ApiParam({ name: 'id', format: 'uuid', description: 'id de la suscripción (local)' });
const OWNER_NOTE = 'Solo el dueño de la suscripción o un ADMIN.';

@ApiTags('Suscripciones')
@ApiAuth()
@ApiExtraModels(SubscriptionResponse)
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Suscribirse a un plan',
    description: [
      'Crea la suscripción local (PENDING) y el `preapproval` en Mercado Pago con `preapproval_plan_id`, `card_token_id`,',
      '`payer_email` y `external_reference` = id de la suscripción. Si Mercado Pago lo rechaza, la suscripción local se elimina.',
      '',
      'Errores frecuentes de Mercado Pago (400):',
      '- `Payer is associated with a different site`: el email del pagador es de otro país.',
      '- `Cannot pay yourself` / mismo usuario: se usó el email del vendedor.',
      '- `CC_VAL_433` / token inválido: el `cardTokenId` expiró o ya se usó.',
    ].join('\n'),
  })
  @ApiCreatedResponse({ type: SubscriptionResponse })
  @ApiErrors(
    [400, 'Datos inválidos, plan sin sincronizar o Mercado Pago rechazó el alta'],
    [404, 'Plan no disponible'],
    [409, 'El usuario ya tiene una suscripción PENDING, AUTHORIZED o PAUSED'],
    502,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptions.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mi suscripción', description: 'La suscripción más reciente del usuario (en cualquier estado) o `null`.' })
  @ApiOkResponse({ schema: { nullable: true, allOf: [{ $ref: getSchemaPath(SubscriptionResponse) }] } })
  async current(@CurrentUser() user: AuthUser) {
    return (await this.subscriptions.findCurrent(user.id)) ?? null;
  }

  @Get('me/payments')
  @ApiOperation({ summary: 'Mis pagos', description: 'Cobros registrados por los webhooks de Mercado Pago, del más reciente al más antiguo.' })
  @ApiOkResponse({ type: [UserPaymentResponse] })
  myPayments(@CurrentUser() user: AuthUser) {
    return this.payments.listForUser(user.id);
  }

  @Post(':id/pause')
  @HttpCode(200)
  @SubIdParam()
  @ApiOperation({ summary: 'Pausar', description: `AUTHORIZED → PAUSED (\`PUT /preapproval/:id { status: "paused" }\`). ${OWNER_NOTE}` })
  @ApiOkResponse({ type: SubscriptionResponse })
  @ApiErrors([400, 'Transición de estado no permitida'], 403, 404, 502)
  pause(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.pause(user, id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  @SubIdParam()
  @ApiOperation({ summary: 'Reanudar', description: `PAUSED → AUTHORIZED. ${OWNER_NOTE}` })
  @ApiOkResponse({ type: SubscriptionResponse })
  @ApiErrors([400, 'Transición de estado no permitida'], 403, 404, 502)
  resume(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.resume(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @SubIdParam()
  @ApiOperation({
    summary: 'Cancelar',
    description: `Cancela en Mercado Pago (irreversible): ya no habrá más cobros. ${OWNER_NOTE}`,
  })
  @ApiOkResponse({ type: SubscriptionResponse })
  @ApiErrors([400, 'La suscripción ya está cancelada'], 403, 404, 502)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.cancel(user, id);
  }

  @Post(':id/sync')
  @HttpCode(200)
  @SubIdParam()
  @ApiOperation({
    summary: 'Sincronizar estado con Mercado Pago',
    description: `Consulta \`GET /preapproval/:id\` y actualiza estado y próximo cobro. Útil en local cuando no llegan webhooks. No trae los pagos. ${OWNER_NOTE}`,
  })
  @ApiOkResponse({ type: SubscriptionResponse })
  @ApiErrors(403, 404, 502)
  sync(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.sync(user, id);
  }
}
