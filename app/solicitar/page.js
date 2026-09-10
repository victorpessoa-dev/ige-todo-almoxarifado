'use client'

import { PublicFooter } from '@/components/layout/Copyright'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Copy, LogIn, PackageSearch, Plus, Search, Send, X } from 'lucide-react'
import { toast } from '@/lib/notifications/toast'

import {
  SolicitacaoForm,
  defaultSolicitacaoForm
} from '@/components/solicitacoes/SolicitacaoForm'
import {
  createPublicSolicitacao,
  getPublicSolicitacaoStatus,
  listPublicCentrosCusto,
  listPublicSolicitacoesStatus,
  listPublicSolicitantesCompra
} from '@/lib/services/solicitacoes-service'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckboxFilter } from '@/components/ui/checkbox-filter'
import { LoadingState } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  ColumnResizeHandle,
  useResizableColumns
} from '@/components/ui/resizable-table-columns'
import SortableTableHead from '@/components/ui/sortable-table-head'
import TablePagination from '@/components/ui/table-pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { getUserMessage } from '@/lib/messaging/user-messages'
import {
  getSolicitacaoFilterYears,
  matchesSolicitacaoDateFilters
} from '@/lib/solicitacoes/filters'
import {
  formatSolicitacaoItem,
  getSolicitacaoCentroCusto,
  getSolicitacaoSolicitante
} from '@/lib/solicitacoes/format'
import { SolicitacaoStatusBadge } from '@/components/solicitacoes/SolicitacaoStatusBadge'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  getSolicitacaoPrioridadeOrder,
  getSolicitacaoSituacao,
  getSolicitacaoStatusColor
} from '@/constants/solicitacoes-config'
import { formatDateBR, getLocalDateTime } from '@/lib/date/date-utils'

const DEFAULT_PAGE_SIZE = 25
const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
]

function formatDate(value) {
  return formatDateBR(value)
}

function getSolicitacaoCreatedAt(solicitacao) {
  return solicitacao?.created_at
}

function getUpdatedAtDisplay(solicitacao) {
  const updatedAt = solicitacao?.updated_at
  if (!updatedAt) return '-'

  const createdAt = getSolicitacaoCreatedAt(solicitacao)
  if (!createdAt) return formatDate(updatedAt)

  const updatedTime = new Date(updatedAt).getTime()
  const createdTime = new Date(createdAt).getTime()
  if (!Number.isFinite(updatedTime) || !Number.isFinite(createdTime)) {
    return formatDate(updatedAt)
  }

  const updatedMinute = Math.floor(updatedTime / 60000)
  const createdMinute = Math.floor(createdTime / 60000)
  if (updatedMinute === createdMinute) return '-'

  return formatDate(updatedAt)
}

function getPrevisaoDate(solicitacao) {
  return solicitacao.previsao_entrega
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
  })
}

function shouldShowSituacaoBadge(solicitacao, situacao) {
  if (!situacao?.label) return false

  const statusOption = SOLICITACAO_STATUS_GERAL_OPTIONS.find(
    (option) => option.value === solicitacao?.status_geral
  )

  return situacao.label !== statusOption?.label
}

function compareSolicitacaoByKey(a, b, key) {
  if (key === 'prioridade') {
    return (
      getSolicitacaoPrioridadeOrder(a.prioridade) -
      getSolicitacaoPrioridadeOrder(b.prioridade)
    )
  }

  if (['created_at', 'previsao', 'updated_at'].includes(key)) {
    const valueByKey = {
      created_at: getSolicitacaoCreatedAt,
      previsao: getPrevisaoDate,
      updated_at: (item) => item.updated_at
    }
    const getValue = valueByKey[key]
    const aDate = getLocalDateTime(getValue(a)) || 0
    const bDate = getLocalDateTime(getValue(b)) || 0

    return aDate - bDate
  }

  const valueByKey = {
    nome_item: (item) => formatSolicitacaoItem(item),
    solicitante: getSolicitacaoSolicitante,
    centro_custo: getSolicitacaoCentroCusto,
    situacao: (item) => getSolicitacaoSituacao(item).label
  }

  const getValue = valueByKey[key] || valueByKey.nome_item
  return compareText(getValue(a), getValue(b))
}

const PUBLIC_SOLICITACAO_TABLE_COLUMNS = [
  { key: 'codigo', width: 86, minWidth: 76 },
  { key: 'nome_item', width: 320, minWidth: 180 },
  { key: 'solicitante', width: 170, minWidth: 110 },
  { key: 'centro_custo', width: 170, minWidth: 110 },
  { key: 'prioridade', width: 112, minWidth: 100 },
  { key: 'situacao', width: 142, minWidth: 110 },
  { key: 'created_at', width: 118, minWidth: 100 },
  { key: 'previsao', width: 110, minWidth: 100 },
  { key: 'updated_at', width: 118, minWidth: 100 }
]

function StatusGrid({ solicitacao }) {
  const steps = SOLICITACAO_STATUS_GERAL_OPTIONS.filter(
    (option) => option.value !== 'cancelada'
  )
  const status = solicitacao?.status_geral || 'nova'
  const currentOrder = steps.findIndex((option) => option.value === status)
  const isCanceled = status === 'cancelada'
  const currentOption = steps[currentOrder] || steps[0]
  const neutralColor = '#cbd5e1'
  const currentColor = isCanceled ? neutralColor : getSolicitacaoStatusColor(currentOption.value)

  return (
    <>
      <div className="hidden sm:block">
        <div
          key={status}
          className="grid w-full animate-in fade-in-0 zoom-in-95 pb-1 duration-300"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((option, index) => {
            const current = !isCanceled && option.value === status
            const reached = !isCanceled && currentOrder >= 0 && index <= currentOrder
            const fillLeft = !isCanceled && currentOrder >= 0 && index > 0 && index <= currentOrder
            const fillRight = !isCanceled && currentOrder >= 0 && index < currentOrder
            const segmentDuration = 0.28
            const fillDelay = index * segmentDuration * 2
            const previousFillDelay = ((index - 1) * segmentDuration * 2) + segmentDuration

            return (
              <div
                key={option.value}
                className="grid min-w-0 grid-rows-[1.5rem] content-start"
                title={option.label}
              >
                <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center">
                  <span
                    aria-hidden="true"
                    className="relative z-0 h-1 min-w-0 self-center overflow-hidden transition-colors duration-500"
                    style={{ backgroundColor: index === 0 ? 'transparent' : neutralColor }}
                  >
                    {fillLeft && (
                      <motion.span
                        className="timeline-fill absolute inset-0 origin-left" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.28, delay: previousFillDelay, ease: "easeOut" }}
                        style={{                          backgroundColor: currentColor,                        }}
                      />
                    )}
                  </span>
                  <motion.span
                    className={`relative z-10 timeline-dot flex size-5 self-center shrink-0 rounded-full border-[3px] bg-background transition-all duration-500 ${
                      ''
                    }`}
                                        initial={{ scale: 0.78, backgroundColor: neutralColor, borderColor: neutralColor }}
                    animate={{ backgroundColor: reached ? currentColor : neutralColor, borderColor: reached ? currentColor : neutralColor, scale: current ? 1.25 : 0.8 }}
                    transition={{ duration: 0.2, delay: fillDelay, ease: "easeOut" }}
style={{
                      '--timeline-color': currentColor
                    }}
                    aria-current={current ? 'step' : undefined}
                  />
                  <span
                    aria-hidden="true"
                    className="relative z-0 h-1 min-w-0 self-center overflow-hidden transition-colors duration-500"
                    style={{ backgroundColor: index === steps.length - 1 ? 'transparent' : neutralColor }}
                  >
                    {fillRight && (
                      <motion.span
                        className="timeline-fill absolute inset-0 origin-left" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.28, delay: fillDelay, ease: "easeOut" }}
                        style={{                          backgroundColor: currentColor,                        }}
                      />
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-full min-h-0 w-5 max-w-full sm:hidden" aria-label={`Timeline: ${isCanceled ? 'Cancelada' : currentOption.label}`}>
        <span className="sr-only">{isCanceled ? 'Cancelada' : currentOption.label}</span>
        <div
          key={status}
          className="grid h-full min-h-64 w-5 animate-in fade-in-0 zoom-in-95 duration-300"
          style={{ gridTemplateRows: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
        {steps.map((option, index) => {
            const current = !isCanceled && option.value === status
            const reached = !isCanceled && currentOrder >= 0 && index <= currentOrder
            const fillTop = !isCanceled && currentOrder >= 0 && index > 0 && index <= currentOrder
            const fillBottom = !isCanceled && currentOrder >= 0 && index < currentOrder
            const segmentDuration = 0.28
            const fillDelay = index * segmentDuration * 2
            const previousFillDelay = ((index - 1) * segmentDuration * 2) + segmentDuration
            const isLast = index === steps.length - 1

            return (
              <div key={option.value} className="grid min-h-0 grid-rows-[1fr_auto_1fr] justify-items-center" title={option.label}>
                <span
                  aria-hidden="true"
                  className="relative z-0 w-1 self-center overflow-hidden transition-colors duration-500"
                  style={{ backgroundColor: index === 0 ? 'transparent' : neutralColor }}
                >
                  {fillTop && (
                    <motion.span
                      className="timeline-fill absolute inset-0 origin-top" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.28, delay: previousFillDelay, ease: "easeOut" }}
                      style={{                        backgroundColor: currentColor,                      }}
                    />
                  )}
                </span>
                  <motion.span
                    className={`relative z-10 timeline-dot flex size-4 self-center shrink-0 rounded-full border-[3px] bg-background transition-all duration-500 ${
                      ''
                    }`}
                                        initial={{ scale: 0.78, backgroundColor: neutralColor, borderColor: neutralColor }}
                    animate={{ backgroundColor: reached ? currentColor : neutralColor, borderColor: reached ? currentColor : neutralColor, scale: current ? 1.25 : 0.8 }}
                    transition={{ duration: 0.2, delay: fillDelay, ease: "easeOut" }}
style={{
                      '--timeline-color': currentColor
                    }}
                    aria-current={current ? 'step' : undefined}
                  />
                <span
                  aria-hidden="true"
                  className="relative z-0 w-1 self-center overflow-hidden transition-colors duration-500"
                  style={{ backgroundColor: isLast ? 'transparent' : neutralColor }}
                >
                  {fillBottom && (
                    <motion.span
                      className="timeline-fill absolute inset-0 origin-top" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.28, delay: fillDelay, ease: "easeOut" }}
                      style={{                        backgroundColor: currentColor,                      }}
                    />
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground" title={label}>{label}</p>
      <div className="mt-1 min-w-0 whitespace-pre-line break-words text-sm font-medium [overflow-wrap:anywhere]">{value || '-'}</div>
    </div>
  )
}

function CopyableReferenceLink({ href }) {
  if (!href) return '-'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(href)
      toast.success('Link copiado!')
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline"
        title={href}
      >
        {href}
      </a>
      <Button
        type="button"
        variant="ghost"
        className="size-7 shrink-0 p-0"
        aria-label="Copiar link de referência"
        title="Copiar link"
        onClick={handleCopy}
      >
        <Copy className="size-4" />
      </Button>
    </span>
  )
}

function SolicitacaoPublicTable({ solicitacoes, onOpen, sortConfig, onSort }) {
  const {
    getColumnStyle,
    startResize,
    tableWidth
  } = useResizableColumns(
    PUBLIC_SOLICITACAO_TABLE_COLUMNS,
    'ige-public-solicitacao-table-column-widths'
  )

  if (solicitacoes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma solicitação cadastrada ainda.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {solicitacoes.map((solicitacao) => {
          const situacao = getSolicitacaoSituacao(solicitacao)

          return (
            <button
              key={solicitacao.codigo}
              type="button"
              onClick={() => onOpen(solicitacao)}
              className="min-w-0 rounded-xl border bg-background p-4 text-left shadow-sm transition hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold tabular-nums">{solicitacao.codigo}</p>
                  <p className="mt-1 line-clamp-2 text-sm break-words [overflow-wrap:anywhere]" title={formatSolicitacaoItem(solicitacao) || '-'}>
                    {formatSolicitacaoItem(solicitacao)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={getSolicitacaoSolicitante(solicitacao) || '-'}>
                    {getSolicitacaoSolicitante(solicitacao) || '-'}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={getSolicitacaoCentroCusto(solicitacao) || '-'}>
                    {getSolicitacaoCentroCusto(solicitacao) || '-'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
                {situacao.label && (
                  <span
                    className={`block max-w-full truncate rounded-[4px] border px-2 py-1.5 text-xs font-bold uppercase leading-none ${situacao.className}`}
                    title={situacao.label}
                  >
                    {situacao.label}
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Solicitado: {formatDate(getSolicitacaoCreatedAt(solicitacao))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Previsão: {formatDate(getPrevisaoDate(solicitacao))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizado: {getUpdatedAtDisplay(solicitacao)}
              </p>
            </button>
          )
        })}
      </div>

      <div className="ige-scrollbar inventory-table-scroll hidden overflow-x-auto rounded-xl border bg-background md:block">
        <Table className="table-fixed" style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }}>
          <colgroup>
            {PUBLIC_SOLICITACAO_TABLE_COLUMNS.map((column) => (
              <col key={column.key} style={getColumnStyle(column.key)} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="relative h-12 px-3 pr-4">
                Cod.
                <ColumnResizeHandle columnKey="codigo" onResizeStart={startResize} />
              </TableHead>
              <SortableTableHead
                label="Produto"
                columnKey="nome_item"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="nome_item" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Solicitante"
                columnKey="solicitante"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="solicitante" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Centro"
                columnKey="centro_custo"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="centro_custo" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Prioridade"
                columnKey="prioridade"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="prioridade" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Situação"
                columnKey="situacao"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="situacao" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Solicitado"
                columnKey="created_at"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="created_at" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Previsão"
                columnKey="previsao"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="previsao" onResizeStart={startResize} />
              </SortableTableHead>
              <SortableTableHead
                label="Atualizado"
                columnKey="updated_at"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="updated_at" onResizeStart={startResize} />
              </SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitacoes.map((solicitacao) => {
              const situacao = getSolicitacaoSituacao(solicitacao)

              return (
                <TableRow
                  key={solicitacao.codigo}
                  className="cursor-pointer"
                  onClick={() => onOpen(solicitacao)}
                >
                  <TableCell className="px-3 py-3 font-semibold tabular-nums">
                    <p className="truncate" title={solicitacao.codigo || '-'}>
                      {solicitacao.codigo || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <p className="truncate font-medium" title={formatSolicitacaoItem(solicitacao) || '-'}>
                      {formatSolicitacaoItem(solicitacao) || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <p className="truncate" title={getSolicitacaoSolicitante(solicitacao) || '-'}>
                      {getSolicitacaoSolicitante(solicitacao) || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <p className="truncate" title={getSolicitacaoCentroCusto(solicitacao) || '-'}>
                      {getSolicitacaoCentroCusto(solicitacao) || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="truncate" title={solicitacao.prioridade || '-'}>
                      <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {situacao.label ? (
                      <span
                        className={`block w-full truncate rounded-[4px] border px-2 py-1.5 text-xs font-bold uppercase leading-none ${situacao.className}`}
                        title={situacao.label}
                      >
                        {situacao.label}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <p className="truncate" title={formatDate(getSolicitacaoCreatedAt(solicitacao))}>
                      {formatDate(getSolicitacaoCreatedAt(solicitacao))}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <p className="truncate" title={formatDate(getPrevisaoDate(solicitacao))}>
                      {formatDate(getPrevisaoDate(solicitacao))}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <p className="truncate" title={getUpdatedAtDisplay(solicitacao)}>
                      {getUpdatedAtDisplay(solicitacao)}
                    </p>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function SolicitacaoPublicDetailsDialog({ solicitacao, open, onOpenChange }) {
  if (!solicitacao) return null

  const situacao = getSolicitacaoSituacao(solicitacao)
  const showSituacaoBadge = shouldShowSituacaoBadge(solicitacao, situacao)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ige-scrollbar h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-3xl sm:rounded-lg sm:p-6">
        <div className="min-w-0 space-y-4">
        <DialogHeader>
              <DialogTitle className="line-clamp-3 break-words text-left text-base [overflow-wrap:anywhere] sm:text-lg" title={`${solicitacao.codigo} - ${formatSolicitacaoItem(solicitacao)}`}>
                {solicitacao.codigo} - {formatSolicitacaoItem(solicitacao)}
              </DialogTitle>
        </DialogHeader>

        <div className="relative min-w-0 pl-8 sm:pl-0">
          <div className="absolute left-0 top-0 h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] w-5 sm:hidden">
            <StatusGrid solicitacao={solicitacao} />
          </div>
          <div className="mb-6 hidden pt-2 sm:block sm:px-8">
            <StatusGrid solicitacao={solicitacao} />
          </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SolicitacaoStatusBadge value={solicitacao.status_geral} />
            <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
            {showSituacaoBadge && (
              <span
                className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
                title={situacao.label}
              >
                {situacao.label}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Solicitante" value={getSolicitacaoSolicitante(solicitacao)} />
            <InfoItem label="Centro de custo" value={getSolicitacaoCentroCusto(solicitacao)} />
            <InfoItem label="Quantidade" value={solicitacao.quantidade} />
            <InfoItem label="Data da solicitação" value={formatDate(getSolicitacaoCreatedAt(solicitacao))} />
            <InfoItem label="Previsão desejada" value={formatDate(solicitacao.previsao_desejada)} />
            <InfoItem label="Previsão de entrega" value={formatDate(solicitacao.previsao_entrega)} />
            <InfoItem label="Atualizado em" value={getUpdatedAtDisplay(solicitacao)} />
          </div>

          <InfoItem label="Nome do item" value={solicitacao.nome_item} />
          <InfoItem label="Descrição do item" value={solicitacao.descricao} />
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Aplicação" value={solicitacao.aplicacoes} />
            <InfoItem
              label="Link de referência"
              value={<CopyableReferenceLink href={solicitacao.link_referencia} />}
            />
          </div>
        </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function SolicitarPage() {
  const [form, setForm] = useState(defaultSolicitacaoForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdSolicitacao, setCreatedSolicitacao] = useState(null)
  const [solicitantes, setSolicitantes] = useState([])
  const [centrosCusto, setCentrosCusto] = useState([])
  const [solicitacoesPublicas, setSolicitacoesPublicas] = useState([])
  const [isLoadingLists, setIsLoadingLists] = useState(true)
  const [isLoadingSolicitacoes, setIsLoadingSolicitacoes] = useState(true)
  const [codigoBusca, setCodigoBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState([])
  const [prioridadeFiltro, setPrioridadeFiltro] = useState([])
  const [mesFiltro, setMesFiltro] = useState([])
  const [anoFiltro, setAnoFiltro] = useState([])
  const [publicCurrentPage, setPublicCurrentPage] = useState(1)
  const [publicPageSize, setPublicPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [publicSortConfig, setPublicSortConfig] = useState({
    key: 'prioridade',
    direction: 'asc'
  })
  const [statusResult, setStatusResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [pedidoDialogOpen, setPedidoDialogOpen] = useState(false)
  const [selectedPublicSolicitacao, setSelectedPublicSolicitacao] = useState(null)
  const statusResultSituacao = statusResult
    ? getSolicitacaoSituacao(statusResult)
    : null
  const showStatusResultSituacao = shouldShowSituacaoBadge(statusResult, statusResultSituacao)
  const publicSearch = codigoBusca.trim().toLowerCase()
  const filteredSolicitacoesPublicas = useMemo(() => {
    const filteredBySearch = publicSearch
      ? solicitacoesPublicas.filter((solicitacao) =>
        [
          solicitacao.codigo,
          solicitacao.nome_item,
          solicitacao.descricao,
          solicitacao.aplicacoes,
          getSolicitacaoSolicitante(solicitacao),
          getSolicitacaoCentroCusto(solicitacao)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(publicSearch))
      )
      : solicitacoesPublicas

    const filteredByStatus = statusFiltro.length === 0
      ? filteredBySearch.filter((solicitacao) => {
          // Se nenhum status for selecionado, esconde concluidas e canceladas.
          return !['concluida', 'cancelada'].includes(solicitacao.status_geral)
        })
      : filteredBySearch.filter((solicitacao) =>
          statusFiltro.includes(solicitacao.status_geral)
        )

    const filtered = prioridadeFiltro.length === 0
      ? filteredByStatus
      : filteredByStatus.filter((solicitacao) =>
        prioridadeFiltro.includes(solicitacao.prioridade)
      )

    const filteredByDate = filtered.filter((solicitacao) =>
      matchesSolicitacaoDateFilters(solicitacao, {
        meses: mesFiltro,
        anos: anoFiltro
      })
    )

    return [...filteredByDate].sort((a, b) => {
      const direction = publicSortConfig.direction === 'asc' ? 1 : -1
      const sortDiff = compareSolicitacaoByKey(a, b, publicSortConfig.key)
      if (sortDiff !== 0) return sortDiff * direction

      return String(b.codigo || '').localeCompare(String(a.codigo || ''), 'pt-BR', {
        numeric: true
      })
    })
  }, [anoFiltro, mesFiltro, prioridadeFiltro, publicSearch, publicSortConfig, solicitacoesPublicas, statusFiltro])

  const publicFilterYears = useMemo(
    () => getSolicitacaoFilterYears(solicitacoesPublicas),
    [solicitacoesPublicas]
  )

  const publicTotalPages = Math.max(
    1,
    Math.ceil(filteredSolicitacoesPublicas.length / publicPageSize)
  )
  const safePublicCurrentPage = Math.min(publicCurrentPage, publicTotalPages)
  const paginatedSolicitacoesPublicas = useMemo(() => {
    const start = (safePublicCurrentPage - 1) * publicPageSize

    return filteredSolicitacoesPublicas.slice(start, start + publicPageSize)
  }, [filteredSolicitacoesPublicas, publicPageSize, safePublicCurrentPage])

  const handlePublicSort = (key) => {
    setPublicCurrentPage(1)
    setPublicSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc'
          ? 'desc'
          : 'asc'
    }))
  }

  const clearPublicTableFilters = () => {
    setStatusFiltro([])
    setPrioridadeFiltro([])
    setMesFiltro([])
    setAnoFiltro([])
    setPublicCurrentPage(1)
  }

  const loadPublicSolicitacoes = async () => {
    setIsLoadingSolicitacoes(true)

    try {
      const data = await listPublicSolicitacoesStatus()
      setSolicitacoesPublicas(data)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível carregar os andamentos.'))
    } finally {
      setIsLoadingSolicitacoes(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadLists() {
      try {
        const [solicitantesData, centrosCustoData, solicitacoesData] = await Promise.all([
          listPublicSolicitantesCompra(),
          listPublicCentrosCusto(),
          listPublicSolicitacoesStatus()
        ])

        if (!cancelled) {
          setSolicitantes(solicitantesData)
          setCentrosCusto(centrosCustoData)
          setSolicitacoesPublicas(solicitacoesData)
        }
      } catch (error) {
        toast.error(getUserMessage(error, 'Não foi possível carregar os cadastros.'))
      } finally {
        if (!cancelled) {
          setIsLoadingLists(false)
          setIsLoadingSolicitacoes(false)
        }
      }
    }

    loadLists()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await createPublicSolicitacao(form)
      setCreatedSolicitacao(result || null)
      setSubmitted(true)
      setForm(defaultSolicitacaoForm)
      setPedidoDialogOpen(false)
      await loadPublicSolicitacoes()
      toast.success('Solicitação enviada com sucesso!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível enviar a solicitação.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearchStatus = async (event) => {
    event.preventDefault()
    setIsSearching(true)

    try {
      const search = codigoBusca.trim()
      const normalizedCode = search.replace(/\D/g, '')

      if (!search) {
        setStatusResult(null)
        return
      }

      if (/^\d+$/.test(search) || normalizedCode === search) {
        const result = await getPublicSolicitacaoStatus(normalizedCode)
        setStatusResult(result)
        return
      }

      const normalizedSearch = search.toLowerCase()
      const results = solicitacoesPublicas.filter((solicitacao) =>
        [
          solicitacao.codigo,
          solicitacao.nome_item,
          solicitacao.descricao,
          solicitacao.aplicacoes,
          getSolicitacaoSolicitante(solicitacao)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch))
      )

      if (results.length === 0) {
        throw new Error('Nenhuma solicitação encontrada.')
      }

      setStatusResult(null)
    } catch (error) {
      setStatusResult(null)
      toast.error(getUserMessage(error, 'Não foi possível consultar a solicitação.'))
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Image
              src="/ige-supergesso.svg"
              alt="IGE Supergesso"
              width={150}
              height={90}
              className="h-auto w-32 sm:w-[150px]"
            />
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Solicitação de Compra
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie pedidos e acompanhe o andamento pelo código da solicitação.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            <Button className="w-full lg:w-auto" onClick={() => setPedidoDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Fazer pedido
            </Button>

            <Button asChild variant="outline" className="w-full lg:w-auto">
              <Link href="/catalogo-publico" rel="noreferrer">
                <PackageSearch className="h-4 w-4" />
                Catálogo público
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full lg:w-auto">
              <a href="/login">
                <LogIn className="h-4 w-4" />
                Acesso admin
              </a>
            </Button>
          </div>
        </div>

        {submitted && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-col gap-3 p-4 text-emerald-900 sm:flex-row sm:items-center">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p>Sua solicitação foi registrada.</p>
                {createdSolicitacao?.codigo ? (
                  <p className="font-semibold">
                    Código para acompanhamento: {createdSolicitacao.codigo}
                  </p>
                ) : (
                  <p>O acompanhamento será feito pelo setor administrativo.</p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="bg-white sm:ml-auto"
                onClick={() => setSubmitted(false)}
              >
                Nova
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              Acompanhar andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearchStatus} className="grid w-full gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3 sm:p-4">
              <Input
                className="h-10"
                value={codigoBusca}
                onChange={(event) => {
                  setCodigoBusca(event.target.value)
                  setPublicCurrentPage(1)
                }}
                placeholder="Busque por código, produto ou solicitante"
              />
              <Button type="submit" disabled={isSearching} className="h-10 w-full sm:w-auto">
                Buscar
              </Button>
            </form>

            <div className="grid w-full gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-5">
              <CheckboxFilter
                label="status"
                allLabel="Todos os status"
                options={SOLICITACAO_STATUS_GERAL_OPTIONS}
                value={statusFiltro}
                onChange={(value) => {
                  setStatusFiltro(value)
                  setPublicCurrentPage(1)
                }}
              />

              <CheckboxFilter
                label="prioridade"
                allLabel="Todas as prioridades"
                options={SOLICITACAO_PRIORIDADE_OPTIONS}
                value={prioridadeFiltro}
                onChange={(value) => {
                  setPrioridadeFiltro(value)
                  setPublicCurrentPage(1)
                }}
              />

              <CheckboxFilter
                label="mês"
                allLabel="Todos os meses"
                options={MONTH_OPTIONS}
                value={mesFiltro}
                onChange={(value) => {
                  setMesFiltro(value)
                  setPublicCurrentPage(1)
                }}
              />

              <CheckboxFilter
                label="ano"
                allLabel="Todos os anos"
                options={publicFilterYears.map((year) => ({
                  value: year,
                  label: year
                }))}
                value={anoFiltro}
                onChange={(value) => {
                  setAnoFiltro(value)
                  setPublicCurrentPage(1)
                }}
              />

              <Button
                type="button"
                variant="outline"
                className="h-10 w-full bg-background"
                onClick={clearPublicTableFilters}
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            </div>

            {statusResult && (
              <div className="space-y-3 rounded-xl border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold tabular-nums">{statusResult.codigo}</p>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]" title={formatSolicitacaoItem(statusResult) || '-'}>
                      {formatSolicitacaoItem(statusResult)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <SolicitacaoStatusBadge value={statusResult.status_geral} />
                    {showStatusResultSituacao && (
                      <span
                        className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${statusResultSituacao.className}`}
                        title={statusResultSituacao.label}
                      >
                        {statusResultSituacao.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <span className="truncate" title={`Solicitante: ${getSolicitacaoSolicitante(statusResult) || '-'}`}>
                    Solicitante: {getSolicitacaoSolicitante(statusResult) || '-'}
                  </span>
                  <span className="truncate" title={`Centro: ${getSolicitacaoCentroCusto(statusResult) || '-'}`}>
                    Centro: {getSolicitacaoCentroCusto(statusResult) || '-'}
                  </span>
                  <span className="truncate" title={`Quantidade: ${statusResult.quantidade || '-'}`}>
                    Quantidade: {statusResult.quantidade || '-'}
                  </span>
                  <span className="truncate" title={`Data da solicitação: ${formatDate(getSolicitacaoCreatedAt(statusResult))}`}>
                    Data da solicitação: {formatDate(getSolicitacaoCreatedAt(statusResult))}
                  </span>
                  <span className="truncate" title={`Previsão desejada: ${formatDate(statusResult.previsao_desejada)}`}>
                    Previsão desejada: {formatDate(statusResult.previsao_desejada)}
                  </span>
                  <span className="truncate" title={`Previsão de entrega: ${formatDate(statusResult.previsao_entrega)}`}>
                    Previsão de entrega: {formatDate(statusResult.previsao_entrega)}
                  </span>
                  <span className="truncate" title={`Atualizado em: ${getUpdatedAtDisplay(statusResult)}`}>
                    Atualizado em: {getUpdatedAtDisplay(statusResult)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PackageSearch className="h-5 w-5 text-primary" />
                Produtos solicitados
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {filteredSolicitacoesPublicas.length} pedido(s)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSolicitacoes ? (
              <LoadingState className="rounded-xl border" />
            ) : (
              <SolicitacaoPublicTable
                solicitacoes={paginatedSolicitacoesPublicas}
                onOpen={setSelectedPublicSolicitacao}
                sortConfig={publicSortConfig}
                onSort={handlePublicSort}
              />
            )}
            {!isLoadingSolicitacoes && filteredSolicitacoesPublicas.length > 0 && (
              <TablePagination
                page={safePublicCurrentPage}
                totalPages={publicTotalPages}
                totalItems={filteredSolicitacoesPublicas.length}
                pageSize={publicPageSize}
                itemLabel="pedidos"
                onPageChange={setPublicCurrentPage}
                onPageSizeChange={(value) => {
                  setPublicPageSize(value)
                  setPublicCurrentPage(1)
                }}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={pedidoDialogOpen} onOpenChange={setPedidoDialogOpen}>
          <DialogContent className="ige-scrollbar h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-3xl sm:rounded-lg sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Fazer pedido
              </DialogTitle>
            </DialogHeader>

            {isLoadingLists ? (
              <LoadingState />
            ) : solicitantes.length === 0 || centrosCusto.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Ainda não há solicitantes ou centros de custo ativos cadastrados. Entre em contato com o administrativo.
              </div>
            ) : (
              <SolicitacaoForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                submitLabel="Enviar solicitação"
                isSubmitting={isSubmitting}
                mode="public"
                showSections
                solicitantes={solicitantes}
                centrosCusto={centrosCusto}
              />
            )}
          </DialogContent>
        </Dialog>

        <SolicitacaoPublicDetailsDialog
          solicitacao={selectedPublicSolicitacao}
          open={Boolean(selectedPublicSolicitacao)}
          onOpenChange={(open) => {
            if (!open) setSelectedPublicSolicitacao(null)
          }}
        />
      </div>
      <PublicFooter />
    </main>
  )
}
