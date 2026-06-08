import { toDateInputValue } from '@/lib/date-utils'

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
  { value: 'nova', label: 'Nova', className: 'border-[#7dd3fc] bg-[#e0f2fe] text-[#075985]' },
  { value: 'aceita', label: 'Aceita', className: 'border-[#5eead4] bg-[#ccfbf1] text-[#115e59]' },
  { value: 'em_cotacao', label: 'Em cotação', className: 'border-[#d8b4fe] bg-[#f3e8ff] text-[#6b21a8]' },
  { value: 'aprovacao', label: 'Em aprovação', className: 'border-[#fcd34d] bg-[#fef3c7] text-[#92400e]' },
  { value: 'preparando_pedido', label: 'Preparando pedido', className: 'border-[#fdba74] bg-[#ffedd5] text-[#9a3412]' },
  { value: 'em_transporte', label: 'Em transporte', className: 'border-[#a5b4fc] bg-[#e0e7ff] text-[#3730a3]' },
  { value: 'entregue', label: 'Entregue', className: 'border-[#67e8f9] bg-[#cffafe] text-[#155e75]' },
  { value: 'concluida', label: 'Concluída', className: 'border-[#22c55e] bg-[#dcfce7] text-[#14532d]' },
  { value: 'cancelada', label: 'Cancelada', className: 'border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]' }
]

export const SOLICITACAO_STATUS_COTACAO_OPTIONS = [
  { value: 'nao_iniciado', label: 'Não iniciado' },
  { value: 'cotando', label: 'Cotando' },
  { value: 'cotacao_em_analise', label: 'Cotação em análise' },
  { value: 'cotacao_finalizada', label: 'Cotação finalizada' },
  { value: 'cotacao_aprovada', label: 'Cotação aprovada' },
  { value: 'adiada', label: 'Adiada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'outra', label: 'Outra' }
]

export const SOLICITACAO_STATUS_PEDIDO_OPTIONS = [
  { value: 'nao_digitado', label: 'Não digitado' },
  { value: 'pedido_digitado', label: 'Pedido digitado' },
  { value: 'pedido_em_analise', label: 'Pedido em análise' },
  { value: 'pedido_encerrado', label: 'Pedido encerrado' },
  { value: 'pedido_aprovado', label: 'Pedido aprovado' },
  { value: 'pedido_adiado', label: 'Pedido adiado' },
  { value: 'pedido_cancelado', label: 'Pedido cancelado' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'outra', label: 'Outra' },
  { value: 'preparando_pedido', label: 'Preparando pedido' }
]

export const SOLICITACAO_STATUS_TRANSPORTE_OPTIONS = [
  { value: 'producao_separacao', label: 'Produção / separação' },
  { value: 'disponivel_retirada', label: 'Disponível para retirada' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'entrega_atrasada', label: 'Entrega atrasada' },
  { value: 'entregue_conferido', label: 'Entregue e conferido' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'adiada', label: 'Adiada' },
  { value: 'outra', label: 'Outra' }
]

export function getSolicitacaoOption(options, value) {
  return options.find((option) => option.value === value) || options[0]
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

export function getSolicitacaoStatusDefaults(statusGeral) {
  if (statusGeral === 'concluida') {
    return {
      status_cotacao: 'cotacao_aprovada',
      status_pedido: 'pedido_aprovado',
      status_transporte: 'entregue_conferido'
    }
  }

  if (statusGeral === 'cancelada') {
    return {
      status_cotacao: 'cancelada',
      status_pedido: 'pedido_cancelado',
      status_transporte: 'cancelada'
    }
  }

  return {}
}

export function getSolicitacaoSituacao(solicitacao = {}) {
  const geral = solicitacao.status_geral
  const cotacao = solicitacao.status_cotacao
  const pedido = solicitacao.status_pedido
  const entrega = solicitacao.status_transporte
  const descricao = [solicitacao.nome_item, solicitacao.descricao]
    .filter(Boolean)
    .join(' ')
    .trim()
  const previsaoEntrega = solicitacao.previsao_entrega

  if (
    geral === 'cancelada' ||
    cotacao === 'cancelada' ||
    pedido === 'pedido_cancelado' ||
    entrega === 'cancelada'
  ) {
    return {
      label: 'CANCELADA',
      className: 'border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]'
    }
  }

  if (cotacao === 'cotando') {
    return {
      label: 'COTAÇÃO',
      className: 'border-[#d8b4fe] bg-[#f3e8ff] text-[#6b21a8]'
    }
  }

  if (cotacao === 'nao_iniciado') {
    return {
      label: 'COTAÇÃO NÃO INICIADA!',
      className: 'border-[#7dd3fc] bg-[#e0f2fe] text-[#075985]'
    }
  }

  if (cotacao === 'adiada' || pedido === 'pedido_adiado' || entrega === 'adiada') {
    return {
      label: 'PEDIDO ADIADO!',
      className: 'border-[#fcd34d] bg-[#fef3c7] text-[#92400e]'
    }
  }

  if (pedido === 'pedido_em_analise') {
    return {
      label: 'AGUARDANDO RETORNO DO PEDIDO',
      className: 'border-[#a5b4fc] bg-[#e0e7ff] text-[#3730a3]'
    }
  }

  if (pedido === 'aguardando_pagamento') {
    return {
      label: 'AGUARDANDO PAGAMENTO',
      className: 'border-[#fb923c] bg-[#ffedd5] text-[#9a3412]'
    }
  }

  if (pedido === 'preparando_pedido') {
    return {
      label: 'PREPARANDO PEDIDO',
      className: 'border-[#5eead4] bg-[#ccfbf1] text-[#115e59]'
    }
  }

  if (entrega === 'disponivel_retirada') {
    return {
      label: 'DISPONÍVEL PARA RETIRADA',
      className: 'border-[#67e8f9] bg-[#cffafe] text-[#155e75]'
    }
  }

  if (!descricao) {
    return {
      label: '',
      className: 'border-transparent bg-transparent text-transparent'
    }
  }

  if (!previsaoEntrega) {
    return {
      label: 'SEM DATA DE ENTREGA',
      className: 'border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]'
    }
  }

  const today = toDateInputValue(new Date())
  const deliveryDate = toDateInputValue(previsaoEntrega)

  if (!deliveryDate) {
    return {
      label: 'SEM DATA DE ENTREGA',
      className: 'border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]'
    }
  }

  if (today < deliveryDate) {
    return {
      label: 'NO PRAZO!',
      className: 'border-[#86efac] bg-[#dcfce7] text-[#166534]'
    }
  }

  if (entrega === 'entregue_conferido') {
    return {
      label: 'ENTREGUE E CONFERIDO!',
      className: 'border-[#22c55e] bg-[#dcfce7] text-[#14532d]'
    }
  }

  if (today > deliveryDate) {
    return {
      label: 'ATRASADA!',
      className: 'border-[#f87171] bg-[#fee2e2] text-[#991b1b]'
    }
  }

  return {
    label: 'PARA CHEGAR HOJE!',
    className: 'border-[#facc15] bg-[#fef9c3] text-[#854d0e]'
  }
}
