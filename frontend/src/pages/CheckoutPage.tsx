import {
  CardNumber,
  createCardToken,
  ExpirationDate,
  getIdentificationTypes,
  getPaymentMethods,
  initMercadoPago,
  SecurityCode,
} from '@mercadopago/sdk-react'
import { ArrowLeft, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  fieldError,
  initialFieldState,
  secureFieldFonts,
  secureFieldStyle,
  SecureFieldBox,
  type FieldState,
} from '@/components/checkout/SecureField'
import { FormField } from '@/components/FormField'
import { SectionHeader } from '@/components/SectionHeader'
import { MembershipCard } from '@/components/MembershipCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateSubscription, useMySubscription, usePlan } from '@/hooks/queries'
import { getErrorMessage } from '@/lib/api'
import { formatCOP, formatDate, formatPeriod } from '@/lib/format'
import { friendlyPaymentError } from '@/lib/payment-errors'
import type { Plan } from '@/lib/types'
import { cn } from '@/lib/utils'

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined
if (MP_PUBLIC_KEY) initMercadoPago(MP_PUBLIC_KEY, { locale: 'es-CO' })

type SecureName = 'cardNumber' | 'expirationDate' | 'securityCode'
interface Brand {
  id: string
  name: string
  logo: string
}
export interface CheckoutSuccessState {
  last4?: string
  brandName?: string
  brandLogo?: string
  holder?: string
}

const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim())

export function CheckoutPage() {
  const { planId = '' } = useParams()
  const navigate = useNavigate()
  const { data: plan, isLoading } = usePlan(planId)
  const { data: current } = useMySubscription()
  const createSubscription = useCreateSubscription()

  // Campos propios (no sensibles)
  const [email, setEmail] = useState('')
  const [holder, setHolder] = useState('')
  const [docType, setDocType] = useState('CC')
  const [docNumber, setDocNumber] = useState('')
  const [touched, setTouched] = useState({ email: false, holder: false, docNumber: false })
  const [docTypes, setDocTypes] = useState<{ id: string; name: string }[]>([])

  // Campos seguros (iframes de Mercado Pago): solo conocemos su estado, nunca su valor
  const [secure, setSecure] = useState<Record<SecureName, FieldState>>({
    cardNumber: initialFieldState,
    expirationDate: initialFieldState,
    securityCode: initialFieldState,
  })
  const [brand, setBrand] = useState<Brand | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!MP_PUBLIC_KEY) return
    getIdentificationTypes()
      .then((types) => types?.length && setDocTypes(types.map((t) => ({ id: t.id, name: t.name }))))
      .catch(() => setDocTypes([{ id: 'CC', name: 'C.C.' }]))
  }, [])

  /*
    IMPORTANTE: los componentes de campos seguros de @mercadopago/sdk-react desmontan y vuelven
    a montar su iframe cada vez que cambia CUALQUIER prop (incluidos los callbacks).
    Por eso todos los handlers se crean una sola vez (useMemo/useCallback sin dependencias):
    si cambiaran en cada render, el foco provocaría un re-render → remontaje → se pierde el foco
    y no se puede escribir en la tarjeta.
  */
  const fieldHandlers = useMemo(() => {
    const patch = (name: SecureName, p: Partial<FieldState>) =>
      setSecure((s) => ({ ...s, [name]: { ...s[name], ...p } }))
    const make = (name: SecureName) => ({
      onFocus: () => patch(name, { focused: true }),
      onBlur: () => patch(name, { focused: false, touched: true }),
      onChange: () => patch(name, { dirty: true }),
      onValidityChange: ({ errorMessages }: { errorMessages: { message: string }[] }) =>
        patch(name, { errors: errorMessages.map((e) => e.message) }),
    })
    return { cardNumber: make('cardNumber'), expirationDate: make('expirationDate'), securityCode: make('securityCode') }
  }, [])

  // Franquicia desde el primer dígito (BIN): logo real de Mercado Pago
  const onBinChange = useCallback(({ bin }: { bin?: string }) => {
    if (!bin) return setBrand(null)
    getPaymentMethods({ bin })
      .then((res) => {
        const pm = res?.results?.[0]
        setBrand(pm ? { id: pm.id, name: pm.name, logo: pm.secure_thumbnail } : null)
      })
      .catch(() => setBrand(null))
  }, [])

  if (current && current.status !== 'CANCELLED') return <Navigate to="/dashboard" replace />

  const errors = {
    email: touched.email && !isEmail(email) ? 'Escribe el email de tu cuenta de Mercado Pago' : undefined,
    cardNumber: fieldError(secure.cardNumber, secure.cardNumber.dirty ? 'Revisa el número: está incompleto o no es válido' : 'Escribe el número de la tarjeta'),
    expirationDate: fieldError(secure.expirationDate, secure.expirationDate.dirty ? 'Revisa la fecha (MM/AA)' : 'Escribe el vencimiento'),
    securityCode: fieldError(secure.securityCode, secure.securityCode.dirty ? 'Revisa el código' : 'Escribe el código de 3 o 4 dígitos'),
    holder: touched.holder && holder.trim().length < 3 ? 'Escribe el nombre como aparece en la tarjeta' : undefined,
    docNumber: touched.docNumber && !/^\d{5,12}$/.test(docNumber) ? 'Escribe solo números (5 a 12 dígitos)' : undefined,
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!plan) return
    setFormError(null)
    // Al enviar mostramos todos los errores pendientes
    setTouched({ email: true, holder: true, docNumber: true })
    setSecure((s) => ({
      cardNumber: { ...s.cardNumber, touched: true },
      expirationDate: { ...s.expirationDate, touched: true },
      securityCode: { ...s.securityCode, touched: true },
    }))
    if (!isEmail(email) || holder.trim().length < 3 || !/^\d{5,12}$/.test(docNumber)) return

    setSubmitting(true)
    try {
      const token = await createCardToken({
        cardholderName: holder.trim(),
        identificationType: docType,
        identificationNumber: docNumber,
      })
      if (!token?.id) throw new Error('Revisa los datos de la tarjeta.')

      await createSubscription.mutateAsync({ planId: plan.id, cardTokenId: token.id, payerEmail: email.trim() })

      const state: CheckoutSuccessState = {
        last4: token.last_four_digits,
        brandName: brand?.name,
        brandLogo: brand?.logo,
        holder: holder.trim(),
      }
      navigate('/checkout/result', { replace: true, state })
    } catch (err) {
      // createCardToken lanza un array de causas cuando hay campos inválidos
      if (Array.isArray(err)) setFormError('Revisa los datos de la tarjeta marcados en rojo.')
      else setFormError(friendlyPaymentError(getErrorMessage(err)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <Link to="/pricing" className="inline-flex items-center gap-1.5 label-3 text-gray-500 transition-colors duration-100 hover:text-foreground">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> Volver a los planes
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12">
        {/* Resumen: arriba en móvil, a la derecha en escritorio */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:order-2">
          {isLoading || !plan ? (
            <Skeleton className="aspect-[1.586] rounded-2xl" />
          ) : (
            <>
              <MembershipCard
                className="hidden lg:block"
                planName={plan.name}
                holder={holder}
                caption={formatPeriod(plan.frequency, plan.frequencyType) === 'mes' ? 'Mensual' : `Cada ${formatPeriod(plan.frequency, plan.frequencyType)}`}
                brandLogo={brand?.logo}
                brandName={brand?.name}
              />
              <PlanSummary plan={plan} />
            </>
          )}
        </aside>

        <form onSubmit={onSubmit} noValidate className="space-y-8 lg:order-1">
          <SectionHeader
            as="h1"
            size="page"
            eyebrow="Pago seguro"
            title="Completa tu pago"
            description="Tus datos de tarjeta van cifrados directo a Mercado Pago — nunca pasan por nuestros servidores."
          />

          {!MP_PUBLIC_KEY && (
            <Alert variant="destructive">
              <AlertDescription>Falta configurar VITE_MP_PUBLIC_KEY en frontend/.env</AlertDescription>
            </Alert>
          )}

          <fieldset disabled={submitting} className="space-y-4">
            <legend className="mb-4 heading-6">Cuenta de Mercado Pago</legend>
            <FormField
              id="payerEmail"
              label="Email"
              error={errors.email}
              valid={touched.email && isEmail(email)}
              hint="El de la cuenta de Mercado Pago que paga. Debe ser de Colombia."
            >
              <Input
                id="payerEmail"
                type="email"
                autoComplete="email"
                placeholder="ana@correo.com"
                value={email}
                aria-invalid={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
            </FormField>
          </fieldset>

          <fieldset disabled={submitting} className="space-y-4">
            <legend className="mb-4 heading-6">Tarjeta</legend>

            {MP_PUBLIC_KEY && (
              <>
                <SecureFieldBox
                  label="Número de tarjeta"
                  htmlFor="cardNumber-label"
                  state={secure.cardNumber}
                  error={errors.cardNumber}
                  adornment={
                    brand ? (
                      <img src={brand.logo} alt={brand.name} title={brand.name} className="h-5 shrink-0" />
                    ) : null
                  }
                >
                  <CardNumber
                    placeholder="1234 1234 1234 1234"
                    style={secureFieldStyle}
                    customFonts={secureFieldFonts}
                    onBinChange={onBinChange}
                    {...fieldHandlers.cardNumber}
                  />
                </SecureFieldBox>

                <div className="grid grid-cols-2 gap-4">
                  <SecureFieldBox
                    label="Vencimiento"
                    htmlFor="expiration-label"
                    state={secure.expirationDate}
                    error={errors.expirationDate}
                  >
                    <ExpirationDate
                      placeholder="MM/AA"
                      mode="short"
                      style={secureFieldStyle}
                      customFonts={secureFieldFonts}
                      {...fieldHandlers.expirationDate}
                    />
                  </SecureFieldBox>
                  <SecureFieldBox
                    label="Código de seguridad"
                    htmlFor="cvc-label"
                    state={secure.securityCode}
                    error={errors.securityCode}
                  >
                    <SecurityCode
                      placeholder="CVC"
                      style={secureFieldStyle}
                      customFonts={secureFieldFonts}
                      {...fieldHandlers.securityCode}
                    />
                  </SecureFieldBox>
                </div>
              </>
            )}

            <FormField id="holder" label="Nombre en la tarjeta" error={errors.holder} valid={touched.holder && !errors.holder}>
              <Input
                id="holder"
                autoComplete="cc-name"
                placeholder="Ana López"
                value={holder}
                aria-invalid={!!errors.holder}
                onChange={(e) => setHolder(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, holder: true }))}
              />
            </FormField>

            <div className="grid grid-cols-[8.5rem_1fr] gap-4">
              <FormField id="docType" label="Documento">
                <select
                  id="docType"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="h-10 w-full rounded-md bg-white px-2.5 text-base ring-1 ring-black/10 outline-none focus-visible:shadow-[0_0_0_1px_color-mix(in_oklab,black_15%,transparent),0_0_0_4px_color-mix(in_oklab,black_8%,transparent)] focus-visible:ring-0 md:text-[0.875rem]"
                >
                  {(docTypes.length ? docTypes : [{ id: 'CC', name: 'C.C.' }]).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="docNumber" label="Número de documento" error={errors.docNumber} valid={touched.docNumber && !errors.docNumber}>
                <Input
                  id="docNumber"
                  inputMode="numeric"
                  placeholder="1234567890"
                  value={docNumber}
                  aria-invalid={!!errors.docNumber}
                  onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => setTouched((t) => ({ ...t, docNumber: true }))}
                />
              </FormField>
            </div>
          </fieldset>

          {import.meta.env.DEV && <TestDataHint />}

          {/* Total justo encima del botón: la persona sabe cuánto paga antes de pulsarlo */}
          {plan && (
            <div className="section-rule space-y-5 pt-6">
              <TotalBreakdown plan={plan} />
              {formError && (
                <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2.5 body-3 text-destructive-foreground ring-1 ring-destructive/25 ring-inset">
                  {formError}
                </p>
              )}
              <Button type="submit" size="xl" className="w-full" disabled={submitting || !MP_PUBLIC_KEY}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" /> Procesando pago…
                  </>
                ) : (
                  <>
                    <Lock /> {plan.freeTrialDays ? 'Iniciar prueba gratis' : `Pagar ${formatCOP(plan.price)}`}
                  </>
                )}
              </Button>
              <p className="flex items-start gap-2 body-3 text-gray-500">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                Mercado Pago cobrará {formatCOP(plan.price)} cada {formatPeriod(plan.frequency, plan.frequencyType)} hasta que
                canceles. Puedes cancelar cuando quieras desde Mi cuenta.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function trialEnd(plan: Plan) {
  const d = new Date()
  d.setDate(d.getDate() + (plan.freeTrialDays ?? 0))
  return d.toISOString()
}

function PlanSummary({ plan }: { plan: Plan }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-bento">
      <div className="flex items-baseline justify-between gap-3">
        <p className="heading-6">Plan {plan.name}</p>
        <p className="label-2 tabular">
          {formatCOP(plan.price)}
          <span className="body-3 text-gray-500">/{formatPeriod(plan.frequency, plan.frequencyType)}</span>
        </p>
      </div>
      <ul className="mt-3 space-y-1 body-3 text-gray-600">
        {plan.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  )
}

function TotalBreakdown({ plan }: { plan: Plan }) {
  const trial = !!plan.freeTrialDays
  const rows = trial
    ? [
        { label: `Prueba gratis de ${plan.freeTrialDays} días`, value: formatCOP(0) },
        { label: `Desde el ${formatDate(trialEnd(plan))}`, value: `${formatCOP(plan.price)} / ${formatPeriod(plan.frequency, plan.frequencyType)}` },
      ]
    : [
        { label: `Plan ${plan.name}, primer ${formatPeriod(plan.frequency, plan.frequencyType)}`, value: formatCOP(plan.price) },
        { label: 'Siguientes cobros', value: `${formatCOP(plan.price)} / ${formatPeriod(plan.frequency, plan.frequencyType)}` },
      ]
  return (
    <dl className="space-y-2 body-2">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4 text-gray-600">
          <dt>{r.label}</dt>
          <dd className="tabular">{r.value}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 pt-2">
        <dt className="label-2">Pagas hoy</dt>
        <dd className="heading-4 tabular">{formatCOP(trial ? 0 : plan.price)}</dd>
      </div>
    </dl>
  )
}

function TestDataHint() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50 p-4 body-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="tag-1 text-primary" aria-expanded={open}>
        {open ? 'Ocultar datos de prueba' : 'Ver datos de prueba'}
      </button>
      <dl className={cn('mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-purple-900', !open && 'hidden')}>
        <dt>Email</dt>
        <dd>el del usuario comprador de prueba (Colombia)</dd>
        <dt>Tarjeta</dt>
        <dd className="mono-2 tabular">5254 1336 7440 3564</dd>
        <dt>Vencimiento y código</dt>
        <dd className="mono-2 tabular">11/30 y 123</dd>
        <dt>Nombre</dt>
        <dd><b>APRO</b> para aprobar, <b>OTHE</b> para rechazar</dd>
        <dt>Documento</dt>
        <dd className="mono-2 tabular">C.C. 123456789</dd>
      </dl>
    </div>
  )
}
