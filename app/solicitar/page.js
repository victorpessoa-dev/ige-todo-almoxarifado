'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, LogIn, PackageSearch, Plus, Search, Send } from 'lucide-react'
import { toast } from 'sonner'

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
} from '@/lib/solicitacoes-service'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { getUserMessage } from '@/lib/user-messages'
import { SolicitacaoStatusBadge } from '@/components/solicitacoes/SolicitacaoStatusBadge'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoPrioridadeOrder,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'
import { formatDateBR } from '@/lib/date-utils'

const DEFAULT_PAGE_SIZE = 25

function formatDate(value) {
  return formatDateBR(value)
}

function getPrevisaoDate(solicitacao) {
  return solicitacao.previsao_entrega || solicitacao.previsao_desejada
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
  })
}

function compareSolicitacaoByKey(a, b, key) {
  if (key === 'prioridade') {
    return (
      getSolicitacaoPrioridadeOrder(a.prioridade) -
      getSolicitacaoPrioridadeOrder(b.prioridade)
    )
  }

  const valueByKey = {
    descricao: (item) => item.descricao,
    solicitante: (item) => item.solicitante,
    centro_custo: (item) => item.centro_custo,
    situacao: (item) => getSolicitacaoSituacao(item).label
  }

  const getValue = valueByKey[key] || valueByKey.descricao
  return compareText(getValue(a), getValue(b))
}

const PUBLIC_SOLICITACAO_TABLE_COLUMNS = [
  { key: 'codigo', width: 86, minWidth: 76 },
  { key: 'descricao', width: 320, minWidth: 180 },
  { key: 'solicitante', width: 170, minWidth: 110 },
  { key: 'centro_custo', width: 170, minWidth: 110 },
  { key: 'prioridade', width: 112, minWidth: 100 },
  { key: 'situacao', width: 142, minWidth: 110 },
  { key: 'previsao', width: 110, minWidth: 100 }
]

function DetailStatus({ label, value, options }) {
  const option = getSolicitacaoOption(options, value)

  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium" title={option.label}>{option.label}</p>
    </div>
  )
}

function StatusGrid({ solicitacao }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <DetailStatus
        label="Cotação"
        value={solicitacao.status_cotacao}
        options={SOLICITACAO_STATUS_COTACAO_OPTIONS}
      />
      <DetailStatus
        label="Pedido"
        value={solicitacao.status_pedido}
        options={SOLICITACAO_STATUS_PEDIDO_OPTIONS}
      />
      <DetailStatus
        label="Entrega"
        value={solicitacao.status_transporte}
        options={SOLICITACAO_STATUS_TRANSPORTE_OPTIONS}
      />
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">{value || '-'}</p>
    </div>
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
                <div className="min-w-0">
                  <p className="truncate font-semibold tabular-nums">{solicitacao.codigo}</p>
                  <p className="mt-1 line-clamp-2 text-sm break-words [overflow-wrap:anywhere]" title={solicitacao.descricao || '-'}>
                    {solicitacao.descricao}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={solicitacao.solicitante || '-'}>
                    {solicitacao.solicitante || '-'}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground" title={solicitacao.centro_custo || '-'}>
                    {solicitacao.centro_custo || '-'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
                {situacao.label && (
                  <span
                    className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
                    title={situacao.label}
                  >
                    {situacao.label}
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Previsão: {formatDate(getPrevisaoDate(solicitacao))}
              </p>
            </button>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border bg-background md:block">
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
                columnKey="descricao"
                sortConfig={sortConfig}
                onSort={onSort}
                className="relative h-12 px-3 pr-4"
              >
                <ColumnResizeHandle columnKey="descricao" onResizeStart={startResize} />
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
              <TableHead className="relative h-12 px-3 pr-4">
                Previsão
                <ColumnResizeHandle columnKey="previsao" onResizeStart={startResize} />
              </TableHead>
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
                    <p className="truncate font-medium" title={solicitacao.descricao || '-'}>
                      {solicitacao.descricao || '-'}
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
                    <div className="truncate" title={solicitacao.prioridade || '-'}>
                      <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
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
                  <TableCell className="px-3 py-3">
                    <p className="truncate" title={formatDate(getPrevisaoDate(solicitacao))}>
                      {formatDate(getPrevisaoDate(solicitacao))}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-3xl sm:rounded-lg sm:p-6">
        <DialogHeader>
              <DialogTitle className="line-clamp-3 break-words text-left text-base [overflow-wrap:anywhere] sm:text-lg" title={`${solicitacao.codigo} - ${solicitacao.descricao}`}>
                {solicitacao.codigo} - {solicitacao.descricao}
              </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SolicitacaoStatusBadge value={solicitacao.status_geral} />
            <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
            {situacao.label && (
              <span
                className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
                title={situacao.label}
              >
                {situacao.label}
              </span>
            )}
          </div>

          <StatusGrid solicitacao={solicitacao} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Solicitante" value={solicitacao.solicitante} />
            <InfoItem label="Centro de custo" value={solicitacao.centro_custo} />
            <InfoItem label="Quantidade" value={solicitacao.quantidade} />
            <InfoItem label="Previsão desejada" value={formatDate(solicitacao.previsao_desejada)} />
            <InfoItem label="Previsão de entrega" value={formatDate(solicitacao.previsao_entrega)} />
            <InfoItem label="Atualizado em" value={formatDate(solicitacao.updated_at)} />
          </div>

          <InfoItem label="Descrição do item" value={solicitacao.descricao} />
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
  const [prioridadeFiltro, setPrioridadeFiltro] = useState('todas')
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
  const publicSearch = codigoBusca.trim().toLowerCase()
  const filteredSolicitacoesPublicas = useMemo(() => {
    const filteredBySearch = publicSearch
      ? solicitacoesPublicas.filter((solicitacao) =>
        [
          solicitacao.codigo,
          solicitacao.descricao,
          solicitacao.solicitante,
          solicitacao.centro_custo
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(publicSearch))
      )
      : solicitacoesPublicas

    const filtered = prioridadeFiltro === 'todas'
      ? filteredBySearch
      : filteredBySearch.filter((solicitacao) => solicitacao.prioridade === prioridadeFiltro)

    return [...filtered].sort((a, b) => {
      const direction = publicSortConfig.direction === 'asc' ? 1 : -1
      const sortDiff = compareSolicitacaoByKey(a, b, publicSortConfig.key)
      if (sortDiff !== 0) return sortDiff * direction

      return String(b.codigo || '').localeCompare(String(a.codigo || ''), 'pt-BR', {
        numeric: true
      })
    })
  }, [prioridadeFiltro, publicSearch, publicSortConfig, solicitacoesPublicas])

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
          solicitacao.descricao,
          solicitacao.solicitante
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
              src="/ige-supergesso.png"
              alt="IGE Supergesso"
              width={150}
              height={90}
              className="h-auto w-32 sm:w-[150px]"
              priority
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
            <form onSubmit={handleSearchStatus} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
              <Input
                value={codigoBusca}
                onChange={(event) => {
                  setCodigoBusca(event.target.value)
                  setPublicCurrentPage(1)
                }}
                placeholder="Busque por código, produto ou solicitante"
              />
              <Select
                value={prioridadeFiltro}
                onValueChange={(value) => {
                  setPrioridadeFiltro(value)
                  setPublicCurrentPage(1)
                }}
              >
                <SelectTrigger aria-label="Filtrar por prioridade" className="w-full">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas prioridades</SelectItem>
                  {SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isSearching} className="w-full sm:w-auto">
                Buscar
              </Button>
            </form>

            {statusResult && (
              <div className="space-y-3 rounded-xl border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold tabular-nums">{statusResult.codigo}</p>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]" title={statusResult.descricao || '-'}>
                      {statusResult.descricao}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <SolicitacaoStatusBadge value={statusResult.status_geral} />
                    {statusResultSituacao?.label && (
                      <span
                        className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${statusResultSituacao.className}`}
                        title={statusResultSituacao.label}
                      >
                        {statusResultSituacao.label}
                      </span>
                    )}
                  </div>
                </div>

                <StatusGrid solicitacao={statusResult} />

                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <span className="truncate" title={`Solicitante: ${statusResult.solicitante || '-'}`}>
                    Solicitante: {statusResult.solicitante || '-'}
                  </span>
                  <span className="truncate" title={`Centro: ${statusResult.centro_custo || '-'}`}>
                    Centro: {statusResult.centro_custo || '-'}
                  </span>
                  <span className="truncate" title={`Quantidade: ${statusResult.quantidade || '-'}`}>
                    Quantidade: {statusResult.quantidade || '-'}
                  </span>
                  <span className="truncate" title={`Previsão desejada: ${formatDate(statusResult.previsao_desejada)}`}>
                    Previsão desejada: {formatDate(statusResult.previsao_desejada)}
                  </span>
                  <span className="truncate" title={`Previsão de entrega: ${formatDate(statusResult.previsao_entrega)}`}>
                    Previsão de entrega: {formatDate(statusResult.previsao_entrega)}
                  </span>
                  <span className="truncate" title={`Atualizado em: ${formatDate(statusResult.updated_at)}`}>
                    Atualizado em: {formatDate(statusResult.updated_at)}
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
          <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-3xl sm:rounded-lg sm:p-6">
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
    </main>
  )
}
