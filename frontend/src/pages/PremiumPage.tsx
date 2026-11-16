import axios from 'axios'
import { BookOpen, LayoutTemplate, LockKeyhole, Video } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePremiumContent } from '@/hooks/queries'

const icons = [BookOpen, Video, LayoutTemplate]

export function PremiumPage() {
  const { data, isLoading, error } = usePremiumContent()

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />

  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-12 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-purple-50 text-primary ring-1 ring-purple-200 ring-inset">
          <LockKeyhole className="size-6" />
        </span>
        <p className="tag-1 text-primary">Solo suscriptores</p>
        <h1 className="heading-4">Activa un plan para ver este contenido</h1>
        <p className="body-2 text-gray-600">Guías, webinars y plantillas, desde el plan Básico.</p>
        <Button asChild size="lg">
          <Link to="/pricing">Ver planes</Link>
        </Button>
      </div>
    )
  }
  if (error || !data) return <p className="body-2 text-destructive-foreground">No pudimos cargar el contenido. Recarga la página.</p>

  return (
    <div className="space-y-10">
      <SectionHeader as="h1" size="page" eyebrow="Contenido premium" title="Tu contenido" description={data.message} />
      <ul className="grid gap-6 sm:grid-cols-3">
        {data.items.map((item, i) => {
          const Icon = icons[i % icons.length]
          return (
            <li key={item.id} className="space-y-2 rounded-2xl bg-card p-6 shadow-bento">
              <Icon className="size-5 text-primary" strokeWidth={1.5} />
              <h2 className="heading-6">{item.title}</h2>
              <p className="body-2 text-gray-600">{item.description}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
