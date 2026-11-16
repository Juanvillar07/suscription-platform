import type { FrequencyType, PaymentStatus, SubscriptionStatus } from './types'

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export const formatCOP = (value: number) => cop.format(value)

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function formatPeriod(frequency: number, type: FrequencyType) {
  if (type === 'MONTHS') {
    if (frequency === 1) return 'mes'
    if (frequency === 12) return 'año'
    return `${frequency} meses`
  }
  return frequency === 1 ? 'día' : `${frequency} días`
}

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  PENDING: 'Pendiente',
  AUTHORIZED: 'Activa',
  PAUSED: 'Pausada',
  CANCELLED: 'Cancelada',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROCESS: 'En proceso',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  REFUNDED: 'Reembolsado',
  CANCELLED: 'Cancelado',
}
