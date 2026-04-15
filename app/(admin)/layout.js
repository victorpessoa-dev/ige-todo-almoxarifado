// app/(admin)/layout.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'
import { Sidebar } from '@/components/sidebar'
import { Menu } from 'lucide-react'
import Image from 'next/image'

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
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 w-64 h-full">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-x-hidden px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="md:hidden flex items-center justify-between p-4 lg:p-0 md:p-0">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <Image src="/ige-supergesso.png" alt="Logo" width={100} height={75} className="mx-auto" />
        </div>

        <div className="p-4 lg:p-0 md:p-0">{children}</div>
      </main>
    </div>
  )
}