'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, Printer, ArrowUpDown } from 'lucide-react'

export default function ProductTable({
  produtos,
  openMovimentoDialog,
  setPrintDialog,
  handleEdit,
  deleteProduto
}) {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  })

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const sortedProdutos = useMemo(() => {
    if (!sortConfig.key) return produtos

    return [...produtos].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue
    })
  }, [produtos, sortConfig])

  const SortHeader = ({ label, columnKey }) => (
    <TableHead>
      <button
        onClick={() => handleSort(columnKey)}
        className="flex items-center gap-1 hover:text-primary"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Código" columnKey="cod" />
              <SortHeader label="Nome" columnKey="nome" />
              <SortHeader label="Estoque" columnKey="estoque" />
              <SortHeader label="Mín" columnKey="min" />
              <SortHeader label="Máx" columnKey="max" />
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedProdutos.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell>{produto.cod}</TableCell>
                <TableCell>{produto.nome}</TableCell>
                <TableCell>{produto.estoque}</TableCell>
                <TableCell>{produto.min}</TableCell>
                <TableCell>{produto.max}</TableCell>

                <TableCell>
                  {produto.estoque <= produto.min ? (
                    <Badge className="bg-red-50 text-red-700">Baixo</Badge>
                  ) : produto.estoque >= produto.max ? (
                    <Badge className="bg-yellow-50 text-yellow-700">Cheio</Badge>
                  ) : (
                    <Badge className="bg-green-50 text-green-700">Normal</Badge>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openMovimentoDialog(produto, 'entrada', 1)}>
                      <TrendingUp className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMovimentoDialog(produto, 'saida', 1)}
                      disabled={produto.estoque === 0}
                    >
                      <TrendingDown className="h-3 w-3" />
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => setPrintDialog({ open: true, produto })}>
                      <Printer className="h-3 w-3" />
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => handleEdit(produto)}>
                      Editar
                    </Button>

                    <Button size="sm" variant="destructive" onClick={() => deleteProduto(produto.id)}>
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}