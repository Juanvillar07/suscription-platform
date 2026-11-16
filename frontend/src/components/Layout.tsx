import { LogOut, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'shrink-0 rounded-md px-2.5 py-1.5 label-3 whitespace-nowrap transition-colors duration-100 ease-out-cubic',
    isActive ? 'text-foreground' : 'text-gray-500 hover:text-foreground',
  )

/** Marca propia de la app (no usa el logo de Clerk) */
export function Wordmark() {
  return (
    <Link to="/" aria-label="SubsPlatform, inicio" className="flex shrink-0 items-center gap-2 rounded-md">
      <span aria-hidden className="relative grid size-6 place-items-center rounded-md bg-purple-500 shadow-button">
        <span className="h-1 w-3 rounded-full bg-white" />
      </span>
      <span className="hidden heading-6 tracking-[-0.02em] sm:inline">SubsPlatform</span>
    </Link>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md [border-bottom:0.5px_solid_rgb(19_19_22/0.12)]">
        <div className="mx-auto flex h-14 max-w-[64rem] items-center gap-4 px-6 sm:gap-6 md:px-8">
          <Wordmark />
          <nav aria-label="Principal" className="flex flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
            <NavLink to="/pricing" className={navClass}>Planes</NavLink>
            {user && <NavLink to="/dashboard" className={navClass}>Mi cuenta</NavLink>}
            {user && <NavLink to="/premium" className={navClass}>Contenido</NavLink>}
            {user?.role === 'ADMIN' && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
          </nav>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden body-3 text-gray-500 md:inline">{user.name}</span>
              <Button
                variant="outline"
                aria-label="Salir"
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
              >
                <LogOut /> <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/login">Ingresar</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Crear cuenta</Link>
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[64rem] flex-1 px-6 py-12 sm:py-16 md:px-8">
        <Outlet />
      </main>
      <footer className="section-rule">
        <div className="mx-auto flex max-w-[64rem] flex-col gap-2 px-6 py-6 body-3 text-gray-500 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4" strokeWidth={1.5} /> Pagos procesados por Mercado Pago
          </span>
          <span className="tag-2">Entorno de pruebas</span>
        </div>
      </footer>
    </div>
  )
}
