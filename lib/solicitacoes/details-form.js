import { defaultSolicitacaoForm } from '@/components/solicitacoes/SolicitacaoForm'
import {
  getSolicitacaoCentroCusto,
  getSolicitacaoSolicitante
} from '@/lib/solicitacoes/format'
import { toDateInputValue } from '@/lib/date/date-utils'

export function parseSolicitacaoDecimal(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value

  const cleanValue = String(value).trim().replace(/[^\d,.-]/g, '')
  const normalizedValue = cleanValue.includes(',')
    ? cleanValue.replace(/\./g, '').replace(',', '.')
    : cleanValue
  const number = Number(normalizedValue)

  return Number.isFinite(number) ? number : null
}

export function formatSolicitacaoDecimalInput(value) {
  const number = parseSolicitacaoDecimal(value)
  if (!number) return ''

  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function completeSolicitacaoMoneyFields(form, changedField) {
  const quantidade = Number(form.quantidade || 0)
  const valorUnitario = parseSolicitacaoDecimal(form.valor_unitario)
  const valorTotal = parseSolicitacaoDecimal(form.valor_total)
  const nextForm = { ...form }

  if (quantidade <= 0) return nextForm

  if (changedField === 'valor_unitario') {
    nextForm.valor_total = valorUnitario > 0
      ? formatSolicitacaoDecimalInput(quantidade * valorUnitario)
      : ''
    return nextForm
  }

  if (changedField === 'valor_total') {
    nextForm.valor_unitario = valorTotal > 0
      ? formatSolicitacaoDecimalInput(valorTotal / quantidade)
      : ''
    return nextForm
  }

  if (changedField === 'quantidade') {
    if (valorUnitario > 0) {
      nextForm.valor_total = formatSolicitacaoDecimalInput(quantidade * valorUnitario)
    } else if (valorTotal > 0) {
      nextForm.valor_unitario = formatSolicitacaoDecimalInput(valorTotal / quantidade)
    }
    return nextForm
  }

  if (valorUnitario > 0 && !valorTotal) {
    nextForm.valor_total = formatSolicitacaoDecimalInput(quantidade * valorUnitario)
  }
  if (valorTotal > 0 && !valorUnitario) {
    nextForm.valor_unitario = formatSolicitacaoDecimalInput(valorTotal / quantidade)
  }

  return nextForm
}

export function buildSolicitacaoDetailsForm(solicitacao) {
  return {
    ...defaultSolicitacaoForm,
    nome_item: solicitacao?.nome_item || '',
    descricao: solicitacao?.descricao || '',
    quantidade: solicitacao?.quantidade || 1,
    prioridade: solicitacao?.prioridade || 'media',
    previsao_desejada: toDateInputValue(solicitacao?.previsao_desejada),
    centro_custo_id: solicitacao?.centro_custo_id || '',
    centro_custo: getSolicitacaoCentroCusto(solicitacao),
    centro_custo_nome: getSolicitacaoCentroCusto(solicitacao),
    aplicacoes: solicitacao?.aplicacoes || '',
    link_referencia: solicitacao?.link_referencia || '',
    fornecedor_nome: solicitacao?.fornecedor_nome || '',
    fornecedor_contato: solicitacao?.fornecedor_contato || '',
    solicitante_id: solicitacao?.solicitante_id || '',
    solicitante: getSolicitacaoSolicitante(solicitacao),
    solicitante_nome: getSolicitacaoSolicitante(solicitacao),
    status_geral: solicitacao?.status_geral || 'nova',
    valor_unitario: formatSolicitacaoDecimalInput(solicitacao?.valor_unitario),
    valor_total: formatSolicitacaoDecimalInput(solicitacao?.valor_total),
    previsao_entrega: toDateInputValue(solicitacao?.previsao_entrega),
    produto_id: solicitacao?.produto_id || ''
  }
}

export function buildSolicitacaoDetailsPayload(form) {
  const completedForm = completeSolicitacaoMoneyFields(form)

  return {
    nome_item: completedForm.nome_item,
    descricao: completedForm.descricao,
    quantidade: Number(completedForm.quantidade || 0),
    prioridade: completedForm.prioridade,
    previsao_desejada: completedForm.previsao_desejada || null,
    centro_custo_id: completedForm.centro_custo_id || null,
    aplicacoes: completedForm.aplicacoes || null,
    link_referencia: completedForm.link_referencia || null,
    fornecedor_nome: completedForm.fornecedor_nome?.trim?.() || null,
    fornecedor_contato: completedForm.fornecedor_contato?.trim?.() || null,
    solicitante_id: completedForm.solicitante_id || null,
    status_geral: completedForm.status_geral,
    valor_unitario: parseSolicitacaoDecimal(completedForm.valor_unitario),
    valor_total: parseSolicitacaoDecimal(completedForm.valor_total),
    previsao_entrega: completedForm.previsao_entrega || null,
    produto_id: completedForm.produto_id || null
  }
}
