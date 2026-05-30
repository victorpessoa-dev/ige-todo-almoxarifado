'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useData } from '@/contexts/data-context'
import {
  countUniqueBrands,
  countUniqueCategories,
  filterAndSortCatalogProducts,
  getCategoryName,
  getUniqueBrandNames,
  makeCatalogFrameHtml,
  normalizeCatalogText
} from '@/lib/catalogo-html'
import CatalogoFilters from '@/components/catalogo/CatalogoFilters'
import CatalogoHeader from '@/components/catalogo/CatalogoHeader'
import CatalogoPreview from '@/components/catalogo/CatalogoPreview'
import CatalogoSummaryCards from '@/components/catalogo/CatalogoSummaryCards'
import { Spinner } from '@/components/ui/spinner'

export default function CatalogoPage() {
  const { produtos, isLoaded, isLoading } = useData()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [selectedBrand, setSelectedBrand] = useState('todas')
  const showLoading = isLoading && !isLoaded && produtos.length === 0

  const categoryOptions = useMemo(() => {
    const categories = new Map()

    produtos.forEach((produto) => {
      const category = getCategoryName(produto)
      const key = normalizeCatalogText(category)

      if (!categories.has(key)) {
        categories.set(key, category)
      }
    })

    return Array.from(categories.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [produtos])

  const brandOptions = useMemo(() => {
    const brands = new Map()

    produtos.forEach((produto) => {
      getUniqueBrandNames(produto.marcas).forEach((brand) => {
        const key = normalizeCatalogText(brand)

        if (!brands.has(key)) {
          brands.set(key, brand)
        }
      })
    })

    return Array.from(brands.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [produtos])

  const catalogProducts = useMemo(() => {
    return filterAndSortCatalogProducts(produtos, {
      search,
      selectedCategory,
      selectedBrand
    })
  }, [produtos, search, selectedBrand, selectedCategory])

  const summary = useMemo(() => {
    return {
      total: produtos.length,
      visible: catalogProducts.length,
      categories: countUniqueCategories(produtos),
      brands: countUniqueBrands(produtos)
    }
  }, [catalogProducts.length, produtos])

  const frameHtml = useMemo(() => makeCatalogFrameHtml(catalogProducts), [catalogProducts])

  const printCatalog = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800')

    if (!printWindow) {
      toast.error('Permita pop-ups para abrir o catálogo em PDF.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(frameHtml)
    printWindow.document.close()
    printWindow.document.title = `catalogo-almoxarifado-${new Date().toISOString().slice(0, 10)}`
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedCategory('todas')
    setSelectedBrand('todas')
  }

  if (showLoading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm font-medium">Carregando catalogo...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 pb-3 sm:gap-6 sm:pb-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card/70 p-3 shadow-sm sm:rounded-2xl sm:p-5">
        <CatalogoHeader onPrint={printCatalog} />

        <CatalogoSummaryCards summary={summary} />

        <CatalogoFilters
          search={search}
          selectedCategory={selectedCategory}
          selectedBrand={selectedBrand}
          categoryOptions={categoryOptions}
          brandOptions={brandOptions}
          onSearchChange={setSearch}
          onCategoryChange={setSelectedCategory}
          onBrandChange={setSelectedBrand}
          onClear={clearFilters}
        />
      </div>

      <CatalogoPreview frameHtml={frameHtml} />
    </div>
  )
}
