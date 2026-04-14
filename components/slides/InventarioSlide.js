'use client'

import { useMemo, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'

function getNivel(produto) {
    const { estoque, min } = produto

    if (estoque <= min * 0.5) return 'critico'
    if (estoque <= min) return 'baixo'
    return 'atencao'
}

function getStyle(nivel) {
    switch (nivel) {
        case 'critico':
            return 'bg-red-600 text-white'
        case 'baixo':
            return 'bg-orange-500 text-white'
        default:
            return 'bg-yellow-400 text-black'
    }
}

export default function InventarioSlide({ produtos, active, onEnd }) {
    const ref = useRef(null)

    const produtosOrdenados = useMemo(() => {
        return produtos
            .filter(p => p.estoque <= p.min)
            .sort((a, b) => (a.estoque - a.min) - (b.estoque - b.min))
    }, [produtos])

    useAutoScroll(ref, onEnd, active)

    useEffect(() => {
        if (active && ref.current) {
            ref.current.scrollTo({ top: 0 })
        }
    }, [active])

    if (produtosOrdenados.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-2xl text-muted-foreground">
                    Nenhum produto com estoque baixo
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full px-10 py-6">

            <div className="flex items-center justify-center gap-3 mb-6 w-full">
                <AlertTriangle className="h-10 w-10 text-primary" />
                <h2 className="text-4xl font-bold text-foreground">Alerta de Estoque</h2>
            </div>

            <div
                ref={ref}
                className="flex-1 overflow-y-auto pr-2"
            >
                <div className="flex flex-col gap-3 pb-10">
                    {produtosOrdenados.map((produto) => {
                        const nivel = getNivel(produto)

                        return (
                            <div
                                key={produto.id}
                                className={`flex items-center justify-between px-5 py-4 rounded-xl shadow-md text-lg font-semibold ${getStyle(nivel)}`}
                            >
                                <div className="flex-1">
                                    {produto.nome}
                                </div>

                                <div className="flex items-center gap-6 text-base font-medium">
                                    <span>
                                        Estoque: <strong>{produto.estoque}</strong>
                                    </span>
                                    <span>
                                        Min: {produto.min}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}