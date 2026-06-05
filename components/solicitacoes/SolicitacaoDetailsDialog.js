'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { defaultSolicitacaoForm } from './SolicitacaoForm'
import { SolicitacaoStatusBadge } from './SolicitacaoStatusBadge'
import { getUserMessage } from '@/lib/user-messages'
import { formatSolicitacaoItem } from '@/lib/solicitacoes-format'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS,
  getSolicitacaoStatusDefaults,
  getSolicitacaoOption,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'
import { formatDateBR, getTodayDateInputValue, toDateInputValue } from '@/lib/date-utils'

function toDateInput(value) {
  return toDateInputValue(value)
}

function parseDecimalValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value

  const cleanValue = String(value).trim().replace(/[^\d,.-]/g, '')
  const normalizedValue = cleanValue.includes(',')
    ? cleanValue.replace(/\./g, '').replace(',', '.')
    : cleanValue
  const number = Number(normalizedValue)

  return Number.isFinite(number) ? number : null
}

function formatDecimalInput(value) {
  const number = parseDecimalValue(value)
  if (!number) return ''

  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function completeMoneyFields(form, changedField) {
  const quantidade = Number(form.quantidade || 0)
  const valorUnitario = parseDecimalValue(form.valor_unitario)
  const valorTotal = parseDecimalValue(form.valor_total)
  const nextForm = { ...form }

  if (quantidade <= 0) return nextForm

  if (changedField === 'valor_unitario') {
    nextForm.valor_total = valorUnitario > 0
      ? formatDecimalInput(quantidade * valorUnitario)
      : ''
    return nextForm
  }

  if (changedField === 'valor_total') {
    nextForm.valor_unitario = valorTotal > 0
      ? formatDecimalInput(valorTotal / quantidade)
      : ''
    return nextForm
  }

  if (changedField === 'quantidade') {
    if (valorUnitario > 0) {
      nextForm.valor_total = formatDecimalInput(quantidade * valorUnitario)
    } else if (valorTotal > 0) {
      nextForm.valor_unitario = formatDecimalInput(valorTotal / quantidade)
    }
    return nextForm
  }

  if (valorUnitario > 0 && !valorTotal) {
    nextForm.valor_total = formatDecimalInput(quantidade * valorUnitario)
  }

  if (valorTotal > 0 && !valorUnitario) {
    nextForm.valor_unitario = formatDecimalInput(valorTotal / quantidade)
  }

  return nextForm
}

function formatDate(value) {
  return formatDateBR(value)
}

function formatCurrency(value) {
  const number = parseDecimalValue(value)
  if (!number) return '-'

  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="truncate text-xs uppercase text-muted-foreground" title={label}>{label}</p>
      <p className="mt-1 min-w-0 whitespace-pre-line break-words text-sm font-medium [overflow-wrap:anywhere]">{value || '-'}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="truncate text-sm font-medium" title={label}>{label}</label>
      {children}
    </div>
  )
}

function StatusItem({ label, value, options }) {
  const option = getSolicitacaoOption(options, value)

  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="truncate text-xs uppercase text-muted-foreground" title={label}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold" title={option.label}>{option.label}</p>
    </div>
  )
}

function getCentroCustoLabel(centroCusto) {
  if (!centroCusto) return ''
  return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')
}

function getSolicitanteCentroCusto(solicitante, centrosCusto) {
  if (!solicitante?.centro_custo_id) return null

  return (
    centrosCusto.find((item) => item.id === solicitante.centro_custo_id) ||
    solicitante.centros_custo ||
    null
  )
}

function buildFormFromSolicitacao(solicitacao) {
  return {
    ...defaultSolicitacaoForm,
    nome_item: solicitacao?.nome_item || '',
    descricao: solicitacao?.descricao || '',
    quantidade: solicitacao?.quantidade || 1,
    prioridade: solicitacao?.prioridade || 'media',
    previsao_desejada: toDateInput(solicitacao?.previsao_desejada),
    centro_custo_id: solicitacao?.centro_custo_id || '',
    centro_custo: solicitacao?.centro_custo || '',
    centro_custo_nome: solicitacao?.centro_custo || '',
    aplicacoes: solicitacao?.aplicacoes || '',
    link_referencia: solicitacao?.link_referencia || '',
    fornecedor_nome: solicitacao?.fornecedor_nome || '',
    fornecedor_contato: solicitacao?.fornecedor_contato || '',
    solicitante_id: solicitacao?.solicitante_id || '',
    solicitante: solicitacao?.solicitante || '',
    solicitante_nome: solicitacao?.solicitante || '',
    status_geral: solicitacao?.status_geral || 'nova',
    valor_unitario: formatDecimalInput(solicitacao?.valor_unitario),
    valor_total: formatDecimalInput(solicitacao?.valor_total),
    previsao_entrega: toDateInput(solicitacao?.previsao_entrega),
    status_cotacao: solicitacao?.status_cotacao || 'nao_iniciado',
    status_pedido: solicitacao?.status_pedido || 'nao_digitado',
    status_transporte: solicitacao?.status_transporte || 'producao_separacao',
    produto_id: solicitacao?.produto_id || ''
  }
}

function buildPayload(form) {
  const completedForm = completeMoneyFields(form)

  return {
    nome_item: completedForm.nome_item,
    descricao: completedForm.descricao,
    quantidade: Number(completedForm.quantidade || 0),
    prioridade: completedForm.prioridade,
    previsao_desejada: completedForm.previsao_desejada || null,
    centro_custo_id: completedForm.centro_custo_id || null,
    centro_custo: completedForm.centro_custo || null,
    centro_custo_nome: completedForm.centro_custo_nome || completedForm.centro_custo || null,
    aplicacoes: completedForm.aplicacoes || null,
    link_referencia: completedForm.link_referencia || null,
    fornecedor_nome: completedForm.fornecedor_nome?.trim?.() || null,
    fornecedor_contato: completedForm.fornecedor_contato?.trim?.() || null,
    solicitante_id: completedForm.solicitante_id || null,
    solicitante: completedForm.solicitante,
    solicitante_nome: completedForm.solicitante_nome || completedForm.solicitante,
    status_geral: completedForm.status_geral,
    valor_unitario: parseDecimalValue(completedForm.valor_unitario),
    valor_total: parseDecimalValue(completedForm.valor_total),
    previsao_entrega: completedForm.previsao_entrega || null,
    status_cotacao: completedForm.status_cotacao,
    status_pedido: completedForm.status_pedido,
    status_transporte: completedForm.status_transporte,
    produto_id: completedForm.produto_id || null
  }
}

export function SolicitacaoDetailsDialog({
  solicitacao,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onEntradaEstoque,
  produtos,
  solicitantes,
  centrosCusto
}) {
  const [form, setForm] = useState(defaultSolicitacaoForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (solicitacao) {
      setForm(buildFormFromSolicitacao(solicitacao))
      setIsEditing(false)
    }
  }, [solicitacao])

  const updateField = (field, value) => {
    setForm((prev) => {
      const nextForm = {
        ...prev,
        [field]: value,
        ...(field === 'status_geral' ? getSolicitacaoStatusDefaults(value) : {})
      }

      if (field === 'status_geral' && value === 'concluida' && !nextForm.previsao_entrega) {
        nextForm.previsao_entrega = getTodayDateInputValue()
      }

      if (field === 'solicitante_id') {
        const solicitante = solicitantes.find((item) => item.id === value)
        nextForm.solicitante = solicitante?.nome || ''
        nextForm.solicitante_nome = solicitante?.nome || ''

        const centroCusto = getSolicitanteCentroCusto(solicitante, centrosCusto)
        if (centroCusto) {
          const label = getCentroCustoLabel(centroCusto)
          nextForm.centro_custo_id = centroCusto.id
          nextForm.centro_custo = label
          nextForm.centro_custo_nome = label
        }
      }

      if (field === 'centro_custo_id') {
        const centroCusto = centrosCusto.find((item) => item.id === value)
        const label = getCentroCustoLabel(centroCusto)
        nextForm.centro_custo = label
        nextForm.centro_custo_nome = label
      }

      if (['quantidade', 'valor_unitario', 'valor_total'].includes(field)) {
        return completeMoneyFields(nextForm, field)
      }

      return nextForm
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!solicitacao) return

    setIsSubmitting(true)

    try {
      await onUpdate(solicitacao.id, buildPayload(form))
      toast.success('Solicitação atualizada com sucesso!')
      setIsEditing(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível atualizar a solicitação.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickUpdate = async (updates, message) => {
    if (!solicitacao) return

    try {
      await onUpdate(solicitacao.id, updates)
      toast.success(message)
      onOpenChange(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível atualizar a solicitação.'))
    }
  }

  const handleDelete = async () => {
    if (!solicitacao) return

    try {
      await onDelete(solicitacao.id)
      toast.success('Solicitação excluída com sucesso!')
      setDeleteConfirmOpen(false)
      onOpenChange(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível excluir a solicitação.'))
    }
  }

  const situacao = solicitacao ? getSolicitacaoSituacao(solicitacao) : null
  const dialogTitle = [
    solicitacao?.codigo || 'Solicitacao',
    formatSolicitacaoItem(solicitacao)
  ].filter(Boolean).join(' - ')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-6xl sm:rounded-lg sm:p-6">
          <DialogHeader className="pr-10">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DialogTitle className="min-w-0 line-clamp-3 break-words pr-2 text-left text-base [overflow-wrap:anywhere] sm:text-lg" title={dialogTitle}>
                {dialogTitle}
              </DialogTitle>

            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm(buildFormFromSolicitacao(solicitacao))
                      setIsEditing(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </>
              ) : (
                <Button type="button" className="col-span-2 sm:col-span-1" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
            <TabsTrigger value="resumo" className="px-2 text-xs sm:text-sm">Resumo</TabsTrigger>
            <TabsTrigger value="andamento" className="px-2 text-xs sm:text-sm">Andamento</TabsTrigger>
            <TabsTrigger value="acoes" className="px-2 text-xs sm:text-sm">Ações</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SolicitacaoStatusBadge value={solicitacao?.status_geral} />
              <SolicitacaoStatusBadge
                type="prioridade"
                value={solicitacao?.prioridade}
              />
              {situacao?.label && (
                <span
                  className={`block max-w-full truncate rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}
                  title={situacao.label}
                >
                  {situacao.label}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="grid gap-4">
                <Field label="Nome do item">
                  <Input
                    className="min-w-0 truncate"
                    value={form.nome_item || ''}
                    onChange={(event) => updateField('nome_item', event.target.value)}
                    required
                  />
                </Field>

                <Field label="Descrição do item">
                  <Textarea
                    className="min-w-0"
                    value={form.descricao}
                    onChange={(event) => updateField('descricao', event.target.value)}
                    rows={4}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Solicitante">
                    <Select
                      value={form.solicitante_id || ''}
                      onValueChange={(value) => updateField('solicitante_id', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {solicitantes.map((solicitante) => (
                          <SelectItem key={solicitante.id} value={solicitante.id}>
                            <span
                              className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                              title={[
                                solicitante.nome,
                                getCentroCustoLabel(getSolicitanteCentroCusto(solicitante, centrosCusto))
                              ].filter(Boolean).join(' - ')}
                            >
                              {[
                                solicitante.nome,
                                getCentroCustoLabel(getSolicitanteCentroCusto(solicitante, centrosCusto))
                              ].filter(Boolean).join(' - ')}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Centro de custo">
                    <Select
                      value={form.centro_custo_id || ''}
                      onValueChange={(value) => updateField('centro_custo_id', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {centrosCusto.map((centroCusto) => (
                          <SelectItem key={centroCusto.id} value={centroCusto.id}>
                            <span
                              className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                              title={getCentroCustoLabel(centroCusto)}
                            >
                              {getCentroCustoLabel(centroCusto)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Quantidade">
                    <Input
                      className="min-w-0"
                      type="number"
                      min={1}
                      value={form.quantidade}
                      onChange={(event) => updateField('quantidade', event.target.value)}
                    />
                  </Field>

                  <Field label="Prioridade">
                    <Select
                      value={form.prioridade}
                      onValueChange={(value) => updateField('prioridade', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Aplicação">
                    <Textarea
                      className="min-w-0"
                      value={form.aplicacoes || ''}
                      onChange={(event) => updateField('aplicacoes', event.target.value)}
                      rows={3}
                    />
                  </Field>

                  <Field label="Link de referência">
                    <Input
                      className="min-w-0 truncate"
                      value={form.link_referencia || ''}
                      onChange={(event) => updateField('link_referencia', event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome do fornecedor">
                    <Input
                      className="min-w-0 truncate"
                      value={form.fornecedor_nome || ''}
                      onChange={(event) => updateField('fornecedor_nome', event.target.value)}
                    />
                  </Field>

                  <Field label="Contato do fornecedor">
                    <Input
                      className="min-w-0 truncate"
                      value={form.fornecedor_contato || ''}
                      onChange={(event) => updateField('fornecedor_contato', event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Código" value={solicitacao?.codigo} />
                  <InfoItem label="Solicitante" value={solicitacao?.solicitante} />
                  <InfoItem label="Centro de custo" value={solicitacao?.centro_custo} />
                  <InfoItem label="Quantidade" value={solicitacao?.quantidade} />
                  <InfoItem label="Data da solicitação" value={formatDate(solicitacao?.data_solicitacao)} />
                  <InfoItem label="Previsão desejada" value={formatDate(solicitacao?.previsao_desejada)} />
                  <InfoItem label="Previsão de entrega" value={formatDate(solicitacao?.previsao_entrega)} />
                  <InfoItem label="Atualizado em" value={formatDate(solicitacao?.updated_at)} />
                </div>

                <InfoItem label="Nome do item" value={solicitacao?.nome_item} />
                <InfoItem label="Descrição do item" value={solicitacao?.descricao} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="Aplicação" value={solicitacao?.aplicacoes} />
                  <InfoItem
                    label="Link de referência"
                    value={
                      solicitacao?.link_referencia ? (
                        <a
                          href={solicitacao.link_referencia}
                          target="_blank"
                          rel="noreferrer"
                          className="break-words text-primary underline-offset-4 [overflow-wrap:anywhere] hover:underline"
                        >
                          {solicitacao.link_referencia}
                        </a>
                      ) : '-'
                    }
                  />
                  <InfoItem label="Fornecedor sugerido" value={solicitacao?.fornecedor_nome} />
                  <InfoItem label="Contato do fornecedor" value={solicitacao?.fornecedor_contato} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="andamento" className="space-y-4">
            {isEditing ? (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Status geral">
                    <Select
                      value={form.status_geral}
                      onValueChange={(value) => updateField('status_geral', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Status da cotação">
                    <Select
                      value={form.status_cotacao}
                      onValueChange={(value) => updateField('status_cotacao', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_COTACAO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Status pedido">
                    <Select
                      value={form.status_pedido}
                      onValueChange={(value) => updateField('status_pedido', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_PEDIDO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Status entrega">
                    <Select
                      value={form.status_transporte}
                      onValueChange={(value) => updateField('status_transporte', value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_TRANSPORTE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                              {option.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Valor unitário">
                    <Input
                      className="min-w-0 truncate"
                      inputMode="decimal"
                      value={form.valor_unitario || ''}
                      onChange={(event) => updateField('valor_unitario', event.target.value)}
                      onBlur={(event) => updateField('valor_unitario', formatDecimalInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Valor total">
                    <Input
                      className="min-w-0 truncate"
                      inputMode="decimal"
                      value={form.valor_total || ''}
                      onChange={(event) => updateField('valor_total', event.target.value)}
                      onBlur={(event) => updateField('valor_total', formatDecimalInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Previsão desejada">
                    <Input className="min-w-0" type="date" value={form.previsao_desejada || ''} onChange={(event) => updateField('previsao_desejada', event.target.value)} />
                  </Field>
                  <Field label="Previsão de entrega">
                    <Input className="min-w-0" type="date" value={form.previsao_entrega || ''} onChange={(event) => updateField('previsao_entrega', event.target.value)} />
                  </Field>
                  <Field label="Produto vinculado">
                    <Select
                      value={form.produto_id || 'sem_produto'}
                      onValueChange={(value) => updateField('produto_id', value === 'sem_produto' ? '' : value)}
                    >
                      <SelectTrigger className="w-full min-w-0 overflow-hidden">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        <SelectItem value="sem_produto">
                          <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title="Sem vinculo">
                            Sem vinculo
                          </span>
                        </SelectItem>
                        {produtos.map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            <span
                              className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                              title={`${produto.cod} - ${produto.nome}`}
                            >
                              {produto.cod} - {produto.nome}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatusItem
                    label="Cotação"
                    value={solicitacao?.status_cotacao}
                    options={SOLICITACAO_STATUS_COTACAO_OPTIONS}
                  />
                  <StatusItem
                    label="Pedido"
                    value={solicitacao?.status_pedido}
                    options={SOLICITACAO_STATUS_PEDIDO_OPTIONS}
                  />
                  <StatusItem
                    label="Entrega"
                    value={solicitacao?.status_transporte}
                    options={SOLICITACAO_STATUS_TRANSPORTE_OPTIONS}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Valor unitário" value={formatCurrency(solicitacao?.valor_unitario)} />
                  <InfoItem label="Valor total" value={formatCurrency(solicitacao?.valor_total)} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="acoes" className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  quickUpdate(
                    { status_geral: 'aceita', status_pedido: 'pedido_aprovado' },
                    'Pedido aceito!'
                  )
                }
              >
                Aceitar pedido
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  quickUpdate(
                    { status_geral: 'entregue', status_transporte: 'entregue' },
                    'Solicitação marcada como entregue!'
                  )
                }
              >
                Marcar entregue
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  quickUpdate(
                    {
                      status_geral: 'concluida',
                      ...getSolicitacaoStatusDefaults('concluida'),
                      previsao_entrega: solicitacao?.previsao_entrega || getTodayDateInputValue()
                    },
                    'Solicitação concluída!'
                  )
                }
              >
                Concluir
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => onEntradaEstoque?.(solicitacao)}
                disabled={!solicitacao?.produto_id}
              >
                Transformar em entrada
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  quickUpdate(
                    {
                      status_geral: 'cancelada',
                      ...getSolicitacaoStatusDefaults('cancelada')
                    },
                    'Solicitação cancelada!'
                  )
                }
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Excluir solicitação
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o pedido permanentemente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
