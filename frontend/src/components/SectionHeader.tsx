import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  /** Eyebrow: mono, mayúsculas, tracking 0.1em */
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  /** h1 para el título de página, h2 para secciones */
  as?: 'h1' | 'h2'
  /** page = heading-3 (4 en móvil) · section = heading-4 (5 en móvil) */
  size?: 'page' | 'section'
  align?: 'left' | 'center'
  className?: string
  children?: ReactNode
}

/** Anatomía de sección Seed: eyebrow → título → texto (gray-600, max-w-2xl) → CTA opcional */
export function SectionHeader({
  eyebrow,
  title,
  description,
  as: Tag = 'h2',
  size = 'section',
  align = 'left',
  className,
  children,
}: SectionHeaderProps) {
  return (
    <header className={cn('max-w-2xl space-y-3', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className="tag-1 text-primary">{eyebrow}</p>}
      <Tag className={cn('text-balance', size === 'page' ? 'heading-4 md:heading-3' : 'heading-5 md:heading-4')}>
        {title}
      </Tag>
      {description && <p className="body-2 text-gray-600 text-pretty">{description}</p>}
      {children}
    </header>
  )
}
