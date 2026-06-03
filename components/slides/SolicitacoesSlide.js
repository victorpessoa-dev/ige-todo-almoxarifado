'use client'

import { useEffect, useMemo, useRef } from 'react'
import { ShoppingCart } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoPrioridadeOrder,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'
import { formatDateBR, getLocalDateTime } from '@/lib/date-utils'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'
import { formatSolicitacaoItem } from '@/lib/solicitacoes-format'

const SLIDE_SOLICITACAO_TABLE_COLUMNS = [
  { key: 'codigo', width: 92 },
  { key: 'item', width: 260 },
  { key: 'solicitante', width: 160 },
  { key: 'centro', width: 230 },
  { key: 'prioridade', width: 110 },
  { key: 'situacao', width: 210 },
  { key: 'previsao', width: 120 }
]

const SLIDE_SOLICITACAO_TABLE_WIDTH = SLIDE_SOLICITACAO_TABLE_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
)

function getColumnWidthPercent(width) {
  return `${(width / SLIDE_SOLICITACAO_TABLE_WIDTH) * 100}%`
}

function isAtrasada(solicitacao) {
  const dateValue = solicitacao.previsao_entrega || solicitacao.previsao_desejada
  if (!dateValue) return false

  if (['concluida', 'cancelada', 'entregue'].includes(solicitacao.status_geral)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetTime = getLocalDateTime(dateValue)
  return targetTime !== null && targetTime < today.getTime()
}

function formatDate(value) {
  return formatDateBR(value, 'Sem previsão')
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

function PrioridadeBadge({ value }) {
  const option = getSolicitacaoOption(SOLICITACAO_PRIORIDADE_OPTIONS, value)

  return (
    <span
      className={`inline-flex max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${option.className}`}
      title={option.label}
    >
      {option.label}
    </span>
  )
}

function SituacaoBadge({ solicitacao }) {
  const situacao = getSolicitacaoSituacao(solicitacao)

  if (!situacao.label) return <span className="text-muted-foreground">-</span>

  return (
    <span
      className={`inline-flex max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
      title={situacao.label}
    >
      {situacao.label}
    </span>
  )
}

function StatusDot({ solicitacao }) {
  return (
    <span
      aria-hidden="true"
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotClass(solicitacao.status_geral)}`}
    />
  )
}

export function SolicitacoesSlide({ solicitacoes, active, onEnd }) {
  const ref = useRef(null)
  const abertas = useMemo(() => {
    return solicitacoes
      .filter((item) => !['concluida', 'cancelada'].includes(item.status_geral))
      .sort((a, b) => {
        const aAtrasada = isAtrasada(a) ? 1 : 0
        const bAtrasada = isAtrasada(b) ? 1 : 0
        if (aAtrasada !== bAtrasada) return bAtrasada - aAtrasada

        const priorityDiff =
          getSolicitacaoPrioridadeOrder(a.prioridade) -
          getSolicitacaoPrioridadeOrder(b.prioridade)
        if (priorityDiff !== 0) return priorityDiff

        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
        return bDate - aDate
      })
  }, [solicitacoes])

  useAutoScroll(ref, abertas.length > 0 ? onEnd : undefined, active)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollTo({ top: 0 })
    }
  }, [active])

  return (
    <div className="flex h-full flex-col overflow-hidden p-5 sm:p-8">
      <div className="mb-4 flex items-center justify-center gap-2 text-center sm:mb-6 sm:gap-3">
        <ShoppingCart className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
          Solicitações de Compra
        </h2>
      </div>

      {abertas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
          Nenhuma solicitação em aberto.
        </div>
      ) : (
        <div ref={ref} className="slide-scroll scrollbar-soft min-h-0 flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
          <Table
            className="w-full table-fixed"
          >
            <colgroup>
              {SLIDE_SOLICITACAO_TABLE_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: getColumnWidthPercent(column.width) }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 px-3 text-base">Código</TableHead>
                <TableHead className="h-12 px-3 text-base">Item</TableHead>
                <TableHead className="h-12 px-3 text-base">Solicitante</TableHead>
                <TableHead className="h-12 px-3 text-base">Centro</TableHead>
                <TableHead className="h-12 px-3 text-base">Prioridade</TableHead>
                <TableHead className="h-12 px-3 text-base">Situação</TableHead>
                <TableHead className="h-12 px-3 text-base">Previsão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abertas.map((solicitacao) => {
                const previsao = formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)

                return (
                  <TableRow key={solicitacao.id} className="hover:bg-muted/30">
                    <TableCell className="px-3 py-3 font-semibold tabular-nums">
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusDot solicitacao={solicitacao} />
                        <p className="truncate" title={solicitacao.codigo || '-'}>
                          {solicitacao.codigo || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate font-medium" title={formatSolicitacaoItem(solicitacao) || '-'}>
                        {formatSolicitacaoItem(solicitacao) || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate" title={solicitacao.solicitante || '-'}>
                        {solicitacao.solicitante || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate" title={solicitacao.centro_custo || '-'}>
                        {solicitacao.centro_custo || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <PrioridadeBadge value={solicitacao.prioridade} />
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <SituacaoBadge solicitacao={solicitacao} />
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <p className="truncate" title={previsao}>
                        {previsao}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
