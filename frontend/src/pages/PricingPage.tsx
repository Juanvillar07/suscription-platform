import { Link } from 'react-router-dom'
import { PlanCard } from '@/components/PlanCard'
import { SectionHeader } from '@/components/SectionHeader'
import { Button, ButtonArrow } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useMySubscription, usePlans } from '@/hooks/queries'
import type { Plan } from '@/lib/types'

export function PricingPage() {
  const { user } = useAuth()
  const { data: plans, isLoading, error } = usePlans()
  const { data: current } = useMySubscription()
  const openSub = user && current && current.status !== 'CANCELLED' ? current : null

  const actionFor = (plan: Plan, featured: boolean) => {
    if (openSub?.planId === plan.id)
      return <Button size="lg" variant={featured ? 'glass' : 'outline'} className="w-full" disabled>Tu plan actual</Button>
    if (openSub)
      return (
        <Button size="lg" variant={featured ? 'glass' : 'outline'} className="w-full" asChild>
          <Link to="/dashboard">Gestionar mi plan</Link>
        </Button>
      )
    if (!plan.mpPreapprovalPlanId)
      return <Button size="lg" variant="outline" className="w-full" disabled>No disponible por ahora</Button>
    return (
      <Button size="lg" variant={featured ? 'default' : 'neutral'} className="w-full" asChild>
        <Link to={`/checkout/${plan.id}`}>
          {plan.freeTrialDays ? `Probar ${plan.freeTrialDays} días gratis` : `Elegir ${plan.name}`} <ButtonArrow />
        </Link>
      </Button>
    )
  }

  return (
    <div className="space-y-12">
      <SectionHeader
        as="h1"
        size="page"
        eyebrow="Planes"
        title="Elige tu plan"
        description="Pagas con tarjeta y Mercado Pago cobra automáticamente cada mes. Sin permanencia: cancela cuando quieras."
      >
        {openSub && (
          <p className="body-2">
            Ya tienes el plan <span className="label-2">{openSub.plan.name}</span> —{' '}
            <Link to="/dashboard" className="label-2 text-primary hover:text-purple-700">
              gestiónalo en Mi cuenta
            </Link>
            .
          </p>
        )}
      </SectionHeader>

      {error && <p className="body-2 text-destructive-foreground">No pudimos cargar los planes. Recarga la página.</p>}

      <div className="grid max-w-[52rem] gap-6 md:grid-cols-2">
        {isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-[30rem] rounded-2xl" />)}
        {plans?.map((plan, i) => {
          const featured = i === plans.length - 1 && plans.length > 1
          return <PlanCard key={plan.id} plan={plan} featured={featured} action={actionFor(plan, featured)} />
        })}
      </div>
    </div>
  )
}
