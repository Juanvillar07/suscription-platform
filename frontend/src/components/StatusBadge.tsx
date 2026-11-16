import { paymentStatusLabel, subscriptionStatusLabel } from '@/lib/format'
import type { PaymentStatus, SubscriptionStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'neutral' | 'warning' | 'danger'

// Punto en el color semántico -500; texto en su variante oscura (contraste AA)
const tones: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: 'bg-success-soft text-success-foreground ring-success/25', dot: 'bg-success' },
  neutral: { pill: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' },
  warning: { pill: 'bg-warning-soft text-warning-foreground ring-warning/25', dot: 'bg-warning' },
  danger: { pill: 'bg-destructive-soft text-destructive-foreground ring-destructive/25', dot: 'bg-destructive' },
}

const subTone: Record<SubscriptionStatus, Tone> = {
  AUTHORIZED: 'success',
  PENDING: 'warning',
  PAUSED: 'neutral',
  CANCELLED: 'danger',
}

const payTone: Record<PaymentStatus, Tone> = {
  APPROVED: 'success',
  PENDING: 'warning',
  IN_PROCESS: 'warning',
  REJECTED: 'danger',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
}

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = tones[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 label-4 ring-1 ring-inset', t.pill)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', t.dot)} />
      {children}
    </span>
  )
}

export const SubscriptionBadge = ({ status }: { status: SubscriptionStatus }) => (
  <Pill tone={subTone[status]}>{subscriptionStatusLabel[status]}</Pill>
)

export const PaymentBadge = ({ status }: { status: PaymentStatus }) => (
  <Pill tone={payTone[status]}>{paymentStatusLabel[status]}</Pill>
)
