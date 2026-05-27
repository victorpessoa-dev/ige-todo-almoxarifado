'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCheck,
  MoreHorizontal,
  Pencil,
  Printer,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp
} from 'lucide-react'

function getStatus(produto) {
  if (produto.estoque <= produto.min) {
    return {
      label: 'Baixo',
      className: 'border-red-200 bg-red-50 text-red-700'
    }
  }

  if (produto.estoque >= produto.max) {
    return {
      label: 'Cheio',
      className: 'border-amber-200 bg-amber-50 text-amber-700'
    }
  }

  return {
    label: 'Normal',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
}

export default function ProductTable({
  produtos,
  openMovimentoDialog,
  setPrintDialog,
  handleEdit,
  deleteProduto,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkSaida,
  onSolicitarCompra
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

  const allSelected =
    sortedProdutos.length > 0 &&
    sortedProdutos.every((produto) => selectedIds.includes(produto.id))

  const hasSelection = selectedIds.length > 0

  const SortHeader = ({ label, columnKey }) => {
    const isActive = sortConfig.key === columnKey

    return (
      <TableHead className="whitespace-nowrap">
        <button
          type="button"
          onClick={() => handleSort(columnKey)}
          className="flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
        >
          <span>{label}</span>
          {isActive ? (
            sortConfig.direction === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </button>
      </TableHead>
    )
  }

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none px-6">
      <CardHeader className="gap-4 border-b px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Produtos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique na linha para selecionar e use acoes em lote quando precisar.
            </p>
          </div>

          <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
            {produtos.length} itens
          </Badge>
        </div>

        {hasSelection && (
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCheck className="h-4 w-4 text-primary" />
              {selectedIds.length} selecionado(s)
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onBulkSaida}>
                <TrendingDown className="mr-2 h-4 w-4" />
                Dar baixa
              </Button>

              <Button size="sm" variant="destructive" onClick={onBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>

              <Button size="sm" variant="ghost" onClick={onClearSelection}>
                Limpar
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-2 py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onToggleSelectAll?.(event.target.checked)}
                  aria-label="Selecionar todos os produtos"
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
              </TableHead>
              <SortHeader label="Codigo" columnKey="cod" />
              <SortHeader label="Nome" columnKey="nome" />
              <SortHeader label="Estoque" columnKey="estoque" />
              <SortHeader label="Min" columnKey="min" />
              <SortHeader label="Max" columnKey="max" />
              <TableHead>Status</TableHead>
              <TableHead className="w-14 text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedProdutos.map((produto) => {
              const status = getStatus(produto)
              const isSelected = selectedIds.includes(produto.id)
              const quantidadeCompra = Number(produto.max || 0) - Number(produto.estoque || 0)
              const canSolicitarCompra =
                Number(produto.estoque || 0) <= Number(produto.min || 0) &&
                quantidadeCompra > 0

              return (
                <TableRow
                  key={produto.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className="cursor-pointer"
                  onClick={() => onToggleSelect?.(produto.id)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(produto.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Selecionar ${produto.nome}`}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </TableCell>

                  <TableCell className="font-medium text-muted-foreground">
                    {produto.cod}
                  </TableCell>

                  <TableCell className="max-w-[320px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {produto.nome}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold">{produto.estoque}</span>
                  </TableCell>

                  <TableCell>{produto.min}</TableCell>
                  <TableCell>{produto.max}</TableCell>

                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuLabel>{produto.nome}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => openMovimentoDialog(produto, 'entrada', 1)}
                        >
                          <TrendingUp className="h-4 w-4" />
                          Entrada
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => openMovimentoDialog(produto, 'saida', 1)}
                          disabled={produto.estoque === 0}
                        >
                          <TrendingDown className="h-4 w-4" />
                          Saida
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setPrintDialog({ open: true, produto })}
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir etiqueta
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => onSolicitarCompra?.(produto)}
                          disabled={!canSolicitarCompra}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Solicitar Compra
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleEdit(produto)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => deleteProduto(produto)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
