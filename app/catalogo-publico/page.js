'use client'

import { PublicFooter } from '@/components/layout/Copyright'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { filterAndSortCatalogProducts, makeCatalogFrameHtml } from '@/lib/catalogo/catalogo-html'
import { listPublicCatalogProducts } from '@/lib/services/catalogo-service'
import { getUserMessage } from '@/lib/messaging/user-messages'

export default function CatalogoPublicoPage() {
  const [produtos, setProdutos] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCatalogProducts() {
      try {
        const data = await listPublicCatalogProducts()

        if (!cancelled) {
          setProdutos(data)
        }
      } catch (error) {
        toast.error(getUserMessage(error, 'Nao foi possivel carregar o catalogo.'))
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCatalogProducts()

    return () => {
      cancelled = true
    }
  }, [])

  const catalogProducts = useMemo(() => {
    return filterAndSortCatalogProducts(produtos)
  }, [produtos])

  const frameHtml = useMemo(() => {
    return makeCatalogFrameHtml(catalogProducts)
  }, [catalogProducts])


  return (
    <main className="flex h-dvh w-full flex-col bg-muted">
      {isLoading ? (
        <div className="ige-scrollbar flex min-h-0 flex-1 items-start justify-center overflow-auto bg-[#eef2f7] p-2 sm:p-4">
          <section className="relative flex min-h-[620px] w-full max-w-[1040px] items-center justify-center overflow-hidden border border-[#d7dde6] bg-white p-6 sm:min-h-[760px] sm:p-10">
            <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#38bdf8]" />
            <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full border-[42px] border-[#dbeafe] opacity-75" />
            <div className="relative z-10 h-20 w-20 animate-spin rounded-full bg-[conic-gradient(from_0deg,#0f172a,#1d4ed8,#38bdf8,#0f172a)] p-1.5">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
          </section>
        </div>
      ) : (
        <iframe
          srcDoc={frameHtml}
          title="Catalogo publico do almoxarifado"
          className="min-h-0 w-full flex-1 border-0 bg-white"
          />
      )}
      <PublicFooter />
    </main>
  )
}
