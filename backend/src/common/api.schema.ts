/**
 * Esquemas de RESPUESTA para la documentación OpenAPI (Swagger).
 * Reflejan lo que devuelven los servicios (modelos de Prisma); no se usan en tiempo de ejecución.
 */
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { FrequencyType, PaymentStatus, Role, SubscriptionStatus } from '@prisma/client';

export class ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Mercado Pago: Payer is associated with a different site',
  })
  message: string | string[];

  @ApiPropertyOptional({ example: 'Bad Request' })
  error?: string;

}

// ---------- Usuarios / Auth ----------

export class PublicUser {
  @ApiProperty({ format: 'uuid', example: 'fddd205c-8da6-4aa5-9e3f-10441a76d985' })
  id: string;

  @ApiProperty({ example: 'Ana López' })
  name: string;

  @ApiProperty({ example: 'ana@correo.com' })
  email: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  role: Role;
}

export class AuthResponse {
  @ApiProperty({ type: PublicUser })
  user: PublicUser;

  @ApiProperty({
    description: 'JWT de acceso (15 min). Enviar como `Authorization: Bearer <token>`. El refresh token llega en la cookie httpOnly `refresh_token`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}

export class PlanRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Pro' })
  name: string;
}

export class SubscriptionSummary {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: SubscriptionStatus, enumName: 'SubscriptionStatus' })
  status: SubscriptionStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  nextPaymentDate: Date | null;

  @ApiProperty({ type: PlanRef })
  plan: PlanRef;
}

export class MeResponse extends PublicUser {
  @ApiProperty({ type: SubscriptionSummary, nullable: true, description: 'Suscripción abierta (PENDING, AUTHORIZED o PAUSED) o null' })
  subscription: SubscriptionSummary | null;
}

// ---------- Planes ----------

export class PlanResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Pro' })
  name: string;

  @ApiProperty({ example: 'pro' })
  slug: string;

  @ApiProperty({ type: String, nullable: true, example: 'Para usuarios que quieren todo.' })
  description: string | null;

  @ApiProperty({ type: [String], example: ['Todo lo del plan Básico', 'Webinars mensuales'] })
  features: string[];

  @ApiProperty({ description: 'Precio en COP (entero, sin decimales)', example: 39900 })
  price: number;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ description: 'Cada cuántas unidades de `frequencyType` se cobra', example: 1 })
  frequency: number;

  @ApiProperty({ enum: FrequencyType, enumName: 'FrequencyType', example: FrequencyType.MONTHS })
  frequencyType: FrequencyType;

  @ApiProperty({ type: Number, nullable: true, example: 7 })
  freeTrialDays: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'id del `preapproval_plan` en Mercado Pago. Si es null el plan aún no se puede contratar.',
    example: '8bf671cbdb1d42a4ae361298dcccf6ba',
  })
  mpPreapprovalPlanId: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

// ---------- Suscripciones ----------

export class SubscriptionResponse {
  @ApiProperty({ format: 'uuid', description: 'También se envía a Mercado Pago como `external_reference`' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  planId: string;

  @ApiProperty({ type: String, nullable: true, description: 'id del `preapproval` en Mercado Pago', example: '2c938084726fca480172750000000000' })
  mpPreapprovalId: string | null;

  @ApiProperty({
    enum: SubscriptionStatus,
    enumName: 'SubscriptionStatus',
    description: 'PENDING: esperando a MP · AUTHORIZED: activa · PAUSED: pausada · CANCELLED: cancelada',
  })
  status: SubscriptionStatus;

  @ApiProperty({ example: 'test_user_123456789@testuser.com' })
  payerEmail: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startDate: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  nextPaymentDate: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ type: PlanResponse })
  plan: PlanResponse;
}

// ---------- Pagos ----------

export class PaymentResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  subscriptionId: string;

  @ApiProperty({ type: String, nullable: true, description: 'id del pago en Mercado Pago', example: '1325418765' })
  mpPaymentId: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'id del `authorized_payment` (factura de la suscripción)' })
  mpAuthorizedPaymentId: string | null;

  @ApiProperty({ description: 'Monto en COP', example: 19900 })
  amount: number;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  status: PaymentStatus;

  @ApiProperty({ type: String, nullable: true, example: 'accredited' })
  statusDetail: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

class PaymentSubscriptionRef {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: Object, example: { name: 'Básico' } })
  plan: { name: string };
}

export class UserPaymentResponse extends PaymentResponse {
  @ApiProperty({ type: PaymentSubscriptionRef })
  subscription: PaymentSubscriptionRef;
}

class AdminPaymentSubscriptionRef extends PaymentSubscriptionRef {
  @ApiProperty({ type: Object, example: { email: 'ana@correo.com', name: 'Ana López' } })
  user: { email: string; name: string };
}

export class AdminPaymentResponse extends PaymentResponse {
  @ApiProperty({ type: AdminPaymentSubscriptionRef })
  subscription: AdminPaymentSubscriptionRef;
}

// ---------- Admin ----------

class AdminSubscriptionPlan {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Básico' }) name: string;
  @ApiProperty({ example: 19900 }) price: number;
}

class AdminSubscriptionUser {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Ana López' }) name: string;
  @ApiProperty({ example: 'ana@correo.com' }) email: string;
}

export class AdminSubscriptionItem extends OmitType(SubscriptionResponse, ['plan'] as const) {
  @ApiProperty({ type: AdminSubscriptionPlan })
  plan: AdminSubscriptionPlan;

  @ApiProperty({ type: AdminSubscriptionUser })
  user: AdminSubscriptionUser;
}

export class AdminSubscriptionsPage {
  @ApiProperty({ type: [AdminSubscriptionItem] })
  items: AdminSubscriptionItem[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class AdminStatsResponse {
  @ApiProperty({ example: 12 }) activeSubscriptions: number;
  @ApiProperty({ example: 2 }) pausedSubscriptions: number;
  @ApiProperty({ example: 5 }) cancelledSubscriptions: number;
  @ApiProperty({ description: 'Ingreso recurrente mensual normalizado (COP)', example: 358800 }) mrr: number;
  @ApiProperty({ example: 14 }) paymentsThisMonth: number;
  @ApiProperty({ description: 'Pagos aprobados del mes en curso (COP)', example: 398000 }) revenueThisMonth: number;
  @ApiProperty({ example: 'COP' }) currency: string;
}

// ---------- Contenido / Webhooks ----------

class PremiumItem {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Guía avanzada' }) title: string;
  @ApiProperty({ example: 'Material exclusivo para suscriptores.' }) description: string;
}

export class PremiumContentResponse {
  @ApiProperty({ example: 'Contenido premium' }) title: string;
  @ApiProperty({ example: 'Hola ana@correo.com, gracias por tu suscripción.' }) message: string;
  @ApiProperty({ type: [PremiumItem] }) items: PremiumItem[];
}

export class WebhookAckResponse {
  @ApiPropertyOptional({ example: true, description: 'Evento registrado; se procesa en segundo plano' })
  received?: boolean;

  @ApiPropertyOptional({ example: true, description: 'El evento ya se había recibido (mismo x-request-id)' })
  duplicated?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notificación sin `type` o sin `data.id`' })
  ignored?: boolean;
}
