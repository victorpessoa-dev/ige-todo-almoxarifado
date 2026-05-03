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
