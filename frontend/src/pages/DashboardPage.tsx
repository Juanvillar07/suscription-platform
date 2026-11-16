import { Loader2, Pause, Play, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MembershipCard } from '@/components/MembershipCard'
import { SectionHeader } from '@/components/SectionHeader'
import { PaymentBadge, SubscriptionBadge } from '@/components/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import { useMyPayments, useMySubscription, useSubscriptionAction } from '@/hooks/queries'
import { getErrorMessage } from '@/lib/api'
import { formatCOP, formatDate, formatPeriod, subscriptionStatusLabel } from '@/lib/format'

type Action = 'pause' | 'resume' | 'cancel' | 'sync'
const done: Record<Action, string> = {
  pause: 'Suscripción pausada',
  resume: 'Suscripción reanudada',
  cancel: 'Suscripción cancelada',
  sync: 'Estado actualizado desde Mercado Pago',
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: sub, isLoading } = useMySubscription({ pollWhilePending: true })
  const { data: payments, isLoading: loadingPayments } = useMyPayments()
  const action = useSubscriptionAction()

  const run = async (kind: Action) => {
    if (!sub) return
    try {
      await action.mutateAsync({ id: sub.id, action: kind })
      toast.success(done[kind])
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }
  const busy = action.isPending
  const pendingAction = action.variables?.action

  return (
    <div className="space-y-12">
      <SectionHeader as="h1" size="page" eyebrow="Mi cuenta" title={`Hola, ${user?.name?.split(' ')[0] ?? ''}`} description="Tu plan, tu tarjeta y tus cobros en un solo lugar." />

      {isLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : !sub ? (
        <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-25 p-8 sm:p-10">
          <h2 className="heading-5">Aún no tienes un plan</h2>
          <p className="mt-1 max-w-md body-2 text-gray-600">
            Elige uno para desbloquear el contenido. El cobro es automático y puedes cancelar cuando quieras.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/pricing">Ver planes</Link>
          </Button>
        </section>
      ) : (
        <section className="grid items-center gap-8 md:grid-cols-[22rem_1fr] md:gap-12">
          <MembershipCard
            planName={sub.plan.name}
            caption={subscriptionStatusLabel[sub.status]}
            holder={user?.name}
            muted={sub.status === 'CANCELLED' || sub.status === 'PAUSED'}
          />

          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 body-2 lg:grid-cols-3">
              <div>
                <dt className="tag-2 text-gray-500">Estado</dt>
                <dd className="mt-1"><SubscriptionBadge status={sub.status} /></dd>
              </div>
              <div>
                <dt className="tag-2 text-gray-500">Precio</dt>
                <dd className="mt-1 label-2 tabular">
                  {formatCOP(sub.plan.price)} / {formatPeriod(sub.plan.frequency, sub.plan.frequencyType)}
                </dd>
              </div>
              <div>
                <dt className="tag-2 text-gray-500">Próximo cobro</dt>
                <dd className="mt-1 label-2">
                  {sub.status === 'AUTHORIZED' ? formatDate(sub.nextPaymentDate) : 'Sin cobros programados'}
                </dd>
              </div>
              <div className="col-span-2 lg:col-span-3">
                <dt className="tag-2 text-gray-500">Cuenta de Mercado Pago</dt>
                <dd className="mt-1 truncate label-2">{sub.payerEmail}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              {sub.status === 'AUTHORIZED' && (
                <Button variant="outline" size="lg" disabled={busy} onClick={() => run('pause')}>
                  {pendingAction === 'pause' && busy ? <Loader2 className="animate-spin" /> : <Pause />} Pausar
                </Button>
              )}
              {sub.status === 'PAUSED' && (
                <Button size="lg" disabled={busy} onClick={() => run('resume')}>
                  {pendingAction === 'resume' && busy ? <Loader2 className="animate-spin" /> : <Play />} Reanudar
                </Button>
              )}
              {sub.status === 'CANCELLED' && (
                <Button asChild size="lg">
                  <Link to="/pricing">Elegir un plan de nuevo</Link>
                </Button>
              )}
              {sub.mpPreapprovalId && (
                <Button variant="ghost" size="lg" disabled={busy} onClick={() => run('sync')}>
                  <RefreshCw className={pendingAction === 'sync' && busy ? 'animate-spin' : ''} /> Actualizar estado
                </Button>
              )}
              {sub.status !== 'CANCELLED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="text-destructive-foreground hover:bg-destructive-soft sm:ml-auto" disabled={busy}>
                      Cancelar suscripción
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar tu plan {sub.plan.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mercado Pago dejará de cobrarte y perderás el acceso al contenido. No se puede deshacer: para
                        volver tendrías que suscribirte de nuevo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mantener mi plan</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => run('cancel')}>
                        Cancelar suscripción
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <p className="tag-1 text-primary">Historial</p>
          <h2 className="mt-2 heading-5">Cobros</h2>
          <p className="mt-1 body-3 text-gray-500">Aparecen aquí cuando Mercado Pago confirma cada cobro.</p>
        </div>
        {loadingPayments ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : !payments?.length ? (
          <p className="rounded-2xl bg-card px-6 py-8 text-center body-3 text-gray-500 shadow-bento">
            {sub && sub.status !== 'CANCELLED'
              ? 'Todavía no hay cobros. El primero aparece unos minutos después de suscribirte.'
              : 'Todavía no hay cobros.'}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-bento">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Fecha</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden pr-6 sm:table-cell">Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">{formatDate(p.paidAt ?? p.createdAt)}</TableCell>
                    <TableCell>{p.subscription?.plan?.name ?? '—'}</TableCell>
                    <TableCell className="text-right label-3 tabular">{formatCOP(p.amount)}</TableCell>
                    <TableCell><PaymentBadge status={p.status} /></TableCell>
                    <TableCell className="hidden pr-6 mono-2 text-gray-400 sm:table-cell">
                      {p.mpPaymentId ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
