import { CalendarClock, LockKeyhole, PauseCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MembershipCard } from '@/components/MembershipCard'
import { SectionHeader } from '@/components/SectionHeader'
import { Button, ButtonArrow } from '@/components/ui/button'
import { usePlans } from '@/hooks/queries'
import { formatCOP } from '@/lib/format'

const points = [
  {
    icon: CalendarClock,
    title: 'Cobro automático',
    text: 'Mercado Pago debita tu tarjeta cada mes — sin recordatorios, sin pagos manuales, sin facturas que perseguir.',
  },
  { icon: PauseCircle, title: 'Pausa o cancela en 1 clic', text: 'Desde Mi cuenta, cuando quieras. Sin llamadas ni correos.' },
  {
    icon: LockKeyhole,
    title: 'Tu tarjeta no pasa por aquí',
    text: 'Los datos van cifrados directo a Mercado Pago. Nosotros solo guardamos el estado de tu plan.',
  },
]

export function HomePage() {
  const { data: plans } = usePlans()
  const cheapest = plans?.[0]

  return (
    <div className="space-y-24">
      <section className="grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="max-w-xl space-y-6">
          <p className="tag-1 text-primary">Membresía mensual</p>
          <h1 className="heading-3 text-balance sm:heading-2 lg:heading-1">Contenido premium, sin el papeleo.</h1>
          <p className="max-w-md body-1 text-gray-600">
            Guías, webinars y plantillas para suscriptores. Pagas con tu tarjeta una vez y Mercado Pago cobra solo cada
            mes.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button size="lg" asChild>
              <Link to="/pricing">
                Ver planes <ButtonArrow />
              </Link>
            </Button>
            {cheapest && (
              <p className="body-3 text-gray-500">
                Desde <span className="label-3 text-foreground tabular">{formatCOP(cheapest.price)}/mes</span>
              </p>
            )}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <MembershipCard planName="Pro" holder="Ana López" caption="Activa" last4="3564" className="relative z-10" />
        </div>
      </section>

      <section className="section-rule space-y-12 pt-16">
        <SectionHeader
          eyebrow="Cómo funciona"
          title="Una suscripción que se administra sola"
          description="Eliges un plan, pagas en 2 minutos y listo. El resto lo hace Mercado Pago."
        />
        <div className="grid gap-10 sm:grid-cols-3">
          {points.map(({ icon: Icon, title, text }) => (
            <div key={title} className="space-y-2">
              <Icon className="size-5 text-primary" strokeWidth={1.5} />
              <h3 className="heading-6">{title}</h3>
              <p className="body-2 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
