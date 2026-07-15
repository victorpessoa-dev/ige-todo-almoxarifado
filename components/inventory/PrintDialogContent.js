'use client'

import JsBarcode from 'jsbarcode'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const LABEL_MODELS = {
  A4249: { width: 2.6, height: 1.5, scale: 0.7 },
  A4251: { width: 3.82, height: 2.12, scale: 0.85 },
  A4255: { width: 6.35, height: 3.1, scale: 1 },
  A4256: { width: 6.35, height: 2.54, scale: 0.95 },
  A4260: { width: 6.35, height: 3.81, scale: 1.1 },
  A4262: { width: 9.9, height: 3.39, scale: 1.2 },
  A4263: { width: 9.9, height: 3.81, scale: 1.3 }
}

function loadLogo() {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/ige-supergesso.svg'
  })
}

async function createLabelImage(produto, model) {
  const { width, height, scale } = LABEL_MODELS[model]
  const pxScale = 180
  const widthPx = Math.round(width * pxScale)
  const heightPx = Math.round(height * pxScale)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = widthPx
  canvas.height = heightPx
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, widthPx, heightPx)

  const logo = await loadLogo()
  if (logo) {
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.drawImage(logo, 0, 0, widthPx, heightPx)
    ctx.restore()
  }

  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'

  const maxWidth = widthPx * 0.9
  let fontSize = heightPx * 0.3 * scale
  const minFont = 10

  while (fontSize > minFont) {
    ctx.font = `bold ${fontSize}px Arial`
    if (ctx.measureText(String(produto.nome || '')).width <= maxWidth) break
    fontSize -= 1
  }

  ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.08))
  ctx.strokeStyle = '#ffffff'
  ctx.strokeText(String(produto.nome || ''), widthPx / 2, heightPx * 0.35)
  ctx.fillText(String(produto.nome || ''), widthPx / 2, heightPx * 0.35)

  const barcodeCanvas = document.createElement('canvas')
  JsBarcode(barcodeCanvas, String(produto.cod || produto.cod_barra || produto.id), {
    format: 'CODE128',
    width: Math.max(2, Math.round(widthPx / 210)),
    height: heightPx * 0.38,
    displayValue: false,
    margin: Math.max(3, Math.round(widthPx * 0.008)),
    background: '#ffffff',
    lineColor: '#111111'
  })

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(barcodeCanvas, widthPx * 0.1, heightPx * 0.5, widthPx * 0.8, heightPx * 0.4)
  ctx.restore()

  return canvas
}


function sanitizeFilePart(value, fallback = 'produto') {
  const sanitized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')

  return sanitized || fallback
}

function getLabelFileName(produto) {
  const nome = sanitizeFilePart(produto?.nome, 'produto')
  const codigo = sanitizeFilePart(produto?.cod || produto?.cod_barra || produto?.id, 'sem-codigo')
  return `${nome} - ${codigo}.png`
}


function getCategoryName(produto) {
  return String(produto?.categoria || '').trim() || 'Sem categoria'
}

function getCategoryKey(produto) {
  return getCategoryName(produto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function makeUniqueFileName(originalName, usedNames) {
  const count = usedNames.get(originalName) || 0
  usedNames.set(originalName, count + 1)

  return count === 0
    ? originalName
    : originalName.replace(/\.png$/i, ` (${count + 1}).png`)
}

async function createLabelZip(products, model) {
  const files = []
  const usedNames = new Map()

  for (const item of products) {
    const labelCanvas = await createLabelImage(item, model)
    const blob = await new Promise((resolve, reject) => {
      labelCanvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('Não foi possível gerar uma das etiquetas.'))
      }, 'image/png')
    })

    files.push({
      name: makeUniqueFileName(getLabelFileName(item), usedNames),
      data: new Uint8Array(await blob.arrayBuffer())
    })
  }

  return createZipBlob(files)
}

function groupProductsForZip(products) {
  const categories = new Map()

  for (const produto of products) {
    const key = getCategoryKey(produto)
    const existing = categories.get(key)

    if (existing) {
      existing.products.push(produto)
    } else {
      categories.set(key, {
        name: getCategoryName(produto),
        products: [produto]
      })
    }
  }

  const separate = []
  const unified = []

  for (const category of categories.values()) {
    if (category.products.length > 5) {
      separate.push(category)
    } else {
      unified.push(...category.products)
    }
  }

  return { separate, unified }
}

function crc32(bytes) {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function uint16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff])
}

function uint32(value) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  ])
}

function concatBytes(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(size)
  let offset = 0

  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }

  return output
}

async function createZipBlob(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let localOffset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const data = file.data
    const checksum = crc32(data)

    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes
    ])

    localParts.push(localHeader, data)

    const centralHeader = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(localOffset),
      nameBytes
    ])

    centralParts.push(centralHeader)
    localOffset += localHeader.length + data.length
  }

  const localData = concatBytes(localParts)
  const centralDirectory = concatBytes(centralParts)
  const endRecord = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(localData.length),
    uint16(0)
  ])

  return new Blob([localData, centralDirectory, endRecord], { type: 'application/zip' })
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PrintDialogContent({
  produto,
  produtos = [],
  bulk = false,
  onCancel
}) {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)
  const [model, setModel] = useState('A4256')
  const [isDownloading, setIsDownloading] = useState(false)

  const selectedProducts = useMemo(() => {
    if (Array.isArray(produtos) && produtos.length > 0) return produtos.filter(Boolean)
    return produto ? [produto] : []
  }, [produto, produtos])

  useEffect(() => {
    let active = true

    async function renderPreview() {
      const firstProduct = selectedProducts[0]
      if (!firstProduct) {
        setImage(null)
        return
      }

      const labelCanvas = await createLabelImage(firstProduct, model)
      if (!active) return

      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = labelCanvas.width
        canvas.height = labelCanvas.height
        canvas.getContext('2d').drawImage(labelCanvas, 0, 0)
      }
      setImage(labelCanvas.toDataURL('image/png'))
    }

    renderPreview()
    return () => {
      active = false
    }
  }, [selectedProducts, model])

  const handleDownload = async () => {
    if (selectedProducts.length === 0) return

    setIsDownloading(true)
    try {
      // Fluxo unitário: baixa diretamente um PNG.
      if (selectedProducts.length === 1) {
        const item = selectedProducts[0]
        const labelCanvas = await createLabelImage(item, model)
        const blob = await new Promise((resolve, reject) => {
          labelCanvas.toBlob((result) => {
            if (result) resolve(result)
            else reject(new Error('Não foi possível gerar a etiqueta.'))
          }, 'image/png')
        })

        downloadBlob(blob, getLabelFileName(item))
        return
      }

      // Fluxo múltiplo: categorias com mais de 5 itens recebem ZIP próprio.
      // Categorias com até 5 itens são reunidas em um ZIP unificado.
      const { separate, unified } = groupProductsForZip(selectedProducts)

      for (const category of separate) {
        const zipBlob = await createLabelZip(category.products, model)
        const categoryName = sanitizeFilePart(category.name, 'Sem categoria')
        downloadBlob(zipBlob, `Etiqueta ${categoryName}.zip`)
      }

      if (unified.length > 0) {
        const zipBlob = await createLabelZip(unified, model)
        downloadBlob(zipBlob, 'Etiquetas Diversas.zip')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  if (selectedProducts.length === 0) return null

  return (
    <div className="space-y-4">
      {bulk && (
        <p className="text-sm text-muted-foreground">
          {selectedProducts.length} produto(s) selecionado(s). A imagem abaixo é a prévia do modelo escolhido.
        </p>
      )}

      <div>
        <label className="text-sm font-medium">Modelo Pimaco</label>
        <select
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="mt-1 w-full rounded border bg-transparent px-2 py-2"
        >
          {Object.keys(LABEL_MODELS).map((key) => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {image && (
        <div className="flex justify-center rounded border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Prévia da etiqueta" />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={handleDownload} disabled={!image || isDownloading}>
          {isDownloading
            ? 'Gerando arquivo...'
            : bulk ? `Baixar ${selectedProducts.length} etiqueta(s)` : 'Baixar etiqueta'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
