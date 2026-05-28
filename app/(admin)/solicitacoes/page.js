'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, Plus, ShoppingCart } from 'lucide-react'

import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingState } from '@/components/ui/spinner'
import { SolicitacaoCadastrosDialog } from '@/components/solicitacoes/SolicitacaoCadastrosDialog'
import { SolicitacaoCard } from '@/components/solicitacoes/SolicitacaoCard'
import { SolicitacaoDetailsDialog } from '@/components/solicitacoes/SolicitacaoDetailsDialog'
import { SolicitacaoFilters } from '@/components/solicitacoes/SolicitacaoFilters'
import {
  SolicitacaoForm,
  defaultSolicitacaoForm
} from '@/components/solicitacoes/SolicitacaoForm'
import { SolicitacaoTable } from '@/components/solicitacoes/SolicitacaoTable'
import { getUserMessage } from '@/lib/user-messages'
import { downloadSolicitacoesExcel } from '@/lib/excel'
import { getLocalDateTime } from '@/lib/date-utils'

function isAtrasada(solicitacao) {
  const dateValue = solicitacao.previsao_entrega || solicitacao.previsao_desejada
  if (!dateValue) return false

  const status = solicitacao.status_geral
  if (status === 'concluida' || status === 'cancelada' || status === 'entregue') {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetTime = getLocalDateTime(dateValue)
  return targetTime !== null && targetTime < today.getTime()
}

function formatCurrency(value) {
  const number = Number(value || 0)

  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export default function SolicitacoesPage() {
  const {
    solicitacoesCompra,
    solicitantesCompra,
    centrosCusto,
    produtos,
    updateSolicitacao,
    addSolicitacao,
    deleteSolicitacao,
    addSolicitante,
    updateSolicitante,
    deleteSolicitante,
    addCentroCusto,
    updateCentroCusto,
    deleteCentroCusto,
    entradaProduto,
    isLoaded
  } = useData()

  const [filters, setFilters] = useState({
    search: '',
    status: 'todos',
    prioridade: 'todas'
  })
  const [selectedSolicitacao, setSelectedSolicitacao] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [cadastrosOpen, setCadastrosOpen] = useState(false)
  const [newPedidoOpen, setNewPedidoOpen] = useState(false)
  const [newPedidoForm, setNewPedidoForm] = useState(defaultSolicitacaoForm)
  const [isSubmittingNewPedido, setIsSubmittingNewPedido] = useState(false)

  const filteredSolicitacoes = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return solicitacoesCompra.filter((solicitacao) => {
      const matchesSearch =
        !search ||
        [
          solicitacao.codigo,
          solicitacao.descricao,
          solicitacao.solicitante,
          solicitacao.centro_custo
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))

      const hiddenStatus = {
        exceto_concluidas: ['concluida'],
        exceto_canceladas: ['cancelada'],
        exceto_concluidas_canceladas: ['concluida', 'cancelada']
      }[filters.status] || []
      const matchesStatus =
        filters.status === 'todos' ||
        (hiddenStatus.length > 0
          ? !hiddenStatus.includes(solicitacao.status_geral)
          : solicitacao.status_geral === filters.status)

      const matchesPrioridade =
        filters.prioridade === 'todas' ||
        solicitacao.prioridade === filters.prioridade

      return matchesSearch && matchesStatus && matchesPrioridade
    })
  }, [filters, solicitacoesCompra])

  const summary = useMemo(() => {
    const abertas = solicitacoesCompra.filter(
      (item) => !['concluida', 'cancelada'].includes(item.status_geral)
    )
    const atrasadas = solicitacoesCompra.filter(isAtrasada)
    const urgentes = solicitacoesCompra.filter(
      (item) => item.prioridade === 'urgente' && !['concluida', 'cancelada'].includes(item.status_geral)
    )
    const valorAberto = abertas.reduce(
      (acc, item) => acc + Number(item.valor_total || 0),
      0
    )

    return {
      total: solicitacoesCompra.length,
      abertas: abertas.length,
      atrasadas: atrasadas.length,
      urgentes: urgentes.length,
      valorAberto
    }
  }, [solicitacoesCompra])

  const openDetails = (solicitacao) => {
    setSelectedSolicitacao(solicitacao)
    setDetailsOpen(true)
  }

  const handleEntradaEstoque = async (solicitacao) => {
    if (!solicitacao?.produto_id) {
      toast.error('Vincule um produto do inventario antes de gerar a entrada.')
      return
    }

    try {
      await entradaProduto(
        solicitacao.produto_id,
        Number(solicitacao.quantidade || 1),
        `Entrada da solicitação ${solicitacao.codigo || solicitacao.id}`
      )
      await updateSolicitacao(solicitacao.id, {
        status_geral: 'concluida',
        status_transporte: 'entregue'
      })
      toast.success('Entrada de estoque gerada com sucesso!')
      setDetailsOpen(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível gerar a entrada.'))
    }
  }

  const handleDownloadExcel = () => {
    const date = new Date().toISOString().slice(0, 10)
    downloadSolicitacoesExcel(filteredSolicitacoes, `solicitacoes-${date}.xlsx`)
  }

  const handleTogglePublic = async (solicitacao, visivelPublico) => {
    try {
      await updateSolicitacao(solicitacao.id, {
        visivel_publico: visivelPublico ? 1 : 0
      })
      toast.success(
        visivelPublico
          ? 'Solicitação visível no público.'
          : 'Solicitação oculta do público.'
      )
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível alterar a visibilidade pública.'))
    }
  }

  const handleNewPedidoOpenChange = (open) => {
    setNewPedidoOpen(open)

    if (!open) {
      setNewPedidoForm(defaultSolicitacaoForm)
    }
  }

  const handleNewPedidoSubmit = async (event) => {
    event.preventDefault()
    setIsSubmittingNewPedido(true)

    try {
      await addSolicitacao(newPedidoForm)
      toast.success('Solicitação criada com sucesso!')
      handleNewPedidoOpenChange(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível criar a solicitação.'))
    } finally {
      setIsSubmittingNewPedido(false)
    }
  }

  if (!isLoaded) {
    return <LoadingState className="min-h-[60vh]" />
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 sm:gap-6 sm:pb-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl">
            <ShoppingCart className="h-7 w-7 text-primary" />
            Solicitações de Compra
          </h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Button className="w-full" onClick={() => setNewPedidoOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo pedido
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={filteredSolicitacoes.length === 0}
          >
            <Download className="h-4 w-4" />
            Baixar XLSX
          </Button>
          <Button className="w-full" variant="outline" onClick={() => setCadastrosOpen(true)}>
            Cadastros
          </Button>
          <Button asChild className="w-full" variant="outline">
            <a href="/solicitar" target="_blank" rel="noreferrer">
              Abrir formulário público
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SolicitacaoCard label="Total" value={summary.total} />
        <SolicitacaoCard label="Abertas" value={summary.abertas} />
        <SolicitacaoCard label="Urgentes" value={summary.urgentes} tone="warning" />
        <SolicitacaoCard label="Atrasadas" value={summary.atrasadas} tone="danger" />
        <SolicitacaoCard label="Valor em aberto" value={formatCurrency(summary.valorAberto)} />
      </div>

      <SolicitacaoFilters filters={filters} setFilters={setFilters} />

      {solicitacoesCompra.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="mb-4 h-12 w-12 text-primary/50" />
            <p className="text-muted-foreground">
              Nenhuma solicitação de compra cadastrada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <SolicitacaoTable
          solicitacoes={filteredSolicitacoes}
          onOpen={openDetails}
          onTogglePublic={handleTogglePublic}
        />
      )}

      <SolicitacaoDetailsDialog
        solicitacao={selectedSolicitacao}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={updateSolicitacao}
        onDelete={deleteSolicitacao}
        onEntradaEstoque={handleEntradaEstoque}
        produtos={produtos}
        solicitantes={solicitantesCompra}
        centrosCusto={centrosCusto}
      />

      <Dialog open={newPedidoOpen} onOpenChange={handleNewPedidoOpenChange}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-3xl sm:rounded-lg sm:p-6">
          <DialogHeader>
            <DialogTitle>Novo pedido</DialogTitle>
          </DialogHeader>

          <SolicitacaoForm
            form={newPedidoForm}
            setForm={setNewPedidoForm}
            onSubmit={handleNewPedidoSubmit}
            submitLabel="Criar solicitação"
            isSubmitting={isSubmittingNewPedido}
            mode="admin"
            showSections
            sectionLayout="tabs"
            onCancel={() => handleNewPedidoOpenChange(false)}
            produtos={produtos}
            solicitantes={solicitantesCompra}
            centrosCusto={centrosCusto}
          />
        </DialogContent>
      </Dialog>

      <SolicitacaoCadastrosDialog
        open={cadastrosOpen}
        onOpenChange={setCadastrosOpen}
        solicitantes={solicitantesCompra}
        centrosCusto={centrosCusto}
        onAddSolicitante={addSolicitante}
        onUpdateSolicitante={updateSolicitante}
        onDeleteSolicitante={deleteSolicitante}
        onAddCentroCusto={addCentroCusto}
        onUpdateCentroCusto={updateCentroCusto}
        onDeleteCentroCusto={deleteCentroCusto}
      />
    </div>
  )
}
