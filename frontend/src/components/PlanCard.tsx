import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatCOP, formatPeriod } from '@/lib/format'
import type { Plan } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PlanCardProps {
  plan: Plan
  /** Plan recomendado: superficie gray-900 con borde interior (sin sombra externa en oscuro) */
  featured?: boolean
  action?: ReactNode
  className?: string
}

export function PlanCard({ plan, featured, action, className }: PlanCardProps) {
  const card = (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl p-7 sm:p-8',
        featured ? 'bg-gray-900 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]' : 'bg-card shadow-bento',
        !featured && className,
      )}
    >
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="heading-5">{plan.name}</h2>
          {plan.freeTrialDays ? (
            <span
              className={cn(
                'rounded-md px-2 py-0.5 label-4 ring-1 ring-inset',
                featured ? 'bg-sky-500/20 text-sky-300 ring-sky-300/30' : 'bg-sky-100 text-sky-700 ring-sky-300/40',
              )}
            >
              {plan.freeTrialDays} días gratis
            </span>
          ) : null}
        </div>
        {plan.description && (
          <p className={cn('body-2', featured ? 'text-gray-300' : 'text-gray-600')}>{plan.description}</p>
        )}
      </header>

      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="heading-4 md:heading-3 tabular">{formatCOP(plan.price)}</span>
        <span className={cn('body-3', featured ? 'text-gray-400' : 'text-gray-500')}>
          /{formatPeriod(plan.frequency, plan.frequencyType)}
        </span>
      </p>

      <ul
        className={cn(
          'mt-6 flex-1 space-y-2.5 pt-6 body-2',
          featured ? '[border-top:0.5px_solid_rgb(255_255_255/0.12)]' : 'section-rule',
        )}
      >
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className={cn('mt-1 size-4 shrink-0', featured ? 'text-purple-300' : 'text-primary')} strokeWidth={1.5} />
            {f}
          </li>
        ))}
      </ul>

      {action && <div className="mt-8">{action}</div>}
    </article>
  )
  // El halo vive en un contenedor sin fondo para quedar DEBAJO de la tarjeta
  return featured ? <div className={cn('glow-halo isolate rounded-2xl', className)}>{card}</div> : card
}
