'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Eye } from 'lucide-react'
import { SolicitacaoStatusBadge } from './SolicitacaoStatusBadge'
import {
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoPrioridadeOrder,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'
import { formatDateBR, getLocalDateTime } from '@/lib/date-utils'

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
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })

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

  const SortHeader = ({ label, columnKey }) => {
    const isActive = sortConfig.key === columnKey

    return (
      <TableHead>
        <button
          type="button"
          onClick={() => handleSort(columnKey)}
          className="flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
        >
          {label}
          {isActive ? (
            sortConfig.direction === 'asc'
              ? <ArrowUp className="h-3.5 w-3.5" />
              : <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </button>
      </TableHead>
    )
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {sortedSolicitacoes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          sortedSolicitacoes.map((solicitacao) => {
            const situacao = getSolicitacaoSituacao(solicitacao)

            return (
              <div
                key={solicitacao.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(solicitacao)}
                onKeyDown={(event) => handleCardKeyDown(event, solicitacao)}
                className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(solicitacao.status_geral)}`} />
                      <span>{solicitacao.codigo || '-'}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm">
                      {solicitacao.descricao}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
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

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
        <div className="inventory-table-scroll overflow-x-auto">
          <Table className="min-w-[1040px] [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_td]:px-3 [&_td]:py-2.5 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_th]:px-3 [&_th]:py-2">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHeader label="Código" columnKey="codigo" />
                <SortHeader label="Item" columnKey="descricao" />
                <SortHeader label="Solicitante" columnKey="solicitante" />
                <SortHeader label="Centro" columnKey="centro_custo" />
                <SortHeader label="Prioridade" columnKey="prioridade" />
                <TableHead>Situação</TableHead>
                <TableHead>Ref.</TableHead>
                <SortHeader label="Valor" columnKey="valor_total" />
                <SortHeader label="Previsão" columnKey="previsao_entrega" />
                <TableHead className="w-16 text-center">
                  <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedSolicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sortedSolicitacoes.map((solicitacao) => {
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
                          <span>{solicitacao.codigo || '-'}</span>
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="truncate font-medium">{solicitacao.descricao}</p>
                      </TableCell>
                      <TableCell>{solicitacao.solicitante || '-'}</TableCell>
                      <TableCell className="max-w-[180px]">
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
                          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                            {situacao.label}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {solicitacao.link_referencia ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <a
                              href={solicitacao.link_referencia}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Abrir referência"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(solicitacao.valor_total)}</TableCell>
                      <TableCell>
                        {formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}
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
      </div>
    </>
  )
}
