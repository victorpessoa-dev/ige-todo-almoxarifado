'use client'

import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Eye } from 'lucide-react'
import TablePagination from '@/components/ui/table-pagination'
import {
  ColumnResizeHandle,
  useResizableColumns
} from '@/components/ui/resizable-table-columns'
import SortableTableHead from '@/components/ui/sortable-table-head'
import { SolicitacaoStatusBadge } from './SolicitacaoStatusBadge'
import {
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoPrioridadeOrder,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'
import { formatDateBR, getLocalDateTime } from '@/lib/date-utils'

const DEFAULT_PAGE_SIZE = 25

const SOLICITACAO_TABLE_COLUMNS = [
  { key: 'codigo', width: 110, minWidth: 80 },
  { key: 'descricao', width: 380, minWidth: 180 },
  { key: 'solicitante', width: 140, minWidth: 100 },
  { key: 'centro_custo', width: 130, minWidth: 90 },
  { key: 'prioridade', width: 120, minWidth: 100 },
  { key: 'situacao', width: 120, minWidth: 100 },
  { key: 'valor_total', width: 110, minWidth: 90 },
  { key: 'previsao_entrega', width: 120, minWidth: 100 },
  { key: 'visivel_publico', width: 60, minWidth: 56 }
]

function formatCurrency(value) {
  const number = Number(value || 0)
  if (!number) return '-'

  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function formatDate(value) {
  return formatDateBR(value)
}

function getStatusDotClass(status) {
  const option = getSolicitacaoOption(SOLICITACAO_STATUS_GERAL_OPTIONS, status)

  if (option.className.includes('emerald')) return 'bg-emerald-500'
  if (option.className.includes('green')) return 'bg-green-500'
  if (option.className.includes('yellow')) return 'bg-yellow-500'
  if (option.className.includes('red')) return 'bg-red-500'
  if (option.className.includes('amber')) return 'bg-amber-500'
  if (option.className.includes('orange')) return 'bg-orange-500'
  if (option.className.includes('violet')) return 'bg-violet-500'
  if (option.className.includes('indigo')) return 'bg-indigo-500'
  if (option.className.includes('blue')) return 'bg-blue-500'
  if (option.className.includes('slate')) return 'bg-slate-500'

  return 'bg-sky-500'
}

function isPublicVisible(value) {
  return value === true || value === 1 || value === '1'
}

function PublicVisibilityToggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!checked)
      }}
      className="inline-flex h-7 w-12 items-center justify-center rounded-full bg-transparent transition disabled:cursor-wait disabled:opacity-60"
      aria-pressed={checked}
      aria-label="Alternar visibilidade pública"
      title={checked ? 'Visível no público' : 'Oculto do público'}
    >
      <span
        className={`relative h-5 w-10 rounded-full border bg-transparent transition ${
          checked ? 'border-emerald-500' : 'border-red-500'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition ${
            checked ? 'left-[18px] bg-emerald-500' : 'left-0.5 bg-red-500'
          }`}
        />
      </span>
    </button>
  )
}

export function SolicitacaoTable({
  solicitacoes,
  onOpen,
  onTogglePublic
}) {
  const [updatingPublicIds, setUpdatingPublicIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })
  const {
    getColumnStyle,
    startResize,
    tableWidth
  } = useResizableColumns(SOLICITACAO_TABLE_COLUMNS, 'ige-solicitacao-table-column-widths')

  const handleTogglePublic = async (solicitacao, checked) => {
    if (!onTogglePublic) return

    setUpdatingPublicIds((prev) => [...prev, solicitacao.id])

    try {
      await onTogglePublic(solicitacao, checked)
    } finally {
      setUpdatingPublicIds((prev) => prev.filter((id) => id !== solicitacao.id))
    }
  }

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

  const handleCardKeyDown = (event, solicitacao) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    onOpen(solicitacao)
  }

  const sortedSolicitacoes = useMemo(() => {
    return [...solicitacoes].sort((a, b) => {
      const aValue = a[sortConfig.key] || ''
      const bValue = b[sortConfig.key] || ''

      if (sortConfig.key === 'prioridade') {
        const aOrder = getSolicitacaoPrioridadeOrder(aValue)
        const bOrder = getSolicitacaoPrioridadeOrder(bValue)
        return sortConfig.direction === 'asc' ? aOrder - bOrder : bOrder - aOrder
      }

      if (sortConfig.key.includes('data') || sortConfig.key.includes('created_at') || sortConfig.key.includes('previsao')) {
        const aDate = getLocalDateTime(aValue) || 0
        const bDate = getLocalDateTime(bValue) || 0
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      if (typeof aValue === 'number' || typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue)
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
  }, [solicitacoes, sortConfig])

  const totalPages = Math.max(1, Math.ceil(sortedSolicitacoes.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedSolicitacoes = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize

    return sortedSolicitacoes.slice(start, start + pageSize)
  }, [pageSize, safeCurrentPage, sortedSolicitacoes])

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {sortedSolicitacoes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          paginatedSolicitacoes.map((solicitacao) => {
            const situacao = getSolicitacaoSituacao(solicitacao)

            return (
              <div
                key={solicitacao.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(solicitacao)}
                onKeyDown={(event) => handleCardKeyDown(event, solicitacao)}
                className="min-w-0 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2 font-semibold">
                      <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(solicitacao.status_geral)}`} />
                      <span className="truncate">{solicitacao.codigo || '-'}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-sm [overflow-wrap:anywhere]" title={solicitacao.descricao || '-'}>
                      {solicitacao.descricao}
                    </p>
                    <p
                      className="mt-1 truncate text-xs text-muted-foreground"
                      title={`${solicitacao.solicitante || '-'} | ${solicitacao.centro_custo || '-'}`}
                    >
                      {solicitacao.solicitante || '-'} | {solicitacao.centro_custo || '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <SolicitacaoStatusBadge
                    type="prioridade"
                    value={solicitacao.prioridade}
                  />
                  {situacao.label && (
                    <span
                      className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
                      title={situacao.label}
                    >
                      {situacao.label}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  <span>Valor: {formatCurrency(solicitacao.valor_total)}</span>
                  <span>Previsão: {formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}</span>
                </div>
                <div className="mt-3">
                  <PublicVisibilityToggle
                    checked={isPublicVisible(solicitacao.visivel_publico)}
                    disabled={updatingPublicIds.includes(solicitacao.id)}
                    onChange={(checked) => handleTogglePublic(solicitacao, checked)}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
      <div className="md:hidden">
        <TablePagination
          page={safeCurrentPage}
          totalPages={totalPages}
          totalItems={sortedSolicitacoes.length}
          pageSize={pageSize}
          itemLabel="solicitações"
          onPageChange={setCurrentPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setCurrentPage(1)
          }}
        />
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
        <div className="inventory-table-scroll w-full overflow-x-auto px-2">
          <Table className="table-fixed" style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }}>
            <colgroup>
              {SOLICITACAO_TABLE_COLUMNS.map((column) => (
                <col key={column.key} style={getColumnStyle(column.key)} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableTableHead
                  label="Código"
                  columnKey="codigo"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="codigo" onResizeStart={startResize} />
                </SortableTableHead>
                <SortableTableHead
                  label="Item"
                  columnKey="descricao"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="descricao" onResizeStart={startResize} />
                </SortableTableHead>
                <SortableTableHead
                  label="Solicitante"
                  columnKey="solicitante"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="solicitante" onResizeStart={startResize} />
                </SortableTableHead>
                <SortableTableHead
                  label="Centro"
                  columnKey="centro_custo"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="centro_custo" onResizeStart={startResize} />
                </SortableTableHead>
                <SortableTableHead
                  label="Prioridade"
                  columnKey="prioridade"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="prioridade" onResizeStart={startResize} />
                </SortableTableHead>
                <TableHead className="relative pr-4">
                  Situação
                  <ColumnResizeHandle columnKey="situacao" onResizeStart={startResize} />
                </TableHead>
                <SortableTableHead
                  label="Valor"
                  columnKey="valor_total"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="valor_total" onResizeStart={startResize} />
                </SortableTableHead>
                <SortableTableHead
                  label="Previsão"
                  columnKey="previsao_entrega"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="relative pr-4"
                >
                  <ColumnResizeHandle columnKey="previsao_entrega" onResizeStart={startResize} />
                </SortableTableHead>
                <TableHead className="relative text-center">
                  <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
                  <ColumnResizeHandle columnKey="visivel_publico" onResizeStart={startResize} />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedSolicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSolicitacoes.map((solicitacao) => {
                  const situacao = getSolicitacaoSituacao(solicitacao)

                  return (
                    <TableRow
                      key={solicitacao.id}
                      className="cursor-pointer"
                      onClick={() => onOpen(solicitacao)}
                    >
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(solicitacao.status_geral)}`} />
                          <span className="truncate">{solicitacao.codigo || '-'}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="truncate font-medium" title={solicitacao.descricao || '-'}>
                          {solicitacao.descricao || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="truncate" title={solicitacao.solicitante || '-'}>
                          {solicitacao.solicitante || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="truncate" title={solicitacao.centro_custo || '-'}>
                          {solicitacao.centro_custo || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <SolicitacaoStatusBadge
                          type="prioridade"
                          value={solicitacao.prioridade}
                        />
                      </TableCell>
                      <TableCell>
                        {situacao.label ? (
                          <span
                            className={`block truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
                            title={situacao.label}
                          >
                            {situacao.label}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="truncate" title={formatCurrency(solicitacao.valor_total)}>
                          {formatCurrency(solicitacao.valor_total)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p
                          className="truncate"
                          title={formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}
                        >
                          {formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <PublicVisibilityToggle
                          checked={isPublicVisible(solicitacao.visivel_publico)}
                          disabled={updatingPublicIds.includes(solicitacao.id)}
                          onChange={(checked) => handleTogglePublic(solicitacao, checked)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={safeCurrentPage}
          totalPages={totalPages}
          totalItems={sortedSolicitacoes.length}
          pageSize={pageSize}
          itemLabel="solicitações"
          onPageChange={setCurrentPage}
          onPageSizeChange={(value) => {
            setPageSize(value)
            setCurrentPage(1)
          }}
        />
      </div>
    </>
  )
}
