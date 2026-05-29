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
  CheckCheck,
  MoreHorizontal,
  Pencil,
  Printer,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import TablePagination from '@/components/ui/table-pagination'
import SortableTableHead from '@/components/ui/sortable-table-head'

const DEFAULT_PAGE_SIZE = 25

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
  onSolicitarCompra,
  headerActions
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
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

  const totalPages = Math.max(1, Math.ceil(sortedProdutos.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedProdutos = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize

    return sortedProdutos.slice(start, start + pageSize)
  }, [pageSize, safeCurrentPage, sortedProdutos])

  const allSelected =
    paginatedProdutos.length > 0 &&
    paginatedProdutos.every((produto) => selectedIds.includes(produto.id))

  const hasSelection = selectedIds.length > 0

  const renderActionMenu = (produto, canSolicitarCompra) => (
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
  )

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="gap-4 border-b px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Produtos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique na linha para selecionar e use acoes em lote quando precisar.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {headerActions}
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
              {produtos.length} itens
            </Badge>
          </div>
        </div>

        {hasSelection && (
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCheck className="h-4 w-4 text-primary" />
              {selectedIds.length} selecionado(s)
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={onBulkSaida}>
                <TrendingDown className="mr-2 h-4 w-4" />
                Dar baixa
              </Button>

              <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={onBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>

              <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={onClearSelection}>
                Limpar
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-3 py-3 md:px-2 md:py-0">
        <div className="grid gap-3 md:hidden">
          {paginatedProdutos.map((produto) => {
            const status = getStatus(produto)
            const isSelected = selectedIds.includes(produto.id)
            const quantidadeCompra = Number(produto.max || 0) - Number(produto.estoque || 0)
            const canSolicitarCompra =
              Number(produto.estoque || 0) <= Number(produto.min || 0) &&
              quantidadeCompra > 0

            return (
              <div
                key={produto.id}
                role="button"
                tabIndex={0}
                data-state={isSelected ? 'selected' : undefined}
                className="rounded-xl border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 data-[state=selected]:border-primary data-[state=selected]:bg-primary/5"
                onClick={() => onToggleSelect?.(produto.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onToggleSelect?.(produto.id)
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(produto.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Selecionar ${produto.nome}`}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{produto.nome}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cod: {produto.cod || '-'}
                        </p>
                      </div>
                      {renderActionMenu(produto, canSolicitarCompra)}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Estoque: <strong className="text-foreground">{produto.estoque}</strong></span>
                      <span>Min: {produto.min}</span>
                      <span>Max: {produto.max}</span>
                    </div>

                    <div className="mt-3">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="inventory-table-scroll hidden w-full overflow-x-auto md:block">
          <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    onToggleSelectAll?.(event.target.checked, paginatedProdutos)
                  }
                  aria-label="Selecionar produtos desta página"
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
              </TableHead>
              <SortableTableHead
                label="Código"
                columnKey="cod"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="whitespace-nowrap"
              />
              <SortableTableHead
                label="Nome"
                columnKey="nome"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="whitespace-nowrap"
              />
              <SortableTableHead
                label="Estoque"
                columnKey="estoque"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="whitespace-nowrap"
              />
              <SortableTableHead
                label="Min"
                columnKey="min"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="whitespace-nowrap"
              />
              <SortableTableHead
                label="Max"
                columnKey="max"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="whitespace-nowrap"
              />
              <TableHead>Status</TableHead>
              <TableHead className="w-14 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedProdutos.map((produto) => {
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
                    {renderActionMenu(produto, canSolicitarCompra)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      <TablePagination
        page={safeCurrentPage}
        totalPages={totalPages}
        totalItems={sortedProdutos.length}
        pageSize={pageSize}
        itemLabel="itens"
        onPageChange={setCurrentPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setCurrentPage(1)
        }}
      />
    </Card>
  )
}
