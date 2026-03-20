'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'
import { Sidebar } from '@/components/sidebar'
import { Menu } from 'lucide-react'

export default function AdminLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <DataProvider>
      <div className="flex min-h-screen">

        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">

            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />

            <div className="relative z-50">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        <main className="flex-1 bg-muted/30">

          {/* Header mobile */}
          <div className="md:hidden flex items-center justify-between p-4 border-b bg-background">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-semibold">Menu</span>
          </div>

          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </DataProvider>
  )
}