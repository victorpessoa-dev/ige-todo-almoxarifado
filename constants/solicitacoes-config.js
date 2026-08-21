import { toDateInputValue } from '@/lib/date/date-utils'

export const SOLICITACAO_PRIORIDADE_OPTIONS = [
  {
    value: 'baixa',
    label: 'Baixa',
    className: 'border-[#86efac] bg-[#dcfce7] text-[#166534]'
  },
  {
    value: 'media',
    label: 'Média',
    className: 'border-[#93c5fd] bg-[#dbeafe] text-[#1e40af]'
  },
  {
    value: 'alta',
    label: 'Alta',
    className: 'border-[#fb923c] bg-[#ffedd5] text-[#9a3412]'
  },
  {
    value: 'urgente',
    label: 'Urgente',
    className: 'border-[#f87171] bg-[#fee2e2] text-[#991b1b]'
  }
]

export const SOLICITACAO_STATUS_GERAL_OPTIONS = [
  { value: 'nova', label: 'Cotação não iniciada', color: '#0284c7', className: 'border-[#7dd3fc] bg-[#e0f2fe] text-[#075985]' },
  { value: 'em_cotacao', label: 'Em cotação', color: '#9333ea', className: 'border-[#c084fc] bg-[#f3e8ff] text-[#6b21a8]' },
  { value: 'preparando_pedido', label: 'Preparando pedido', color: '#2563eb', className: 'border-[#60a5fa] bg-[#dbeafe] text-[#1d4ed8]' },
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação', color: '#ca8a04', className: 'border-[#facc15] bg-[#fef9c3] text-[#854d0e]' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento', color: '#ea580c', className: 'border-[#fb923c] bg-[#ffedd5] text-[#9a3412]' },
  { value: 'transporte', label: 'Transporte', color: '#4f46e5', className: 'border-[#818cf8] bg-[#e0e7ff] text-[#3730a3]' },
  { value: 'disponivel_retirada', label: 'Disponível para retirada', color: '#0d9488', className: 'border-[#2dd4bf] bg-[#ccfbf1] text-[#115e59]' },
  { value: 'concluida', label: 'Concluída', color: '#15803d', className: 'border-[#22c55e] bg-[#dcfce7] text-[#14532d]' },
  { value: 'cancelada', label: 'Cancelada', color: '#dc2626', className: 'border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]' }
]

export const SOLICITACAO_STATUS_FLOW = SOLICITACAO_STATUS_GERAL_OPTIONS

export const SOLICITACAO_STATUS_DOT_CLASSES = {
  nova: 'bg-[#0284c7]',
  em_cotacao: 'bg-[#9333ea]',
  preparando_pedido: 'bg-[#2563eb]',
  aguardando_aprovacao: 'bg-[#ca8a04]',
  aguardando_pagamento: 'bg-[#ea580c]',
  transporte: 'bg-[#4f46e5]',
  disponivel_retirada: 'bg-[#0d9488]',
  concluida: 'bg-[#15803d]',
  cancelada: 'bg-[#dc2626]'
}

export function getSolicitacaoOption(options, value) {
  return options.find((option) => option.value === value) || options[0]
}

export function getSolicitacaoStatusDotClass(status) {
  const option = getSolicitacaoOption(SOLICITACAO_STATUS_GERAL_OPTIONS, status)

  return SOLICITACAO_STATUS_DOT_CLASSES[option.value] || SOLICITACAO_STATUS_DOT_CLASSES.nova
}

export function getSolicitacaoStatusColor(status) {
  return getSolicitacaoOption(SOLICITACAO_STATUS_GERAL_OPTIONS, status).color
}

export function getSolicitacaoPrioridadeOrder(prioridade) {
  const order = {
    urgente: 0,
    alta: 1,
    media: 2,
    baixa: 3
  }

  return order[prioridade] ?? 99
}

export function isSolicitacaoEncerrada(solicitacao = {}) {
  return solicitacao.status_geral === 'concluida' || solicitacao.status_geral === 'cancelada'
}

export function isSolicitacaoAdiada() {
  return false
}

export function isSolicitacaoAtrasada(solicitacao = {}) {
  if (isSolicitacaoEncerrada(solicitacao)) {
    return false
  }

  const dateValue = solicitacao.previsao_entrega
  if (!dateValue) return false

  const today = toDateInputValue(new Date())
  const targetDate = toDateInputValue(dateValue)

  return !!targetDate && targetDate < today
}

export function isSolicitacaoChegaHoje(solicitacao = {}) {
  if (isSolicitacaoEncerrada(solicitacao)) {
    return false
  }

  const dateValue = solicitacao.previsao_entrega
  if (!dateValue) return false

  const today = toDateInputValue(new Date())
  const targetDate = toDateInputValue(dateValue)

  return !!targetDate && targetDate === today
}

export function getSolicitacaoPrazoSituacao(solicitacao = {}) {
  if (solicitacao.status_geral === 'concluida') {
    return {
      label: 'ENTREGUE',
      className: 'border-[#67e8f9] bg-[#cffafe] text-[#0e7490]'
    }
  }

  if (solicitacao.status_geral === 'cancelada') {
    return {
      label: 'CANCELADA',
      className: 'border-[#f87171] bg-[#fee2e2] text-[#991b1b]'
    }
  }

  if (!solicitacao.previsao_entrega) {
    return {
      label: 'SEM PRAZO!',
      className: 'border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]'
    }
  }

  if (isSolicitacaoAtrasada(solicitacao)) {
    return {
      label: 'ATRASADA',
      className: 'border-[#f87171] bg-[#fee2e2] text-[#991b1b]'
    }
  }

  if (isSolicitacaoChegaHoje(solicitacao)) {
    return {
      label: 'CHEGA HOJE!',
      className: 'border-[#fde68a] bg-[#fef3c7] text-[#92400e]'
    }
  }

  return {
    label: 'NO PRAZO!',
    className: 'border-[#86efac] bg-[#dcfce7] text-[#166534]'
  }
}

export function getSolicitacaoStatusOrder(status) {
  const index = SOLICITACAO_STATUS_FLOW.findIndex((option) => option.value === status)
  return index === -1 ? 0 : index
}

export function getSolicitacaoSituacao(solicitacao = {}) {
  if (isSolicitacaoAtrasada(solicitacao)) {
    return getSolicitacaoPrazoSituacao(solicitacao)
  }

  const option = getSolicitacaoOption(SOLICITACAO_STATUS_GERAL_OPTIONS, solicitacao.status_geral)

  return {
    label: option.label,
    className: option.className
  }
}
