'use client'

import { useMemo, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'

function getNivel(produto) {
  const { estoque, min } = produto

  if (estoque <= min * 0.5) return 'critico'
  if (estoque <= min) return 'baixo'
  return 'atencao'
}

function getNivelInfo(nivel) {
  switch (nivel) {
    case 'critico':
      return {
        label: 'Critico',
        productClass: 'text-red-700',
        estoqueClass: 'text-red-700',
        badgeClass: 'border-red-200 bg-red-100 text-red-700'
      }
    case 'baixo':
      return {
        label: 'Baixo',
        productClass: 'text-orange-700',
        estoqueClass: 'text-orange-700',
        badgeClass: 'border-orange-200 bg-orange-100 text-orange-700'
      }
    default:
      return {
        label: 'Atencao',
        productClass: 'text-amber-700',
        estoqueClass: 'text-amber-700',
        badgeClass: 'border-amber-200 bg-amber-100 text-amber-700'
      }
  }
}

export default function InventarioSlide({ produtos, active, onEnd }) {
  const ref = useRef(null)

  const produtosOrdenados = useMemo(() => {
    return produtos
      .filter((p) => p.estoque <= p.min)
      .sort((a, b) => a.estoque - a.min - (b.estoque - b.min))
  }, [produtos])

  useAutoScroll(ref, onEnd, active)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollTo({ top: 0 })
    }
  }, [active])

  if (produtosOrdenados.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center text-lg text-muted-foreground sm:text-2xl">
          Nenhum produto com estoque baixo
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-10">
      <div className="mb-4 flex items-center justify-center gap-2 text-center sm:mb-6 sm:gap-3">
        <AlertTriangle className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
          Alerta de Estoque
        </h2>
      </div>

      <div
        ref={ref}
        className="slide-scroll scrollbar-soft flex-1 overflow-y-auto rounded-2xl border bg-card/70"
      >
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1.4fr)_auto_auto_auto] gap-3 border-b bg-card/95 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur sm:px-5 sm:text-sm">
          <span>Produto</span>
          <span>Estoque</span>
        </div>

        <div className="divide-y divide-border/70">
          {produtosOrdenados.map((produto) => {
            const nivelInfo = getNivelInfo(getNivel(produto))

            return (
              <div
                key={produto.id}
                className="grid grid-cols-[minmax(0,1.4fr)_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm font-medium sm:px-5 sm:py-4 sm:text-base"
              >
                <div className="min-w-0">
                  <p className={`break-words font-semibold ${nivelInfo.productClass}`}>
                    {produto.nome}
                  </p>
                </div>

                <span className={`font-semibold ${nivelInfo.estoqueClass}`}>
                  {produto.estoque}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
