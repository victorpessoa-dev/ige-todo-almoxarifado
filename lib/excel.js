import * as XLSX from 'xlsx'

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
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR')
}

export function generateSolicitacoesExcel(solicitacoes) {
  const worksheet = XLSX.utils.json_to_sheet(
    solicitacoes.map((solicitacao) => ({
      codigo: solicitacao.codigo || '',
      solicitante: solicitacao.solicitante || '',
      produto: solicitacao.descricao || '',
      quantidade: Number(solicitacao.quantidade || 0),
      valor_unitario: Number(solicitacao.valor_unitario || 0),
      valor_total: Number(solicitacao.valor_total || 0),
      data: formatDate(solicitacao.data_solicitacao || solicitacao.created_at),
      centro_custo: solicitacao.centro_custo || '',
      status: solicitacao.status_geral || '',
      status_cotacao: solicitacao.status_cotacao || '',
      status_pedido: solicitacao.status_pedido || '',
      status_entrega: solicitacao.status_transporte || '',
      previsao_entrega: formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)
    }))
  )

  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 40 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 }
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
