'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  CalendarDays,
  BookOpen,
  Camera,
  ChartColumn,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Package,
  ShoppingCart,
  StickyNote
} from 'lucide-react'

const menuItems = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard, desktopOnly: true },
  { href: '/tarefas', label: 'Tarefas', icon: ListTodo },
  { href: '/lembretes', label: 'Lembretes', icon: StickyNote },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/catalogo', label: 'Catalogo', icon: BookOpen },
  { href: '/solicitacoes', label: 'Solicitacoes', icon: ShoppingCart },
  { href: '/contagem', label: 'Contagem', icon: Camera },
  { href: '/analise-giro', label: 'Análise de Giro', icon: ChartColumn }
]

export function Sidebar({ onNavigate }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleClick = () => {
    if (onNavigate) onNavigate()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg md:w-64">
      <div className="px-4 py-8">
        <Link href="/solicitacoes" onClick={handleClick} className="block md:hidden">
          <Image
            src="/ige-supergesso.png"
            alt="Logo"
            width={200}
            height={120}
            className="mx-auto mb-2"
          />
        </Link>
        <Link href="/painel" onClick={handleClick} className="hidden md:block">
          <Image
            src="/ige-supergesso.png"
            alt="Logo"
            width={200}
            height={120}
            className="mx-auto mb-2"
          />
        </Link>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-4 pb-4">
        <ul className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={item.href} className={item.desktopOnly ? 'hidden md:block' : undefined}>
                <Link
                  href={item.href}
                  onClick={handleClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  )
}

