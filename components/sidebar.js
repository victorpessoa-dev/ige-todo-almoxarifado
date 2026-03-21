'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { LayoutDashboard, ListTodo, StickyNote, LogOut } from 'lucide-react'

const menuItems = [
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
  { href: '/tarefas', label: 'Tarefas', icon: ListTodo },
  { href: '/lembretes', label: 'Lembretes', icon: StickyNote },
]

export function Sidebar({ onNavigate }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleClick = () => {
    if (onNavigate) onNavigate()
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border ">
        <Image src="/ige-supergesso.png" alt="Logo" width={200} height={150} className="mx-auto mb-2" />
        <p className="text-lg text-sidebar-foreground/70 text-center">Tarefas e Lembretes</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start bg-white gap-3 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </aside>
  )
}