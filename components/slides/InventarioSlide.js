'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, AlertTriangle } from 'lucide-react'
import { chunkArray } from '@/lib/utils'
import { useItemsPerPage } from '@/lib/hooks/useItemsPerPage'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'


function ProdutoCard({ produto }) {
    const isBaixo = produto.estoque <= produto.min
    const isCheio = produto.estoque >= produto.max

    return (
        <Card className={`
            bg-transparent backdrop-blur-sm border
            ${isBaixo ? 'border-red-500' : 'border-border'}
            `}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                        {produto.nome}
                    </CardTitle>
                    {isBaixo && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Código: {produto.cod}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Estoque: {produto.estoque}</span>
                        <Badge variant="outline" className={
                            isBaixo ? 'bg-red-50 text-red-700' :
                            isCheio ? 'bg-yellow-50 text-yellow-700' :
                            'bg-green-50 text-green-700'
                        }>
                            {isBaixo ? 'Baixo' : isCheio ? 'Cheio' : 'Normal'}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Min: {produto.min} | Máx: {produto.max}</p>
                </div>
            </CardContent>
        </Card>
    )
}

export function InventarioSlide({ produtos, onEnd, active }) {
    const ref = useRef(null)

    const produtosAlertas = useMemo(() => {
        return produtos.filter(p => p.estoque <= p.min).sort((a, b) => a.estoque - b.estoque)
    }, [produtos])

    const ITEMS_PER_PAGE = useItemsPerPage()

    const pages = useMemo(() => {
        return chunkArray(produtosAlertas, ITEMS_PER_PAGE)
    }, [produtosAlertas, ITEMS_PER_PAGE])

    const [page, setPage] = useState(0)

    const safePage = page >= pages.length ? 0 : page
    const currentItems = pages[safePage] || []
    const isLastPage = pages.length === 0 || safePage === pages.length - 1

    useAutoScroll(ref, isLastPage ? onEnd : undefined, active)

    useEffect(() => {
        if (active && ref.current) {
            ref.current.scrollTo({ top: 0 })
        }
    }, [active, safePage])

    useEffect(() => {
        if (pages.length <= 1) return

        const interval = setInterval(() => {
            setPage((prev) => (prev + 1) % pages.length)
        }, 10000)

        return () => clearInterval(interval)
    }, [pages.length])

    useEffect(() => {
        setPage(0)
    }, [ITEMS_PER_PAGE])

    return (
        <div className="flex flex-col items-center h-full px-8 py-4 m-0">
            <div className="flex items-center gap-3 mb-6">
                <Package className="h-10 w-10 text-primary" />
                <h2 className="text-4xl font-bold text-foreground">Inventário</h2>
            </div>

            {produtosAlertas.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-xl text-muted-foreground">Nenhum produto com estoque baixo</p>
                </div>
            ) : (
                <div ref={ref} className="w-full max-w-5xl flex-1 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentItems.map((produto) => (
                            <ProdutoCard key={produto.id} produto={produto} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2 text-muted-foreground">
                <p className="text-md">
                    Página {page + 1} / {pages.length} • Total de alertas: {produtosAlertas.length}
                </p>
            </div>
        </div>
    )
}