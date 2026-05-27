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
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'

function toDateInput(value) {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
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

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
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
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || '-'}</p>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function StatusItem({ label, value, options }) {
  const option = getSolicitacaoOption(options, value)

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{option.label}</p>
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
    descricao: solicitacao?.descricao || '',
    quantidade: solicitacao?.quantidade || 1,
    prioridade: solicitacao?.prioridade || 'media',
    previsao_desejada: toDateInput(solicitacao?.previsao_desejada),
    centro_custo_id: solicitacao?.centro_custo_id || '',
    centro_custo: solicitacao?.centro_custo || '',
    centro_custo_nome: solicitacao?.centro_custo || '',
    aplicacoes: solicitacao?.aplicacoes || '',
    link_referencia: solicitacao?.link_referencia || '',
    solicitante_id: solicitacao?.solicitante_id || '',
    solicitante: solicitacao?.solicitante || '',
    solicitante_nome: solicitacao?.solicitante || '',
    status_geral: solicitacao?.status_geral || 'nova',
    valor_unitario: formatDecimalInput(solicitacao?.valor_unitario),
    valor_total: formatDecimalInput(solicitacao?.valor_total),
    previsao_entrega: toDateInput(solicitacao?.previsao_entrega),
    pedido: solicitacao?.pedido || '',
    nota_fiscal: solicitacao?.nota_fiscal || '',
    status_cotacao: solicitacao?.status_cotacao || 'nao_iniciado',
    status_pedido: solicitacao?.status_pedido || 'nao_digitado',
    status_transporte: solicitacao?.status_transporte || 'producao_separacao',
    produto_id: solicitacao?.produto_id || ''
  }
}

function buildPayload(form) {
  return {
    descricao: form.descricao,
    quantidade: Number(form.quantidade || 0),
    prioridade: form.prioridade,
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    centro_custo: form.centro_custo || null,
    centro_custo_nome: form.centro_custo_nome || form.centro_custo || null,
    aplicacoes: form.aplicacoes || null,
    link_referencia: form.link_referencia || null,
    solicitante_id: form.solicitante_id || null,
    solicitante: form.solicitante,
    solicitante_nome: form.solicitante_nome || form.solicitante,
    status_geral: form.status_geral,
    valor_unitario: parseDecimalValue(form.valor_unitario),
    valor_total: parseDecimalValue(form.valor_total),
    previsao_entrega: form.previsao_entrega || null,
    pedido: form.pedido || null,
    nota_fiscal: form.nota_fiscal || null,
    status_cotacao: form.status_cotacao,
    status_pedido: form.status_pedido,
    status_transporte: form.status_transporte,
    produto_id: form.produto_id || null
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
      const nextForm = { ...prev, [field]: value }

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

      if (field === 'quantidade' || field === 'valor_unitario') {
        const quantidade = Number(field === 'quantidade' ? value : nextForm.quantidade || 0)
        const valorUnitario = parseDecimalValue(
          field === 'valor_unitario' ? value : nextForm.valor_unitario || 0
        )

        nextForm.valor_total =
          quantidade > 0 && valorUnitario > 0
            ? formatDecimalInput(quantidade * valorUnitario)
            : ''
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
      toast.success('Solicitacao atualizada com sucesso!')
      setIsEditing(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel atualizar a solicitacao.'))
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
      toast.error(getUserMessage(error, 'Nao foi possivel atualizar a solicitacao.'))
    }
  }

  const handleDelete = async () => {
    if (!solicitacao) return

    try {
      await onDelete(solicitacao.id)
      toast.success('Solicitacao excluida com sucesso!')
      setDeleteConfirmOpen(false)
      onOpenChange(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel excluir a solicitacao.'))
    }
  }

  const situacao = solicitacao ? getSolicitacaoSituacao(solicitacao) : null
  const dialogTitle = [
    solicitacao?.codigo || 'Solicitacao',
    solicitacao?.descricao
  ].filter(Boolean).join(' - ')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-6xl sm:rounded-lg sm:p-6">
          <DialogHeader className="pr-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <DialogTitle className="line-clamp-3 pr-2 text-left text-base sm:text-lg">
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
            <TabsTrigger value="acoes" className="px-2 text-xs sm:text-sm">Acoes</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SolicitacaoStatusBadge value={solicitacao?.status_geral} />
              <SolicitacaoStatusBadge
                type="prioridade"
                value={solicitacao?.prioridade}
              />
              {situacao?.label && (
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                  {situacao.label}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="grid gap-4">
                <Field label="Descricao do item">
                  <Textarea
                    value={form.descricao}
                    onChange={(event) => updateField('descricao', event.target.value)}
                    rows={4}
                    required
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Solicitante">
                    <Select
                      value={form.solicitante_id || ''}
                      onValueChange={(value) => updateField('solicitante_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {solicitantes.map((solicitante) => (
                          <SelectItem key={solicitante.id} value={solicitante.id}>
                            {[
                              solicitante.nome,
                              getCentroCustoLabel(getSolicitanteCentroCusto(solicitante, centrosCusto))
                            ].filter(Boolean).join(' - ')}
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
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {centrosCusto.map((centroCusto) => (
                          <SelectItem key={centroCusto.id} value={centroCusto.id}>
                            {getCentroCustoLabel(centroCusto)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Quantidade">
                    <Input
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Aplicacoes especificas">
                    <Textarea
                      value={form.aplicacoes || ''}
                      onChange={(event) => updateField('aplicacoes', event.target.value)}
                      rows={3}
                    />
                  </Field>

                  <Field label="Link de referencia">
                    <Input
                      value={form.link_referencia || ''}
                      onChange={(event) => updateField('link_referencia', event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Codigo" value={solicitacao?.codigo} />
                  <InfoItem label="Solicitante" value={solicitacao?.solicitante} />
                  <InfoItem label="Centro de custo" value={solicitacao?.centro_custo} />
                  <InfoItem label="Quantidade" value={solicitacao?.quantidade} />
                  <InfoItem label="Data solicitacao" value={formatDate(solicitacao?.data_solicitacao)} />
                  <InfoItem label="Previsao desejada" value={formatDate(solicitacao?.previsao_desejada)} />
                  <InfoItem label="Previsao entrega" value={formatDate(solicitacao?.previsao_entrega)} />
                  <InfoItem label="Atualizado em" value={formatDate(solicitacao?.updated_at)} />
                </div>

                <InfoItem label="Descricao do item" value={solicitacao?.descricao} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="Aplicacoes especificas" value={solicitacao?.aplicacoes} />
                  <InfoItem
                    label="Link de referencia"
                    value={
                      solicitacao?.link_referencia ? (
                        <a
                          href={solicitacao.link_referencia}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {solicitacao.link_referencia}
                        </a>
                      ) : '-'
                    }
                  />
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Status cotacao">
                    <Select
                      value={form.status_cotacao}
                      onValueChange={(value) => updateField('status_cotacao', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_COTACAO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_PEDIDO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOLICITACAO_STATUS_TRANSPORTE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Pedido">
                    <Input value={form.pedido || ''} onChange={(event) => updateField('pedido', event.target.value)} />
                  </Field>
                  <Field label="Nota fiscal">
                    <Input value={form.nota_fiscal || ''} onChange={(event) => updateField('nota_fiscal', event.target.value)} />
                  </Field>
                  <Field label="Valor unitario">
                    <Input
                      inputMode="decimal"
                      value={form.valor_unitario || ''}
                      onChange={(event) => updateField('valor_unitario', event.target.value)}
                      onBlur={(event) => updateField('valor_unitario', formatDecimalInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Valor total">
                    <Input
                      inputMode="decimal"
                      value={form.valor_total || ''}
                      onChange={(event) => updateField('valor_total', event.target.value)}
                      onBlur={(event) => updateField('valor_total', formatDecimalInput(event.target.value))}
                    />
                  </Field>
                  <Field label="Previsao desejada">
                    <Input type="date" value={form.previsao_desejada || ''} onChange={(event) => updateField('previsao_desejada', event.target.value)} />
                  </Field>
                  <Field label="Previsao entrega">
                    <Input type="date" value={form.previsao_entrega || ''} onChange={(event) => updateField('previsao_entrega', event.target.value)} />
                  </Field>
                  <Field label="Produto vinculado">
                    <Select
                      value={form.produto_id || 'sem_produto'}
                      onValueChange={(value) => updateField('produto_id', value === 'sem_produto' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_produto">Sem vinculo</SelectItem>
                        {produtos.map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.cod} - {produto.nome}
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
                    label="Cotacao"
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
                  <InfoItem label="Pedido" value={solicitacao?.pedido} />
                  <InfoItem label="Nota fiscal" value={solicitacao?.nota_fiscal} />
                  <InfoItem label="Valor unitario" value={formatCurrency(solicitacao?.valor_unitario)} />
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
                    'Solicitacao marcada como entregue!'
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
                    { status_geral: 'concluida', status_transporte: 'entregue_conferido' },
                    'Solicitacao concluida!'
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
                onClick={() => quickUpdate({ status_geral: 'cancelada' }, 'Solicitacao cancelada!')}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Excluir solicitacao
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove o pedido permanentemente e nao pode ser desfeita.
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
