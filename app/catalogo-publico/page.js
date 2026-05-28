'use client'

import { useMemo } from 'react'

import { useData } from '@/contexts/data-context'
import { filterAndSortCatalogProducts, makeCatalogFrameHtml } from '@/lib/catalogo-html'

export default function CatalogoPublicoPage() {
  const { produtos } = useData()

  const catalogProducts = useMemo(() => {
    return filterAndSortCatalogProducts(produtos)
  }, [produtos])

  const frameHtml = useMemo(() => {
    return makeCatalogFrameHtml(catalogProducts)
  }, [catalogProducts])

  return (
    <main className="h-screen w-full bg-muted">
      <iframe
        srcDoc={frameHtml}
        title="Catálogo público do almoxarifado"
        className="h-full w-full border-0 bg-white"
      />
    </main>
  )
}
