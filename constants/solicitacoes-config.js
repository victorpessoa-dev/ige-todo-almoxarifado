export const SOLICITACAO_PRIORIDADE_OPTIONS = [
  {
    value: 'baixa',
    label: 'Baixa',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  {
    value: 'media',
    label: 'Média',
    className: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  {
    value: 'alta',
    label: 'Alta',
    className: 'border-orange-200 bg-orange-50 text-orange-700'
  },
  {
    value: 'urgente',
    label: 'Urgente',
    className: 'border-red-200 bg-red-50 text-red-700'
  }
]

export const SOLICITACAO_STATUS_GERAL_OPTIONS = [
  { value: 'nova', label: 'Nova', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  { value: 'aceita', label: 'Aceita', className: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
  { value: 'em_cotacao', label: 'Em cotação', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  { value: 'aprovacao', label: 'Em aprovação', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'preparando_pedido', label: 'Preparando pedido', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'em_transporte', label: 'Em transporte', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  { value: 'entregue', label: 'Entregue', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'concluida', label: 'Concluída', className: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'cancelada', label: 'Cancelada', className: 'border-slate-200 bg-slate-50 text-slate-700' }
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

function startOfLocalDay(value) {
  const date = value ? new Date(value) : new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export function getSolicitacaoSituacao(solicitacao = {}) {
  const cotacao = solicitacao.status_cotacao
  const pedido = solicitacao.status_pedido
  const entrega = solicitacao.status_transporte
  const descricao = [solicitacao.nome_item, solicitacao.descricao]
    .filter(Boolean)
    .join(' ')
    .trim()
  const previsaoEntrega = solicitacao.previsao_entrega

  if (cotacao === 'cotando') {
    return {
      label: 'COTAÇÃO',
      className: 'border-violet-200 bg-violet-50 text-violet-800'
    }
  }

  if (cotacao === 'nao_iniciado') {
    return {
      label: 'COTAÇÃO NÃO INICIADA!',
      className: 'border-sky-200 bg-sky-50 text-sky-800'
    }
  }

  if (cotacao === 'adiada' || pedido === 'pedido_adiado' || entrega === 'adiada') {
    return {
      label: 'PEDIDO ADIADO!',
      className: 'border-amber-200 bg-amber-50 text-amber-800'
    }
  }

  if (pedido === 'pedido_em_analise') {
    return {
      label: 'AGUARDANDO RETORNO DO PEDIDO',
      className: 'border-blue-200 bg-blue-50 text-blue-800'
    }
  }

  if (pedido === 'aguardando_pagamento') {
    return {
      label: 'AGUARDANDO PAGAMENTO',
      className: 'border-orange-200 bg-orange-50 text-orange-800'
    }
  }

  if (pedido === 'preparando_pedido') {
    return {
      label: 'PREPARANDO PEDIDO',
      className: 'border-blue-200 bg-blue-50 text-blue-800'
    }
  }

  if (entrega === 'disponivel_retirada') {
    return {
      label: 'DISPONÍVEL PARA RETIRADA',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800'
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
      className: 'border-slate-200 bg-slate-50 text-slate-800'
    }
  }

  const today = startOfLocalDay()
  const deliveryDate = startOfLocalDay(previsaoEntrega)

  if (today < deliveryDate) {
    return {
      label: 'NO PRAZO!',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }
  }

  if (entrega === 'entregue_conferido') {
    return {
      label: 'ENTREGUE E CONFERIDO!',
      className: 'border-green-200 bg-green-50 text-green-800'
    }
  }

  if (today > deliveryDate) {
    return {
      label: 'ATRASADA!',
      className: 'border-red-200 bg-red-50 text-red-800'
    }
  }

  return {
    label: 'PARA CHEGAR HOJE!',
    className: 'border-amber-200 bg-amber-50 text-amber-800'
  }
}
