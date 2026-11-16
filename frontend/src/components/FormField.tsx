import { CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  id: string
  label: string
  /** Mensaje de error; mostrarlo solo cuando el campo ya fue tocado (nunca mientras se escribe) */
  error?: string
  /** Texto de ayuda bajo el campo cuando no hay error */
  hint?: ReactNode
  /** Muestra un check verde dentro del campo */
  valid?: boolean
  className?: string
  children: ReactNode
}

export function FormField({ id, label, error, hint, valid, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="label-3 text-gray-700">
        {label}
      </Label>
      <div className="relative">
        {children}
        {valid && !error && (
          <CircleCheck
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 fill-success text-white"
          />
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="body-3 text-destructive-foreground">
          {error}
        </p>
      ) : hint ? (
        <p className="body-3 text-gray-500">{hint}</p>
      ) : null}
    </div>
  )
}
