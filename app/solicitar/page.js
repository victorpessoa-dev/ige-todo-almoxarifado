'use client'

import { useEffect, useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { getUserMessage } from '@/lib/user-messages'
import { SolicitacaoStatusBadge } from '@/components/solicitacoes/SolicitacaoStatusBadge'
import {
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'
import { formatDateBR } from '@/lib/date-utils'

function formatDate(value) {
  return formatDateBR(value)
}

function getPrevisaoDate(solicitacao) {
  return solicitacao.previsao_entrega || solicitacao.previsao_desejada
}

function DetailStatus({ label, value, options }) {
  const option = getSolicitacaoOption(options, value)

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{option.label}</p>
    </div>
  )
}

function StatusGrid({ solicitacao }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <DetailStatus
        label="Cotacao"
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
      <p className="mt-1 break-words text-sm font-medium">{value || '-'}</p>
    </div>
  )
}

function SolicitacaoPublicTable({ solicitacoes, onOpen }) {
  if (solicitacoes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhuma solicitacao cadastrada ainda.
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
              className="rounded-xl border bg-background p-4 text-left shadow-sm transition hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold tabular-nums">{solicitacao.codigo}</p>
                  <p className="mt-1 line-clamp-2 text-sm">{solicitacao.descricao}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {solicitacao.solicitante || '-'}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {solicitacao.centro_custo || '-'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
                {situacao.label && (
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                    {situacao.label}
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Previsao: {formatDate(getPrevisaoDate(solicitacao))}
              </p>
            </button>
          )
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 px-4">Cod.</TableHead>
              <TableHead className="h-12 px-4">Produto</TableHead>
              <TableHead className="h-12 px-4">Solicitante</TableHead>
              <TableHead className="h-12 px-4">Centro</TableHead>
              <TableHead className="h-12 px-4">Prioridade</TableHead>
              <TableHead className="h-12 px-4">Situacao</TableHead>
              <TableHead className="h-12 px-4">Previsao</TableHead>
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
                  <TableCell className="px-4 py-3 font-semibold tabular-nums">
                    {solicitacao.codigo}
                  </TableCell>
                  <TableCell className="max-w-[420px] px-4 py-3">
                    <p className="truncate font-medium">{solicitacao.descricao}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">{solicitacao.solicitante || '-'}</TableCell>
                  <TableCell className="max-w-[220px] px-4 py-3">
                    <p className="truncate" title={solicitacao.centro_custo || '-'}>
                      {solicitacao.centro_custo || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {situacao.label ? (
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                        {situacao.label}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">{formatDate(getPrevisaoDate(solicitacao))}</TableCell>
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
          <DialogTitle className="line-clamp-3 text-left text-base sm:text-lg">
            {solicitacao.codigo} - {solicitacao.descricao}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SolicitacaoStatusBadge value={solicitacao.status_geral} />
            <SolicitacaoStatusBadge type="prioridade" value={solicitacao.prioridade} />
            {situacao.label && (
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                {situacao.label}
              </span>
            )}
          </div>

          <StatusGrid solicitacao={solicitacao} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Solicitante" value={solicitacao.solicitante} />
            <InfoItem label="Centro de custo" value={solicitacao.centro_custo} />
            <InfoItem label="Quantidade" value={solicitacao.quantidade} />
            <InfoItem label="Previsao desejada" value={formatDate(solicitacao.previsao_desejada)} />
            <InfoItem label="Previsao de entrega" value={formatDate(solicitacao.previsao_entrega)} />
            <InfoItem label="Atualizado em" value={formatDate(solicitacao.updated_at)} />
          </div>

          <InfoItem label="Descricao do item" value={solicitacao.descricao} />
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
  const [statusResult, setStatusResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [pedidoDialogOpen, setPedidoDialogOpen] = useState(false)
  const [selectedPublicSolicitacao, setSelectedPublicSolicitacao] = useState(null)
  const statusResultSituacao = statusResult
    ? getSolicitacaoSituacao(statusResult)
    : null
  const publicSearch = codigoBusca.trim().toLowerCase()
  const filteredSolicitacoesPublicas = publicSearch
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

  const loadPublicSolicitacoes = async () => {
    setIsLoadingSolicitacoes(true)

    try {
      const data = await listPublicSolicitacoesStatus()
      setSolicitacoesPublicas(data)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel carregar os andamentos.'))
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
        toast.error(getUserMessage(error, 'Nao foi possivel carregar os cadastros.'))
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
      if (result?.codigo) {
        setCodigoBusca(result.codigo)
      }
      setSubmitted(true)
      setForm(defaultSolicitacaoForm)
      setPedidoDialogOpen(false)
      await loadPublicSolicitacoes()
      toast.success('Solicitacao enviada com sucesso!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel enviar a solicitacao.'))
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
        throw new Error('Nenhuma solicitacao encontrada.')
      }

      setStatusResult(null)
    } catch (error) {
      setStatusResult(null)
      toast.error(getUserMessage(error, 'Nao foi possivel consultar a solicitacao.'))
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
                Solicitacao de Compra
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie pedidos e acompanhe o andamento pelo codigo da solicitacao.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            <Button className="w-full lg:w-auto" onClick={() => setPedidoDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Fazer pedido
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
                <p>Sua solicitacao foi registrada.</p>
                {createdSolicitacao?.codigo ? (
                  <p className="font-semibold">
                    Codigo para acompanhamento: {createdSolicitacao.codigo}
                  </p>
                ) : (
                  <p>O acompanhamento sera feito pelo setor administrativo.</p>
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
            <form onSubmit={handleSearchStatus} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={codigoBusca}
                onChange={(event) => setCodigoBusca(event.target.value)}
                placeholder="Busque por codigo, produto ou solicitante"
              />
              <Button type="submit" disabled={isSearching} className="w-full sm:w-auto">
                Buscar
              </Button>
            </form>

            {statusResult && (
              <div className="space-y-3 rounded-xl border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">{statusResult.codigo}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {statusResult.descricao}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <SolicitacaoStatusBadge value={statusResult.status_geral} />
                    {statusResultSituacao?.label && (
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusResultSituacao.className}`}>
                        {statusResultSituacao.label}
                      </span>
                    )}
                  </div>
                </div>

                <StatusGrid solicitacao={statusResult} />

                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <span>Solicitante: {statusResult.solicitante || '-'}</span>
                  <span>Centro: {statusResult.centro_custo || '-'}</span>
                  <span>Quantidade: {statusResult.quantidade || '-'}</span>
                  <span>Previsao desejada: {formatDate(statusResult.previsao_desejada)}</span>
                  <span>Previsao de entrega: {formatDate(statusResult.previsao_entrega)}</span>
                  <span>Atualizado em: {formatDate(statusResult.updated_at)}</span>
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
                solicitacoes={filteredSolicitacoesPublicas}
                onOpen={setSelectedPublicSolicitacao}
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
                Ainda nao ha solicitantes ou centros de custo ativos cadastrados. Entre em contato com o administrativo.
              </div>
            ) : (
              <SolicitacaoForm
                form={form}
                setForm={setForm}
                onSubmit={handleSubmit}
                submitLabel="Enviar solicitacao"
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
