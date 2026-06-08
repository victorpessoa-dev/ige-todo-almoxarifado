import * as XLSX from 'xlsx'
import { formatDateBR } from '@/lib/date-utils'
import {
  formatSolicitacaoItem,
  getSolicitacaoCentroCusto,
  getSolicitacaoSolicitante
} from '@/lib/solicitacoes-format'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS,
  getSolicitacaoOption,
  getSolicitacaoSituacao
} from '@/constants/solicitacoes-config'

export function generateExcel(products) {
  const worksheet = XLSX.utils.json_to_sheet(
    products.map((product) => ({
      cod: product.cod || '',
      nome: product.nome || product.name || '',
      estoque: Number(product.estoque ?? product.quantity ?? 0),
      max: Number(product.max ?? 0),
      min: Number(product.min ?? 0)
    }))
  )

  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque')

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export function downloadExcel(products, filename = 'estoque.xlsx') {
  const blob = generateExcel(products)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

function formatDate(value) {
  return formatDateBR(value, '')
}

function formatStatus(options, value) {
  return getSolicitacaoOption(options, value)?.label || ''
}

export function generateSolicitacoesExcel(solicitacoes) {
  const worksheet = XLSX.utils.json_to_sheet(
    solicitacoes.map((solicitacao) => {
      const situacao = getSolicitacaoSituacao(solicitacao)

      return {
        Código: solicitacao.codigo || '',
        Solicitante: getSolicitacaoSolicitante(solicitacao),
        'Centro de custo': getSolicitacaoCentroCusto(solicitacao),
        Item: formatSolicitacaoItem(solicitacao),
        'Descrição do item': solicitacao.descricao || '',
        Aplicação: solicitacao.aplicacoes || '',
        Quantidade: Number(solicitacao.quantidade || 0),
        Prioridade: formatStatus(SOLICITACAO_PRIORIDADE_OPTIONS, solicitacao.prioridade),
        Situacao: situacao.label || '',
        'Status geral': formatStatus(SOLICITACAO_STATUS_GERAL_OPTIONS, solicitacao.status_geral),
        Cotacao: formatStatus(SOLICITACAO_STATUS_COTACAO_OPTIONS, solicitacao.status_cotacao),
        Pedido: formatStatus(SOLICITACAO_STATUS_PEDIDO_OPTIONS, solicitacao.status_pedido),
        Entrega: formatStatus(SOLICITACAO_STATUS_TRANSPORTE_OPTIONS, solicitacao.status_transporte),
        'Previsão desejada': formatDate(solicitacao.previsao_desejada),
        'Previsão de entrega': formatDate(solicitacao.previsao_entrega),
        'Data da solicitação': formatDate(solicitacao.data_solicitacao || solicitacao.created_at),
        'Valor unitário': Number(solicitacao.valor_unitario || 0),
        'Valor total': Number(solicitacao.valor_total || 0)
      }
    })
  )

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 28 },
    { wch: 36 },
    { wch: 42 },
    { wch: 36 },
    { wch: 12 },
    { wch: 14 },
    { wch: 26 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitacoes')

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

export function downloadSolicitacoesExcel(solicitacoes, filename = 'solicitacoes.xlsx') {
  const blob = generateSolicitacoesExcel(solicitacoes)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
