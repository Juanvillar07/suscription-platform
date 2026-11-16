import { Loader2, XCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button, ButtonArrow } from '@/components/ui/button'
import { useMySubscription } from '@/hooks/queries'
import { formatCOP, formatDate, formatPeriod } from '@/lib/format'
import type { Subscription } from '@/lib/types'
import type { CheckoutSuccessState } from './CheckoutPage'

/** Marca de éxito: el círculo entra con rebote y el check se dibuja una sola vez (respeta reduced-motion) */
function SuccessMark() {
  return (
    <svg className="success-mark mx-auto size-14" viewBox="0 0 52 52" aria-hidden>
      <circle cx="26" cy="26" r="25" fill="var(--success)" />
      <path d="M15 27l7 7 15-15" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckoutResultPage() {
  const { data: sub, isLoading } = useMySubscription({ pollWhilePending: true })
  const card = (useLocation().state as CheckoutSuccessState | null) ?? {}

  if (isLoading || sub?.status === 'PENDING') {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center" aria-live="polite">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" strokeWidth={1.5} />
        <h1 className="heading-5">Confirmando tu pago</h1>
        <p className="body-2 text-gray-600">Mercado Pago está procesando la tarjeta. Suele tardar menos de 10 segundos.</p>
      </div>
    )
  }

  if (!sub || sub.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <XCircle className="mx-auto size-12 text-destructive" strokeWidth={1.5} />
        <h1 className="heading-5">No se activó la suscripción</h1>
        <p className="body-2 text-gray-600">
          Mercado Pago no aprobó el cobro y no se hizo ningún cargo. Puedes intentarlo con otra tarjeta.
        </p>
        <Button asChild size="lg">
          <Link to="/pricing">Volver a los planes</Link>
        </Button>
      </div>
    )
  }

  return <SuccessReceipt sub={sub} card={card} />
}

function SuccessReceipt({ sub, card }: { sub: Subscription; card: CheckoutSuccessState }) {
  const trial = !!sub.plan.freeTrialDays
  const period = formatPeriod(sub.plan.frequency, sub.plan.frequencyType)
  const rows = [
    { label: 'Plan', value: `${sub.plan.name} — ${formatCOP(sub.plan.price)}/${period}` },
    { label: trial ? 'Pagaste hoy' : 'Monto cobrado', value: formatCOP(trial ? 0 : sub.plan.price) },
    {
      label: 'Tarjeta',
      value: card.last4 ? `${card.brandName ?? 'Tarjeta'} •••• ${card.last4}` : 'Registrada en Mercado Pago',
      logo: card.brandLogo,
    },
    { label: 'Próximo cobro', value: formatDate(sub.nextPaymentDate) },
    { label: 'Cuenta de Mercado Pago', value: sub.payerEmail },
  ]

  return (
    <div className="mx-auto max-w-lg">
      <div className="space-y-3 text-center" role="status">
        <SuccessMark />
        <p className="tag-1 pt-2 text-success-foreground">{trial ? 'Prueba activada' : 'Pago aprobado'}</p>
        <h1 className="heading-4">{trial ? 'Tu prueba gratis empezó' : 'Pago exitoso'}</h1>
        <p className="body-2 text-gray-600">
          Tu plan {sub.plan.name} ya está activo. Mercado Pago cobrará {formatCOP(sub.plan.price)} automáticamente cada{' '}
          {period}.
        </p>
      </div>

      {/* Comprobante: filas de recibo y la referencia separada por una línea punteada */}
      <section aria-label="Comprobante" className="mt-10 rounded-2xl bg-card shadow-bento">
        <dl className="px-6">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={`flex items-center justify-between gap-4 py-3.5 body-2 ${i ? '[border-top:0.5px_solid_rgb(19_19_22/0.12)]' : ''}`}
            >
              <dt className="text-gray-500">{r.label}</dt>
              <dd className="flex items-center gap-2 text-right label-2 tabular">
                {r.logo && <img src={r.logo} alt="" className="h-4" />}
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-dashed border-gray-200 px-6 py-3.5 mono-2 text-gray-400">
          Ref. {sub.mpPreapprovalId ?? sub.id}
        </p>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="flex-1">
          <Link to="/premium">
            Ver el contenido <ButtonArrow />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1">
          <Link to="/dashboard">Ir a mi cuenta</Link>
        </Button>
      </div>
    </div>
  )
}
