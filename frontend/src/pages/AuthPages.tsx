import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/FormField'
import { Wordmark } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { getErrorMessage } from '@/lib/api'

const loginSchema = z.object({
  email: z.string().trim().email('Escribe un email válido, por ejemplo ana@correo.com'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Escribe al menos 2 letras'),
  email: z.string().trim().email('Escribe un email válido, por ejemplo ana@correo.com'),
  password: z.string().min(8, 'Usa al menos 8 caracteres'),
})

function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false)
  return (
    <>
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="touch-hitbox absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-gray-400 transition-colors duration-100 hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
      </button>
    </>
  )
}

/**
 * Tarjeta de autenticación con la "signature look" de los componentes de auth:
 * shell con sombra de 4 capas + tarjeta interior blanca con hairline de 0.5px.
 */
function AuthCard({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[25rem] py-2">
      <div className="rounded-xl bg-gray-50 shadow-shell">
        <div className="rounded-xl bg-white px-8 py-9 shadow-[0_0_0_0.5px_#d9d9de,0_1px_2px_rgb(0_0_0/0.04)]">
          <div className="mb-7 flex flex-col items-center gap-4 text-center">
            <Wordmark />
            <div className="space-y-1">
              <h1 className="heading-6">{title}</h1>
              <p className="body-3 text-gray-500">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
        <div className="px-8 py-4 text-center body-3 text-gray-500">{footer}</div>
      </div>
    </div>
  )
}

function ServerError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 body-3 text-destructive-foreground ring-1 ring-destructive/25 ring-inset">
      {message}
    </p>
  )
}

function useRedirectTarget() {
  const location = useLocation()
  return (location.state as { from?: string } | null)?.from ?? '/dashboard'
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched', // valida al salir del campo, no mientras se escribe
  })
  const { errors, isSubmitting } = formState

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null)
    try {
      await login(email, password)
      navigate(target, { replace: true })
    } catch (e) {
      const msg = getErrorMessage(e)
      setServerError(msg === 'Credenciales inválidas' ? 'El email o la contraseña no coinciden.' : msg)
    }
  })

  return (
    <AuthCard
      title="Ingresa a SubsPlatform"
      subtitle="Bienvenido de nuevo. Ingresa para continuar."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" state={{ from: target }} className="label-3 text-primary hover:text-purple-700">
            Crea una
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <ServerError message={serverError} />}
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="ana@correo.com" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField id="password" label="Contraseña" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Continuar
        </Button>
      </form>
    </AuthCard>
  )
}

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState, getFieldState } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  })
  const { errors, isSubmitting } = formState
  const ok = (name: 'name' | 'email' | 'password') => {
    const s = getFieldState(name, formState)
    return s.isTouched && !s.invalid
  }

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null)
    try {
      await registerUser(name, email, password)
      toast.success('Cuenta creada')
      navigate(target === '/dashboard' ? '/pricing' : target, { replace: true })
    } catch (e) {
      setServerError(getErrorMessage(e))
    }
  })

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="3 datos y eliges tu plan."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" state={{ from: target }} className="label-3 text-primary hover:text-purple-700">
            Ingresa
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && <ServerError message={serverError} />}
        <FormField id="name" label="Nombre" error={errors.name?.message} valid={ok('name')}>
          <Input id="name" autoComplete="name" placeholder="Ana López" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message} valid={ok('email')}>
          <Input id="email" type="email" autoComplete="email" placeholder="ana@correo.com" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField id="password" label="Contraseña" error={errors.password?.message} hint="Mínimo 8 caracteres.">
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
        </FormField>
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Crear cuenta
        </Button>
      </form>
    </AuthCard>
  )
}
