import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PaymentBadge, SubscriptionBadge } from '@/components/StatusBadge'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useAdminPayments,
  useAdminPlanMutations,
  useAdminPlans,
  useAdminStats,
  useAdminSubscriptions,
} from '@/hooks/queries'
import { getErrorMessage } from '@/lib/api'
import { formatCOP, formatDate, formatPeriod, subscriptionStatusLabel } from '@/lib/format'
import type { SubscriptionStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS = ['Resumen', 'Planes', 'Suscripciones', 'Pagos'] as const
type Tab = (typeof TABS)[number]

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('Resumen')
  return (
    <div className="space-y-6">
      <SectionHeader as="h1" size="page" eyebrow="Panel" title="Administración" />
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              tab === t ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Resumen' && <StatsTab />}
      {tab === 'Planes' && <PlansTab />}
      {tab === 'Suscripciones' && <SubscriptionsTab />}
      {tab === 'Pagos' && <PaymentsTab />}
    </div>
  )
}

function StatsTab() {
  const { data, isLoading } = useAdminStats()
  if (isLoading || !data) return <Skeleton className="h-28" />
  const tiles = [
    { label: 'Suscripciones activas', value: data.activeSubscriptions },
    { label: 'MRR', value: formatCOP(data.mrr) },
    { label: 'Ingresos del mes', value: formatCOP(data.revenueThisMonth) },
    { label: 'Pagos del mes', value: data.paymentsThisMonth },
    { label: 'Pausadas', value: data.pausedSubscriptions },
    { label: 'Canceladas', value: data.cancelledSubscriptions },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardHeader>
            <CardDescription>{t.label}</CardDescription>
            <CardTitle className="heading-4 tabular">{t.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

const planSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().optional(),
  features: z.string().min(1, 'Al menos una característica'),
  price: z.coerce.number().int().min(1000, 'Mínimo 1.000 COP'),
  frequency: z.coerce.number().int().min(1).max(12),
  frequencyType: z.enum(['MONTHS', 'DAYS']),
  freeTrialDays: z.coerce.number().int().min(0).max(90).optional(),
})
type PlanForm = z.input<typeof planSchema>

function PlansTab() {
  const { data: plans, isLoading } = useAdminPlans()
  const { create, toggle, sync } = useAdminPlanMutations()
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, formState, reset } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { frequency: 1, frequencyType: 'MONTHS' },
  })

  const onSubmit = handleSubmit(async (raw) => {
    const v = planSchema.parse(raw)
    try {
      await create.mutateAsync({
        ...v,
        features: v.features.split('\n').map((f) => f.trim()).filter(Boolean),
        freeTrialDays: v.freeTrialDays || undefined,
      })
      toast.success('Plan creado y sincronizado con Mercado Pago')
      reset()
      setShowForm(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  })

  const mutate = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      toast.success(ok)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowForm((s) => !s)} variant={showForm ? 'outline' : 'default'}>
        <Plus /> {showForm ? 'Cerrar' : 'Nuevo plan'}
      </Button>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo plan</CardTitle>
            <CardDescription>Se crea en la base de datos y como preapproval_plan en Mercado Pago.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
              <FormField label="Nombre" error={formState.errors.name?.message}><Input {...register('name')} /></FormField>
              <FormField label="Slug" error={formState.errors.slug?.message}><Input placeholder="plan-anual" {...register('slug')} /></FormField>
              <FormField label="Precio (COP)" error={formState.errors.price?.message}><Input type="number" {...register('price')} /></FormField>
              <FormField label="Días de prueba (opcional)" error={formState.errors.freeTrialDays?.message}><Input type="number" {...register('freeTrialDays')} /></FormField>
              <FormField label="Frecuencia" error={formState.errors.frequency?.message}><Input type="number" {...register('frequency')} /></FormField>
              <FormField label="Tipo de frecuencia">
                <select className="h-10 w-full rounded-md bg-white px-2.5 text-[0.875rem] ring-1 ring-black/10" {...register('frequencyType')}>
                  <option value="MONTHS">Meses</option>
                  <option value="DAYS">Días</option>
                </select>
              </FormField>
              <FormField label="Descripción" className="sm:col-span-2"><Input {...register('description')} /></FormField>
              <FormField label="Características (una por línea)" className="sm:col-span-2" error={formState.errors.features?.message}>
                <textarea rows={3} className="w-full rounded-md bg-white px-3 py-2 text-[0.875rem] ring-1 ring-black/10" {...register('features')} />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={formState.isSubmitting}>
                  {formState.isSubmitting && <Loader2 className="animate-spin" />} Crear plan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Mercado Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{formatCOP(p.price)} / {formatPeriod(p.frequency, p.frequencyType)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.mpPreapprovalPlanId ?? <Badge variant="destructive">Sin sincronizar</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'default' : 'outline'}>{p.isActive ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {!p.mpPreapprovalPlanId && (
                        <Button size="sm" variant="outline" disabled={sync.isPending} onClick={() => mutate(() => sync.mutateAsync(p.id), 'Plan sincronizado')}>
                          <RefreshCw /> Sincronizar MP
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={toggle.isPending} onClick={() => mutate(() => toggle.mutateAsync(p), p.isActive ? 'Plan desactivado' : 'Plan activado')}>
                        {p.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FormField({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="body-3 text-destructive-foreground">{error}</p>}
    </div>
  )
}

function SubscriptionsTab() {
  const [status, setStatus] = useState<SubscriptionStatus | ''>('')
  const { data, isLoading } = useAdminSubscriptions(status || undefined)
  return (
    <div className="space-y-4">
      <select
        className="h-[1.875rem] rounded-md bg-white px-2 text-[0.8125rem] shadow-nav"
        value={status}
        onChange={(e) => setStatus(e.target.value as SubscriptionStatus | '')}
      >
        <option value="">Todos los estados</option>
        {Object.entries(subscriptionStatusLabel).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>{data?.total ?? 0} suscripciones</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Próximo cobro</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.user.name}</div>
                      <div className="text-xs text-muted-foreground">{s.user.email}</div>
                    </TableCell>
                    <TableCell>{s.plan.name}</TableCell>
                    <TableCell><SubscriptionBadge status={s.status} /></TableCell>
                    <TableCell>{formatDate(s.nextPaymentDate)}</TableCell>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PaymentsTab() {
  const { data, isLoading } = useAdminPayments()
  if (isLoading) return <Skeleton className="h-32" />
  return (
    <Card>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>ID MP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paidAt ?? p.createdAt)}</TableCell>
                  <TableCell>{p.subscription?.user?.email ?? '—'}</TableCell>
                  <TableCell>{p.subscription?.plan?.name ?? '—'}</TableCell>
                  <TableCell>{formatCOP(p.amount)}</TableCell>
                  <TableCell><PaymentBadge status={p.status} /></TableCell>
                  <TableCell className="font-mono text-xs">{p.mpPaymentId ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
