import { CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface FieldState {
  /** El campo perdió el foco al menos una vez (solo entonces mostramos errores) */
  touched: boolean
  focused: boolean
  /** Último resultado de validación de Mercado Pago (null = aún sin validar) */
  errors: string[] | null
  /** Se escribió algo en el campo */
  dirty: boolean
}

export const initialFieldState: FieldState = { touched: false, focused: false, errors: null, dirty: false }

export const fieldIsValid = (s: FieldState) => s.dirty && s.errors !== null && s.errors.length === 0
export const fieldError = (s: FieldState, message: string) =>
  s.touched && !s.focused && (!s.dirty || (s.errors?.length ?? 0) > 0) ? message : undefined

/** Estilo que Mercado Pago aplica DENTRO del iframe de cada campo seguro (tokens gray-950 / gray-400) */
export const secureFieldStyle = {
  height: '100%',
  padding: '0',
  fontSize: '14px',
  fontFamily: 'Geist, system-ui, sans-serif',
  color: '#131316',
  placeholderColor: '#9394a1',
}
export const secureFieldFonts = [{ src: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap' }]

interface SecureFieldBoxProps {
  label: string
  htmlFor: string
  state: FieldState
  error?: string
  /** Contenido a la derecha dentro del campo (franquicia, check) */
  adornment?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Caja alrededor de un campo seguro de Mercado Pago (iframe), idéntica a <Input>:
 * ring-1 black/10, foco con doble halo negro, error en red-400 — solo después de salir del campo.
 */
export function SecureFieldBox({ label, htmlFor, state, error, adornment, children, className }: SecureFieldBoxProps) {
  const valid = fieldIsValid(state) && !error
  return (
    <div className={cn('space-y-1.5', className)}>
      <span id={htmlFor} className="label-3 text-gray-700">
        {label}
      </span>
      <div
        aria-labelledby={htmlFor}
        className={cn(
          'flex h-10 items-center gap-2 rounded-md bg-white px-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 transition-[box-shadow] duration-200 ease-out-cubic',
          state.focused
            ? 'shadow-[0_0_0_1px_color-mix(in_oklab,black_15%,transparent),0_0_0_4px_color-mix(in_oklab,black_8%,transparent)] ring-transparent'
            : error
              ? 'ring-red-400'
              : 'ring-black/10',
        )}
      >
        <div className="h-full min-w-0 flex-1 [&>div]:h-full [&_iframe]:h-full [&_iframe]:w-full">{children}</div>
        {adornment}
        {valid && <CircleCheck aria-label="Válido" className="size-4 shrink-0 fill-success text-white" />}
      </div>
      {error && (
        <p role="alert" className="body-3 text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  )
}
