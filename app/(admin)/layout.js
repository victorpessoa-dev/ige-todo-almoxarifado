'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useData } from '@/contexts/data-context'
import { Sidebar } from '@/components/sidebar'
import { LoadingState } from '@/components/ui/spinner'
import { Menu } from 'lucide-react'
import Image from 'next/image'

export default function AdminLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { solicitacoesCompra = [] } = useData()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const notifiedSolicitacoesRef = useRef(new Set())

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAuthenticated || isLoading || pathname !== '/painel') return
    if (!window.matchMedia('(max-width: 767px)').matches) return

    router.replace('/solicitacoes')
  }, [isAuthenticated, isLoading, pathname, router])

  useEffect(() => {
    const body = document.body

    if (sidebarOpen) {
      body.style.overflow = 'hidden'
    } else {
      body.style.overflow = ''
    }

    return () => {
      body.style.overflow = ''
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (!isAuthenticated || isLoading) return

    const novasSolicitacoes = solicitacoesCompra.filter(
      (solicitacao) => solicitacao.status_geral === 'nova'
    )
    const solicitacoesNaoNotificadas = novasSolicitacoes.filter((solicitacao) => {
      const key = solicitacao.id || solicitacao.codigo
      return key && !notifiedSolicitacoesRef.current.has(key)
    })

    if (solicitacoesNaoNotificadas.length === 0) return

    solicitacoesNaoNotificadas.forEach((solicitacao) => {
      const key = solicitacao.id || solicitacao.codigo
      notifiedSolicitacoesRef.current.add(key)
    })

    const primeiraSolicitacao = solicitacoesNaoNotificadas[0]
    const total = solicitacoesNaoNotificadas.length

    toast.info(
      total === 1
        ? 'Nova solicitacao recebida'
        : `${total} novas solicitacoes recebidas`,
      {
        description:
          total === 1
            ? `${primeiraSolicitacao.codigo || 'Sem codigo'} - ${primeiraSolicitacao.descricao || 'Pedido sem descricao'}`
            : 'Existem novos pedidos aguardando aceite.',
        action: {
          label: 'Ver',
          onClick: () => router.push('/solicitacoes')
        }
      }
    )
  }, [isAuthenticated, isLoading, router, solicitacoesCompra])

  if (isLoading) {
    return <LoadingState className="min-h-screen bg-background" />
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <div className="hidden w-64 shrink-0 md:block" aria-hidden="true" />

      <div className="hidden md:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />

          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <Image
            src="/ige-supergesso.png"
            alt="Logo"
            width={100}
            height={75}
            className="mx-auto"
          />

          <div className="w-6" aria-hidden="true" />
        </div>

        <div className="admin-main-scroll scrollbar-soft flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 md:px-7 md:py-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

