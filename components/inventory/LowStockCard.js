'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LowStockCard({ produtosBaixoEstoque }) {
  if (!produtosBaixoEstoque || produtosBaixoEstoque.length === 0) {
    return null
  }

  return (
    <Card className="mb-6 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Produtos com Estoque Baixo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosBaixoEstoque.map((produto) => (
            <div key={produto.id} className="flex items-center justify-between p-3 rounded border">
              <div>
                <p className="font-medium">{produto.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque: {produto.estoque} / Mín: {produto.min}
                </p>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                Baixo
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
