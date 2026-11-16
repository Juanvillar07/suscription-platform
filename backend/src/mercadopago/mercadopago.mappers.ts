import { FrequencyType, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { MpAutoRecurring, MpFrequencyType } from './mercadopago.client';

export function toMpFrequencyType(t: FrequencyType): MpFrequencyType {
  return t === FrequencyType.DAYS ? 'days' : 'months';
}

export function buildAutoRecurring(plan: {
  price: number;
  currency: string;
  frequency: number;
  frequencyType: FrequencyType;
  freeTrialDays: number | null;
}): MpAutoRecurring {
  return {
    frequency: plan.frequency,
    frequency_type: toMpFrequencyType(plan.frequencyType),
    transaction_amount: plan.price,
    currency_id: plan.currency,
    ...(plan.freeTrialDays
      ? { free_trial: { frequency: plan.freeTrialDays, frequency_type: 'days' as const } }
      : {}),
  };
}

export function mapPreapprovalStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'authorized':
      return SubscriptionStatus.AUTHORIZED;
    case 'paused':
      return SubscriptionStatus.PAUSED;
    case 'cancelled':
      return SubscriptionStatus.CANCELLED;
    default:
      return SubscriptionStatus.PENDING;
  }
}

export function mapPaymentStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'approved':
    case 'processed':
      return PaymentStatus.APPROVED;
    case 'rejected':
      return PaymentStatus.REJECTED;
    case 'refunded':
    case 'charged_back':
      return PaymentStatus.REFUNDED;
    case 'cancelled':
      return PaymentStatus.CANCELLED;
    case 'in_process':
    case 'recycling':
      return PaymentStatus.IN_PROCESS;
    default:
      return PaymentStatus.PENDING;
  }
}

export const toDate = (s?: string | null) => (s ? new Date(s) : null);
