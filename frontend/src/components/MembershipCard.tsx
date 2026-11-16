import { cn } from '@/lib/utils'

interface MembershipCardProps {
  planName: string
  holder?: string
  /** Texto pequeño arriba a la derecha (estado o periodicidad) */
  caption?: string
  /** Logo de la franquicia detectada (url de Mercado Pago) */
  brandLogo?: string
  brandName?: string
  last4?: string
  muted?: boolean
  /** Halo púrpura → cielo debajo de la tarjeta */
  glow?: boolean
  className?: string
}

/**
 * Tarjeta de membresía: el "elemento de demostración" de la marca.
 * Superficie gray-900 con borde interior blanco al 2.5% (en oscuro no se usan sombras externas)
 * y, opcionalmente, el halo de gradiente púrpura → cielo por debajo.
 */
export function MembershipCard({
  planName,
  holder,
  caption,
  brandLogo,
  brandName,
  last4,
  muted,
  glow = true,
  className,
}: MembershipCardProps) {
  return (
    <div className={cn('isolate rounded-2xl', glow && !muted && 'glow-halo', className)}>
      <div
        className={cn(
          'relative aspect-[1.586] w-full overflow-hidden rounded-2xl p-5 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] sm:p-6',
          muted ? 'bg-gray-700' : 'bg-gray-900',
        )}
      >
        {/* Brillo radial superior (section shine en oscuro) */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(90%_70%_at_20%_0%,rgb(108_71_255/0.35)_0%,transparent_70%)]"
        />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tag-2 text-purple-300">SubsPlatform</p>
              <p className="mt-1 text-[1.625rem] leading-tight font-semibold tracking-[-0.015em] sm:text-[1.75rem]">{planName}</p>
            </div>
            {caption && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 label-4 text-white/90 ring-1 ring-white/15 ring-inset">
                {caption}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="mono-1 tracking-[0.16em] text-white/75 tabular">•••• •••• •••• {last4 ?? '••••'}</p>
              <p className="mt-1.5 truncate label-3 text-white">{holder || 'Nombre en la tarjeta'}</p>
            </div>
            {brandLogo ? (
              <span className="flex h-7 shrink-0 items-center rounded-md bg-white px-1.5">
                <img src={brandLogo} alt={brandName ?? 'Franquicia'} className="h-4" />
              </span>
            ) : (
              <span aria-hidden className="flex shrink-0 -space-x-2.5">
                <span className="size-7 rounded-full bg-purple-300/50" />
                <span className="size-7 rounded-full bg-sky-300/40" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
