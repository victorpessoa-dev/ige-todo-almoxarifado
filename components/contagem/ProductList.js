'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Download, Minus, Package, Plus, Trash2 } from 'lucide-react'

export function ProductList({
  products,
  onUpdateQuantity,
  onRemove,
  onDownload,
  onClear
}) {
  const totalItems = products.reduce(
    (acc, product) => acc + Number(product.estoque ?? product.quantity ?? 0),
    0
  )

  if (products.length === 0) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="mb-4 h-12 w-12 text-primary/50" />
          <p className="text-center text-muted-foreground">
            Nenhum produto escaneado ainda.
            <br />
            Use a câmera para começar a contar!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg text-primary">
          Estoque ({products.length} produtos, {totalItems} itens)
        </CardTitle>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="border-primary/30 hover:bg-primary/10"
          >
            Limpar
          </Button>

          <Button
            size="sm"
            onClick={onDownload}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar Excel
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {products.map((product, index) => (
          <div
            key={`${product.nome || product.name}-${index}`}
            className="flex flex-col gap-3 rounded-lg border border-primary/10 bg-card p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {product.nome || product.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Cod: {product.cod || '-'}</span>
                <span>Min: {product.min ?? 0}</span>
                <span>Max: {product.max ?? 0}</span>
                {product.matchedByName && (
                  <span>
                    Sistema: {product.estoqueSistema ?? 0}
                  </span>
                )}
              </div>
              {product.matchedByName && (
                <p
                  className={`mt-1 text-xs ${
                    product.estoqueIgual
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {product.estoqueIgual
                    ? 'Estoque fisico confere com o sistema.'
                    : 'Divergência encontrada. A contagem física será considerada.'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-primary/30"
                onClick={() =>
                  onUpdateQuantity(
                    index,
                    Math.max(0, Number(product.estoque ?? product.quantity ?? 0) - 1)
                  )
                }
              >
                <Minus className="h-4 w-4" />
              </Button>

              <Input
                type="number"
                value={Number(product.estoque ?? product.quantity ?? 0)}
                onChange={(event) =>
                  onUpdateQuantity(index, parseInt(event.target.value, 10) || 0)
                }
                className="h-8 w-16 border-primary/30 text-center"
                min={0}
              />

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-primary/30"
                onClick={() =>
                  onUpdateQuantity(
                    index,
                    Number(product.estoque ?? product.quantity ?? 0) + 1
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
