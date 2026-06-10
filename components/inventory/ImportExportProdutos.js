'use client'

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

import { useData } from '@/contexts/data-context'
import { supabase } from '@/lib/supabaseClient'
import { getUserMessage } from '@/lib/user-messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

export const catalogThemeClasses = {
  classico: {
    label: 'Classico',
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    text: '#111827',
    muted: '#6b7280',
    border: '#d1d5db',
    page: '#f8fafc',
    card: '#ffffff'
  },
  estoque: {
    label: 'Estoque',
    accent: '#059669',
    accentSoft: '#d1fae5',
    text: '#0f172a',
    muted: '#64748b',
    border: '#cbd5e1',
    page: '#f8fafc',
    card: '#ffffff'
  },
  premium: {
    label: 'Premium',
    accent: '#7c2d12',
    accentSoft: '#ffedd5',
    text: '#1f2937',
    muted: '#6b7280',
    border: '#fed7aa',
    page: '#fff7ed',
    card: '#ffffff'
  }
}

function normalizeImportedNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 0
  }

  const normalized = Number(String(value).replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : 0
}

function normalizeImportedStockLimits(item) {
  const estoque = normalizeImportedNumber(item?.estoque)
  const min = normalizeImportedNumber(item?.min)
  const rawMax = normalizeImportedNumber(item?.max)
  const max = rawMax < min ? min : rawMax

  return { estoque, min, max }
}

function formatImportError(error) {
  if (!error) return 'Erro desconhecido.'

  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Codigo: ${error.code}` : ''
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : 'Erro desconhecido.'
}

function makeProductImportPayload(item, userId) {
  const { estoque, min, max } = normalizeImportedStockLimits(item)

  return {
    user_id: userId,
    cod: String(item.code || '').trim(),
    nome: String(item.nome || '').trim(),
    ...(item.categoria ? { categoria: item.categoria } : {}),
    ...(item.aplicacao ? { aplicacao: item.aplicacao } : {}),
    ...(item.medidas ? { medidas: item.medidas } : {}),
    ...(item.marcas ? { marcas: item.marcas } : {}),
    ...(item.img_url ? { img_url: item.img_url } : {}),
    estoque,
    max,
    min,
    cod_barra: String(item.code || '').trim()
  }
}

function normalizeImportedProducts(rows) {
  return rows.reduce((acc, item, index) => {
    const cod = String(item?.cod ?? '').trim()
    const nome = String(item?.nome ?? '').trim()
    const { estoque, min, max } = normalizeImportedStockLimits(item)

    if (!cod || !nome) return acc

    acc.push({
      id: `${cod}-${index}`,
      originalCode: cod,
      code: cod,
      nome,
      categoria: String(item.categoria || '').trim(),
      aplicacao: String(item.aplicacao || '').trim(),
      medidas: String(item.medidas || '').trim(),
      marcas: String(item.marcas || '').trim(),
      img_url: String(item.img_url || '').trim(),
      estoque,
      max,
      min,
      action: 'create'
    })

    return acc
  }, [])
}

function getStockStatus(produto) {
  const estoque = Number(produto.estoque || 0)
  const min = Number(produto.min || 0)
  const max = Number(produto.max || 0)

  if (estoque <= min) {
    return {
      label: 'Baixo',
      className: 'low',
      suggestion: Math.max(0, max - estoque)
    }
  }

  if (max > 0 && estoque >= max) {
    return {
      label: 'Cheio',
      className: 'full',
      suggestion: 0
    }
  }

  return {
    label: 'Normal',
    className: 'normal',
    suggestion: 0
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getCatalogProducts(produtos, options = {}) {
  return produtos
    .filter((produto) => {
      if (!options.onlyLowStock) return true
      const status = getStockStatus(produto)
      return status.className === 'low'
    })
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
}

function getCatalogProductDetails(produto) {
  return {
    produto: produto.nome || '-',
    categoria: produto.categoria || '-',
    aplicacao: produto.aplicacao || '-',
    medidas: produto.medidas || '-',
    marcas: produto.marcas || '-',
    estoque: Number(produto.estoque || 0),
    min: Number(produto.min || 0),
    max: Number(produto.max || 0),
    imagem: produto.img_url || ''
  }
}

function makeCatalogHtml(produtos, options) {
  const theme = catalogThemeClasses[options.theme] || catalogThemeClasses.classico
  const date = new Date().toLocaleDateString('pt-BR')
  const filteredProducts = getCatalogProducts(produtos, options)
  const totalEstoque = filteredProducts.reduce(
    (acc, produto) => acc + Number(produto.estoque || 0),
    0
  )
  const lowStockTotal = filteredProducts.filter(
    (produto) => getStockStatus(produto).className === 'low'
  ).length

  const rows = filteredProducts.map((produto) => {
    const details = getCatalogProductDetails(produto)
    const image = details.imagem
      ? `<a href="${escapeHtml(details.imagem)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(details.imagem)}" alt="Imagem tecnica de ${escapeHtml(details.produto)}" loading="lazy" />
        </a>`
      : '<span class="empty-image">Sem imagem</span>'

    return `
      <tr>
        <td><strong>${escapeHtml(details.produto)}</strong></td>
        <td>${escapeHtml(details.categoria)}</td>
        <td>${escapeHtml(details.aplicacao)}</td>
        <td>${escapeHtml(details.medidas)}</td>
        <td>${escapeHtml(details.marcas)}</td>
        <td>${escapeHtml(details.estoque)}</td>
        <td>Min: ${escapeHtml(details.min)}<br />Max: ${escapeHtml(details.max)}</td>
        <td class="image-cell">${image}</td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: ${theme.page};
      color: ${theme.text};
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }
    .page { max-width: 1240px; margin: 0 auto; padding: 28px 18px 42px; }
    .hero {
      display: grid;
      gap: 12px;
      border: 1px solid ${theme.border};
      background: ${theme.card};
      border-radius: 12px;
      padding: 22px;
      margin-bottom: 14px;
    }
    h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
    .subtitle, .meta, footer { color: ${theme.muted}; }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .summary div {
      border: 1px solid ${theme.border};
      background: ${theme.card};
      border-radius: 10px;
      padding: 12px;
    }
    .summary span { display: block; color: ${theme.muted}; font-size: 12px; text-transform: uppercase; }
    .summary strong { display: block; font-size: 22px; }
    .table-wrap { overflow-x: auto; border: 1px solid ${theme.border}; border-radius: 12px; background: ${theme.card}; }
    table { width: 100%; min-width: 1040px; border-collapse: collapse; }
    th, td { border-bottom: 1px solid ${theme.border}; padding: 11px 10px; text-align: left; vertical-align: top; font-size: 13px; }
    th { background: ${theme.accentSoft}; color: ${theme.text}; font-size: 12px; text-transform: uppercase; position: sticky; top: 0; z-index: 1; }
    tr:last-child td { border-bottom: 0; }
    .image-cell { width: 150px; }
    img {
      display: block;
      width: 128px;
      height: 96px;
      object-fit: contain;
      border: 1px solid ${theme.border};
      border-radius: 8px;
      background: #fff;
    }
    .empty-image { display: inline-flex; width: 128px; height: 96px; align-items: center; justify-content: center; border: 1px dashed ${theme.border}; border-radius: 8px; color: ${theme.muted}; }
    .empty { border: 1px dashed ${theme.border}; border-radius: 12px; padding: 24px; background: ${theme.card}; color: ${theme.muted}; }
    footer { margin-top: 20px; text-align: center; font-size: 12px; }
    @media (max-width: 720px) {
      .page { padding: 14px 10px 28px; }
      .summary { grid-template-columns: 1fr; }
      h1 { font-size: 24px; }
    }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 0; }
      th { position: static; }
      img, tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <h1>${escapeHtml(options.title)}</h1>
      ${options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
      <p class="meta">Gerado em ${date} | ${filteredProducts.length} produto(s)</p>
    </section>
    <section class="summary">
      <div><span>Produtos no catalogo</span><strong>${filteredProducts.length}</strong></div>
      <div><span>Estoque disponivel total</span><strong>${totalEstoque}</strong></div>
      <div><span>Estoque baixo</span><strong>${lowStockTotal}</strong></div>
    </section>
    ${filteredProducts.length === 0
      ? '<section class="empty">Nenhum produto encontrado para os filtros escolhidos.</section>'
      : `<section class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Aplicacao</th>
                <th>Medidas</th>
                <th>Marcas disponiveis</th>
                <th>Estoque disponivel</th>
                <th>Max e Min</th>
                <th>Imagem tecnica</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`}
    <footer>${escapeHtml(options.footer)}</footer>
  </main>
</body>
</html>`
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '')

  return [
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255
  ]
}

function pdfText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

function wrapText(value, maxChars) {
  const words = String(value ?? '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word

    if (nextLine.length <= maxChars) {
      line = nextLine
      return
    }

    if (line) lines.push(line)
    line = word
  })

  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['-']
}

function makePdfBytes(pages) {
  const objects = []
  const pageCount = pages.length
  const catalogId = 1
  const pagesId = 2
  const fontRegularId = 3
  const fontBoldId = 4
  const firstPageId = 5
  const firstContentId = firstPageId + pageCount

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId] = `<< /Type /Pages /Kids ${Array.from(
    { length: pageCount },
    (_, index) => `${firstPageId + index} 0 R`
  ).join(' ')} /Count ${pageCount} >>`
  objects[fontRegularId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[fontBoldId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  pages.forEach((content, index) => {
    const pageId = firstPageId + index
    const contentId = firstContentId + index
    const stream = `${content}\n`
    const streamLength = stream.length

    objects[pageId] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
      `/Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${streamLength} >>\nstream\n${stream}endstream`
  })

  const parts = ['%PDF-1.4\n']
  const offsets = [0]

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = parts.join('').length
    parts.push(`${index} 0 obj\n${objects[index]}\nendobj\n`)
  }

  const xrefOffset = parts.join('').length
  parts.push(`xref\n0 ${objects.length}\n`)
  parts.push('0000000000 65535 f \n')

  for (let index = 1; index < objects.length; index += 1) {
    parts.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`)
  }

  parts.push(
    `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  )

  return new TextEncoder().encode(parts.join(''))
}

export function makeCatalogPdf(produtos, options) {
  const date = new Date().toLocaleDateString('pt-BR')
  const filteredProducts = getCatalogProducts(produtos, options)

  const totalEstoque = filteredProducts.reduce(
    (acc, produto) => acc + Number(produto.estoque || 0),
    0
  )
  const lowStockTotal = filteredProducts.filter(
    (produto) => getStockStatus(produto).className === 'low'
  ).length

  const pages = []
  const pageWidth = 595
  const pageHeight = 842
  const margin = 42
  let content = ''
  let y = 0
  let pageNumber = 0

  const command = (value) => {
    content += `${value}\n`
  }

  const line = (x1, y1, x2, y2) => {
    command(`${x1} ${y1} m ${x2} ${y2} l S`)
  }
  const text = (value, x, nextY, size = 10, bold = false) => {
    command(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${nextY} Td (${pdfText(value)}) Tj ET`)
  }
  const textBlock = (value, x, nextY, maxChars, maxLines, size = 9, bold = false, lineHeight = 11) =>
    wrapText(value, maxChars)
      .slice(0, maxLines)
      .forEach((lineText, index) => text(lineText, x, nextY - index * lineHeight, size, bold))

  const addPage = () => {
    if (content) {
      line(margin, 42, pageWidth - margin, 42)
      text(options.footer || 'IGE Supergesso', margin, 24, 8)
      text(`Pagina ${pageNumber}`, pageWidth - margin - 48, 24, 8)
      pages.push(content)
    }

    content = ''
    pageNumber += 1
    y = pageHeight - margin
    text(options.title || 'Catalogo de Produtos IGE', margin, y, pageNumber === 1 ? 18 : 12, true)
    text(`Gerado em ${date}`, pageWidth - margin - 92, y, 9)
    y -= pageNumber === 1 ? 28 : 20
    line(margin, y, pageWidth - margin, y)
    y -= 20
  }
  const ensureSpace = (height) => {
    if (y - height < 64) addPage()
  }

  addPage()
  text(`Produtos no catalogo: ${filteredProducts.length}`, margin, y, 10, true)
  text(`Estoque total: ${totalEstoque}`, margin + 180, y, 10, true)
  text(`Estoque baixo: ${lowStockTotal}`, margin + 330, y, 10, true)
  y -= 26

  if (filteredProducts.length === 0) {
    text('Nenhum produto encontrado para os filtros escolhidos.', margin, y, 11)
  } else {
    filteredProducts.forEach((produto) => {
      const details = getCatalogProductDetails(produto)
      const status = getStockStatus(produto)
      const rowHeight = 86

      ensureSpace(rowHeight)
      textBlock(details.produto, margin, y, 62, 1, 11, true)
      text(status.label, pageWidth - margin - 48, y, 9, true)
      y -= 15
      text(`Categoria: ${details.categoria}`, margin, y, 9)
      text(`Estoque: ${details.estoque}`, margin + 260, y, 9, true)
      text(`Max: ${details.max}  Min: ${details.min}`, margin + 350, y, 9)
      y -= 13
      textBlock(`Marcas: ${details.marcas}`, margin, y, 88, 1, 9)
      y -= 13
      textBlock(`Medidas: ${details.medidas}`, margin, y, 88, 1, 9)
      y -= 13
      textBlock(`Aplicacao: ${details.aplicacao}`, margin, y, 92, 2, 8)
      y -= 28
      line(margin, y, pageWidth - margin, y)
      y -= 14
    })
  }

  line(margin, 42, pageWidth - margin, 42)
  text(options.footer || 'IGE Supergesso', margin, 24, 8)
  text(`Pagina ${pageNumber}`, pageWidth - margin - 48, 24, 8)
  pages.push(content)
  return makePdfBytes(pages)
}

export default function ImportExportProdutos() {
  const { produtos, loadData } = useData()
  const fileInputRef = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importItems, setImportItems] = useState([])

  const itemsWithDuplicates = useMemo(() => {
    return importItems.map((item) => {
      const duplicateProduct = produtos.find((produto) => produto.cod === item.originalCode)
      return {
        ...item,
        duplicateProduct,
        action: duplicateProduct ? item.action || 'sum' : 'create'
      }
    })
  }, [importItems, produtos])

  const importSummary = useMemo(() => {
    return itemsWithDuplicates.reduce(
      (acc, item) => {
        if (item.duplicateProduct && item.action === 'sum') {
          acc.sum += 1
        } else {
          acc.create += 1
        }

        acc.total += 1
        return acc
      },
      { total: 0, create: 0, sum: 0 }
    )
  }, [itemsWithDuplicates])

  const lowStockPurchaseItems = useMemo(() => {
    return produtos
      .filter((produto) => {
        const estoque = Number(produto.estoque || 0)
        const min = Number(produto.min || 0)
        const max = Number(produto.max || 0)

        return estoque <= min && max > estoque
      })
      .map((produto) => {
        const estoque = Number(produto.estoque || 0)
        const max = Number(produto.max || 0)

        return {
          produto: produto.nome,
          qtd_compra: max - estoque
        }
      })
      .sort((a, b) => a.produto.localeCompare(b.produto))
  }, [produtos])



  const exportToXLSX = () => {
    const data = produtos.map((produto) => ({
      cod: produto.cod,
      nome: produto.nome,
      categoria: produto.categoria,
      aplicacao: produto.aplicacao,
      medidas: produto.medidas,
      marcas: produto.marcas,
      estoque: produto.estoque,
      max: produto.max,
      min: produto.min,
      img_url: produto.img_url
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
    XLSX.writeFile(wb, 'produtos.xlsx')
  }

  const exportLowStockPurchaseList = () => {
    if (lowStockPurchaseItems.length === 0) {
      toast.info('Nenhum produto abaixo do estoque mínimo para comprar.')
      return
    }

    const ws = XLSX.utils.json_to_sheet(lowStockPurchaseItems)
    ws['!cols'] = [
      { wch: 36 },
      { wch: 20 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de compra')
    XLSX.writeFile(wb, 'produtos-para-comprar.xlsx')
    toast.success('Lista de compra baixada com sucesso!')
  }

  const updateImportItem = (id, updates) => {
    setImportItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const resetImportState = () => {
    setImportItems([])
    setPreviewOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const imported = normalizeImportedProducts(json)

      if (imported.length === 0) {
        toast.error('Nenhum produto valido foi encontrado. Apenas cod e nome sao obrigatorios.')
        resetImportState()
        return
      }

      setImportItems(imported)
      setPreviewOpen(true)
    } catch (error) {
      console.error('Erro ao ler arquivo de importação:', error)
      toast.error('Não foi possível ler o arquivo informado.')
      resetImportState()
    }
  }

  const validateImport = () => {
    const usedCodes = new Set()

    for (const item of itemsWithDuplicates) {
      if (item.action === 'sum') continue

      const nextCode = String(item.code || '').trim()

      if (!nextCode) {
        return 'Informe um código para todos os produtos que serão criados.'
      }

      const existingWithCode = produtos.find(
        (produto) => produto.cod === nextCode && produto.cod !== item.originalCode
      )

      if (existingWithCode) {
        return `O código ${nextCode} já existe no produto ${existingWithCode.nome}.`
      }

      if (usedCodes.has(nextCode)) {
        return `O código ${nextCode} foi repetido mais de uma vez na importação.`
      }

      usedCodes.add(nextCode)
    }

    return null
  }

  const confirmImport = async () => {
    const validationError = validateImport()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsImporting(true)

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Sua sessão expirou. Entre novamente para continuar.')
      }

      for (const item of itemsWithDuplicates) {
        if (item.action === 'sum' && item.duplicateProduct) {
          const { error } = await supabase
            .from('produtos')
            .update({
              estoque: Number(item.duplicateProduct.estoque || 0) + Number(item.estoque || 0)
            })
            .eq('id', item.duplicateProduct.id)
            .select('id')
            .single()

          if (error) {
            throw new Error(
              `Falha ao somar estoque do produto ${item.originalCode}: ${formatImportError(error)}`
            )
          }
          continue
        }

        const { error } = await supabase
          .from('produtos')
          .insert(makeProductImportPayload(item, user.id))
          .select('id')
          .single()

        if (error) {
          throw new Error(
            `Falha ao criar produto ${item.code}: ${formatImportError(error)}`
          )
        }
      }

      await loadData()
      toast.success('Importacao concluida com sucesso!')
      resetImportState()
    } catch (error) {
      console.error('Erro ao confirmar importação:', error)
      toast.error(getUserMessage(error, 'Não foi possível concluir a importação.'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <div className="flex w-full items-center justify-center sm:w-auto">
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-3">
          <Button onClick={exportToXLSX} className="w-full sm:w-auto">
            Exp. XLSX
          </Button>

          <Button onClick={exportLowStockPurchaseList} className="w-full sm:w-auto">
            Lista de Compra
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            Imp. Arquivo
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!isImporting) {
            if (!open) {
              resetImportState()
            } else {
              setPreviewOpen(true)
            }
          }
        }}
      >
        <DialogContent className="grid max-h-[calc(100vh-2rem)] w-[95vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-4 sm:max-w-5xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Revise os produtos lidos antes de salvar no banco. Quando houver código duplicado,
              você pode somar ao produto existente ou criar um novo com outro código.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total lidos
                </p>
                <p className="text-2xl font-bold">{importSummary.total}</p>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">
                  Serão criados
                </p>
                <p className="text-2xl font-bold text-emerald-900">
                  {importSummary.create}
                </p>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-amber-700">
                  Serão somados
                </p>
                <p className="text-2xl font-bold text-amber-900">
                  {importSummary.sum}
                </p>
              </div>
            </div>

            <div className="ige-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {itemsWithDuplicates.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.duplicateProduct
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'bg-card'
                  }`}
                >
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words font-semibold">
                          {item.nome}
                        </p>
                        {item.duplicateProduct ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            Código já existe
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                            Produto novo
                          </span>
                        )}
                      </div>

                      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                        <p>Código lido: {item.originalCode}</p>
                        <p>Estoque: {item.estoque}</p>
                        <p>Min: {item.min} | Max: {item.max}</p>
                      </div>

                      {item.duplicateProduct && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Já existe no banco: <strong>{item.duplicateProduct.nome}</strong>
                          {' '}com código <strong>{item.duplicateProduct.cod}</strong> e estoque atual{' '}
                          <strong>{item.duplicateProduct.estoque}</strong>.
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-2">
                      {item.duplicateProduct ? (
                        <>
                          <div className="grid gap-2 rounded-lg border bg-background/70 p-3">
                            <label className="flex items-start gap-2 text-sm">
                              <input
                                type="radio"
                                name={`action-${item.id}`}
                                className="mt-1"
                                checked={item.action === 'sum'}
                                onChange={() =>
                                  updateImportItem(item.id, {
                                    action: 'sum',
                                    code: item.originalCode
                                  })
                                }
                              />
                              Somar ao produto existente
                            </label>

                            <label className="flex items-start gap-2 text-sm">
                              <input
                                type="radio"
                                name={`action-${item.id}`}
                                className="mt-1"
                                checked={item.action === 'create'}
                                onChange={() =>
                                  updateImportItem(item.id, {
                                    action: 'create',
                                    code:
                                      item.code && item.code !== item.originalCode
                                        ? item.code
                                        : ''
                                  })
                                }
                              />
                              Criar como novo produto
                            </label>
                          </div>

                          {item.action === 'create' && (
                            <div>
                              <label className="mb-1 block text-sm font-medium">
                                Novo código
                              </label>
                              <Input
                                value={item.code}
                                onChange={(event) =>
                                  updateImportItem(item.id, {
                                    code: event.target.value
                                  })
                                }
                                placeholder="Informe outro código"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                          Produto novo. Será criado no banco com o código {item.code}.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-end gap-2 border-t pt-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={resetImportState}
                disabled={isImporting}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>

              <Button
                onClick={confirmImport}
                disabled={isImporting}
                className="w-full whitespace-normal text-center sm:w-auto"
              >
                {isImporting
                  ? 'Importando...'
                  : `Confirmar importação (${importSummary.create} criar, ${importSummary.sum} somar)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
