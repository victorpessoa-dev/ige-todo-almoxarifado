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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
import {
  ColumnResizeHandle,
  useResizableColumns
} from '@/components/ui/resizable-table-columns'
import SortableTableHead from '@/components/ui/sortable-table-head'

const DEFAULT_PAGE_SIZE = 25
const ALL_STATUS_VALUE = 'todos'
const STATUS_ORDER = {
  baixo: 0,
  normal: 1,
  cheio: 2
}

const PRODUCT_TABLE_COLUMNS = [
  { key: 'select', width: 48, minWidth: 44 },
  { key: 'cod', width: 110, minWidth: 80 },
  { key: 'nome', width: 360, minWidth: 180 },
  { key: 'categoria', width: 180, minWidth: 120 },
  { key: 'estoque', width: 90, minWidth: 72 },
  { key: 'min', width: 70, minWidth: 60 },
  { key: 'max', width: 70, minWidth: 60 },
  { key: 'status', width: 110, minWidth: 90 },
  { key: 'acoes', width: 62, minWidth: 56 }
]

function getStatus(produto) {
  if (produto.estoque <= produto.min) {
    return {
      value: 'baixo',
      label: 'Baixo',
      className: 'border-red-200 bg-red-50 text-red-700'
    }
  }

  if (produto.estoque >= produto.max) {
    return {
      value: 'cheio',
      label: 'Cheio',
      className: 'border-amber-200 bg-amber-50 text-amber-700'
    }
  }

  return {
    value: 'normal',
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
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE)
  const {
    getColumnStyle,
    startResize,
    tableWidth
  } = useResizableColumns(PRODUCT_TABLE_COLUMNS, 'ige-product-table-column-widths')

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

  const filteredProdutos = useMemo(() => {
    if (statusFilter === ALL_STATUS_VALUE) return produtos

    return produtos.filter((produto) => getStatus(produto).value === statusFilter)
  }, [produtos, statusFilter])

  const sortedProdutos = useMemo(() => {
    if (!sortConfig.key) return filteredProdutos

    return [...filteredProdutos].sort((a, b) => {
      if (sortConfig.key === 'status') {
        const aOrder = STATUS_ORDER[getStatus(a).value]
        const bOrder = STATUS_ORDER[getStatus(b).value]

        return sortConfig.direction === 'asc'
          ? aOrder - bOrder
          : bOrder - aOrder
      }

      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        const aText = String(aValue || '')
        const bText = String(bValue || '')

        return sortConfig.direction === 'asc'
          ? aText.localeCompare(bText, 'pt-BR')
          : bText.localeCompare(aText, 'pt-BR')
      }

      const aNumber = Number(aValue || 0)
      const bNumber = Number(bValue || 0)

      return sortConfig.direction === 'asc'
        ? aNumber - bNumber
        : bNumber - aNumber
    })
  }, [filteredProdutos, sortConfig])

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
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px]" size="sm" aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>Todos status</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="cheio">Cheio</SelectItem>
              </SelectContent>
            </Select>
            {headerActions}
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
              {sortedProdutos.length} itens
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
                        <p className="truncate font-semibold" title={produto.nome || '-'}>
                          {produto.nome}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground" title={`Cod: ${produto.cod || '-'}`}>
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
          <Table className="table-fixed" style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }}>
            <colgroup>
              {PRODUCT_TABLE_COLUMNS.map((column) => (
                <col key={column.key} style={getColumnStyle(column.key)} />
              ))}
            </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="relative pr-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    onToggleSelectAll?.(event.target.checked, paginatedProdutos)
                  }
                  aria-label="Selecionar produtos desta página"
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <ColumnResizeHandle columnKey="select" onResizeStart={startResize} />
              </TableHead>
              <SortableTableHead
                label="Código"
                columnKey="cod"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="cod" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Nome"
                columnKey="nome"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="nome" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Categoria"
                columnKey="categoria"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="categoria" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Estoque"
                columnKey="estoque"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="estoque" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Min"
                columnKey="min"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="min" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Max"
                columnKey="max"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="max" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Status"
                columnKey="status"
                sortConfig={sortConfig}
                onSort={handleSort}
                className="relative pr-4 whitespace-nowrap"
              >
                <ColumnResizeHandle columnKey="status" onResizeStart={startResize} />
              </SortableTableHead>
              <TableHead className="relative text-right">
                Ações
                <ColumnResizeHandle columnKey="acoes" onResizeStart={startResize} />
              </TableHead>
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
                    <p className="truncate" title={produto.cod || '-'}>
                      {produto.cod}
                    </p>
                  </TableCell>

                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground" title={produto.nome || '-'}>
                        {produto.nome}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="truncate text-muted-foreground" title={produto.categoria || '-'}>
                      {produto.categoria || '-'}
                    </p>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold">{produto.estoque}</span>
                  </TableCell>

                  <TableCell>{produto.min}</TableCell>
                  <TableCell>{produto.max}</TableCell>

                  <TableCell>
                    <Badge variant="outline" className={`${status.className} max-w-full truncate`}>
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
