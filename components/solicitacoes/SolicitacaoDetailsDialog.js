'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { toast } from '@/lib/notifications/toast'
import { Copy } from 'lucide-react'
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
import { SolicitacaoStatusBadge } from './SolicitacaoStatusBadge'
import { getUserMessage } from '@/lib/messaging/user-messages'
import {
  formatCentroCustoLabel,
  formatSolicitacaoItem,
  getSolicitacaoCentroCusto,
  getSolicitacaoSolicitante
} from '@/lib/solicitacoes/format'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  getSolicitacaoSituacao,
  getSolicitacaoStatusColor
} from '@/constants/solicitacoes-config'
import { formatDateBR, getTodayDateInputValue } from '@/lib/date/date-utils'
import {
  buildSolicitacaoDetailsForm,
  buildSolicitacaoDetailsPayload,
  completeSolicitacaoMoneyFields,
  formatSolicitacaoDecimalInput,
  parseSolicitacaoDecimal
} from '@/lib/solicitacoes/details-form'

/**
 * Dialog de detalhes e edição de solicitações de compra.
 *
 * Exibe o histórico operacional da solicitação e permite atualizar status,
 * valores, previsão e vínculos sem sair da listagem administrativa.
 */

function shouldShowSituacaoBadge(solicitacao, situacao) {
  if (!situacao?.label) return false

  const statusOption = SOLICITACAO_STATUS_GERAL_OPTIONS.find(
    (option) => option.value === solicitacao?.status_geral
  )

  return situacao.label !== statusOption?.label
}

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
  // Evita exibir uma atualizacao artificial quando o registro acabou de ser criado.
  if (updatedMinute === createdMinute) return '-'

  return formatDate(updatedAt)
}

function formatCurrency(value) {
  const number = parseSolicitacaoDecimal(value)
  if (!number) return '-'

  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
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

function CopyableText({ value }) {
  if (!value) return '-'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      toast.success('Descrição copiada!')
    } catch {
      toast.error('Não foi possível copiar a descrição.')
    }
  }

  return (
    <span className="flex min-w-0 items-start gap-2">
      <span className="min-w-0 flex-1 whitespace-pre-line break-words">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        className="size-7 shrink-0 p-0"
        aria-label="Copiar descrição do item"
        title="Copiar descrição"
        onClick={handleCopy}
      >
        <Copy className="size-4" />
      </Button>
    </span>
  )
}
function Field({ label, children }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
      <label className="block truncate text-xs font-medium uppercase tracking-wide text-muted-foreground" title={label}>{label}</label>
      <div className="mt-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

function getStatusLabel(status) {
  return (
    SOLICITACAO_STATUS_GERAL_OPTIONS.find((option) => option.value === status)?.label ||
    SOLICITACAO_STATUS_GERAL_OPTIONS[0]?.label ||
    '-'
  )
}

function getCentroCustoLabel(centroCusto) {
  return formatCentroCustoLabel(centroCusto)
}

function getSolicitanteCentroCusto(solicitante, centrosCusto) {
  if (!solicitante?.centro_custo_id) return null

  return (
    centrosCusto.find((item) => item.id === solicitante.centro_custo_id) ||
    solicitante.centros_custo ||
    null
  )
}

const buildFormFromSolicitacao = buildSolicitacaoDetailsForm
const buildPayload = buildSolicitacaoDetailsPayload
const completeMoneyFields = completeSolicitacaoMoneyFields
const formatDecimalInput = formatSolicitacaoDecimalInput

function StatusTimeline({ status }) {
  const steps = SOLICITACAO_STATUS_GERAL_OPTIONS.filter(
    (option) => option.value !== 'cancelada'
  )

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
                    animate={{ backgroundColor: reached ? currentColor : neutralColor, borderColor: current ? 'var(--card)' : (reached ? currentColor : neutralColor), boxShadow: current ? '0 0 0 2px var(--timeline-color)' : '0 0 0 0 transparent', scale: current ? 1.5 : 0.8 }}
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
                    animate={{ backgroundColor: reached ? currentColor : neutralColor, borderColor: current ? 'var(--card)' : (reached ? currentColor : neutralColor), boxShadow: current ? '0 0 0 2px var(--timeline-color)' : '0 0 0 0 transparent', scale: current ? 1.5 : 0.8 }}
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
  const [form, setForm] = useState(() => buildFormFromSolicitacao(solicitacao))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const updateField = (field, value) => {
    setForm((prev) => {
      const nextForm = {
        ...prev,
        [field]: value
      }

      if (field === 'status_geral' && value === 'concluida' && !nextForm.previsao_entrega) {
        // Ao concluir sem previsão preenchida, usamos a data atual como marco
        // operacional de fechamento da solicitação.
        nextForm.previsao_entrega = getTodayDateInputValue()
      }

      if (field === 'solicitante_id') {
        const solicitante = solicitantes.find((item) => item.id === value)
        nextForm.solicitante = solicitante?.nome || ''
        nextForm.solicitante_nome = solicitante?.nome || ''

        const centroCusto = getSolicitanteCentroCusto(solicitante, centrosCusto)
        if (centroCusto) {
          // O centro de custo cadastrado no solicitante prevalece para reduzir
          // erro manual no preenchimento administrativo.
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
      const updatedSolicitacao = await onUpdate(solicitacao.id, buildPayload(form))
      setForm(buildFormFromSolicitacao(updatedSolicitacao || solicitacao))
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
      const updatedSolicitacao = await onUpdate(solicitacao.id, updates)
      setForm(buildFormFromSolicitacao(updatedSolicitacao || { ...solicitacao, ...updates }))
      toast.success(message)
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
  const showSituacaoBadge = shouldShowSituacaoBadge(solicitacao, situacao)
  const dialogTitle = [
    solicitacao?.codigo || 'Solicitação',
    formatSolicitacaoItem(solicitacao)
  ].filter(Boolean).join(' - ')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="ige-scrollbar h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-6xl sm:rounded-lg sm:p-6">
          <div className="min-w-0 space-y-4">
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
                <Button
                  type="button"
                  className="col-span-2 sm:col-span-1"
                  onClick={() => {
                    setForm(buildFormFromSolicitacao(solicitacao))
                    setIsEditing(true)
                  }}
                >
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="relative min-w-0 pl-8 sm:pl-0">
          <div className="absolute left-0 top-0 h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] w-5 sm:hidden">
            <StatusTimeline status={solicitacao?.status_geral || 'nova'} />
          </div>
          <div className="mb-6 hidden pt-2 sm:block sm:px-8">
            <StatusTimeline status={solicitacao?.status_geral || 'nova'} />
          </div>

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
              {showSituacaoBadge && (
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
                  <InfoItem label="Solicitante" value={getSolicitacaoSolicitante(solicitacao)} />
                  <InfoItem label="Centro de custo" value={getSolicitacaoCentroCusto(solicitacao)} />
                  <InfoItem label="Quantidade" value={solicitacao?.quantidade} />
                </div>

                <InfoItem label="Nome do item" value={solicitacao?.nome_item} />
                <InfoItem label="Descrição do item" value={<CopyableText value={solicitacao?.descricao} />} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="Aplicação" value={solicitacao?.aplicacoes} />
                  <InfoItem
                    label="Link de referência"
                    value={<CopyableReferenceLink href={solicitacao?.link_referencia} />}
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Data da solicitação" value={formatDate(getSolicitacaoCreatedAt(solicitacao))} />
                  <InfoItem label="Atualizado em" value={getUpdatedAtDisplay(solicitacao)} />
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
                          <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title="Sem vínculo">
                            Sem vínculo
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
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Status" value={getStatusLabel(solicitacao?.status_geral)} />
                  <InfoItem label="Data da solicitação" value={formatDate(getSolicitacaoCreatedAt(solicitacao))} />
                  <InfoItem label="Previsão desejada" value={formatDate(solicitacao?.previsao_desejada)} />
                  <InfoItem label="Previsão de entrega" value={formatDate(solicitacao?.previsao_entrega)} />
                  <InfoItem label="Atualizado em" value={getUpdatedAtDisplay(solicitacao)} />
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
                    { status_geral: 'em_cotacao' },
                    'Solicitação enviada para cotação!'
                  )
                }
              >
                Iniciar cotação
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  quickUpdate(
                    { status_geral: 'transporte' },
                    'Solicitação enviada para transporte!'
                  )
                }
              >
                Marcar transporte
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  quickUpdate(
                    {
                      status_geral: 'concluida',
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
                      status_geral: 'cancelada'
                    },
                    'Solicitação cancelada!'
                  )
                }
              >
                Cancelar solicitação
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
        </div>
          </div>
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
