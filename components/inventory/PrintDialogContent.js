'use client'

import JsBarcode from 'jsbarcode'
import { useEffect, useRef, useState } from 'react'
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

export default function PrintDialogContent({ produto, onCancel }) {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)
  const [model, setModel] = useState('A4256')

  useEffect(() => {
    if (!produto) return

    const { width, height, scale } = LABEL_MODELS[model]

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const pxScale = 180
    const widthPx = width * pxScale
    const heightPx = height * pxScale

    canvas.width = widthPx
    canvas.height = heightPx

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, widthPx, heightPx)

    const img = new Image()
    img.src = '/ige-supergesso.png'

    img.onload = () => {
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.drawImage(img, 0, 0, widthPx, heightPx)
      ctx.restore()

      ctx.fillStyle = '#000'
      ctx.textAlign = 'center'

      const maxWidth = widthPx * 0.9
      let fontSize = heightPx * 0.3 * scale
      const minFont = 10

      while (fontSize > minFont) {
        ctx.font = `bold ${fontSize}px Arial`
        const textWidth = ctx.measureText(produto.nome).width

        if (textWidth <= maxWidth) break
        fontSize -= 1
      }

      ctx.fillText(produto.nome, widthPx / 2, heightPx * 0.35)

      const barcodeCanvas = document.createElement('canvas')

      JsBarcode(barcodeCanvas, String(produto.cod), {
        format: 'CODE128',
        width: Math.max(2, Math.round(widthPx / 210)),
        height: heightPx * 0.38,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#111111'
      })

      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        barcodeCanvas,
        widthPx * 0.1,
        heightPx * 0.5,
        widthPx * 0.8,
        heightPx * 0.4
      )
      ctx.restore()

      setImage(canvas.toDataURL('image/png'))
    }
  }, [produto, model])

  const download = () => {
    if (!image) return

    const link = document.createElement('a')
    link.href = image
    link.download = `${model}-${produto.cod}.png`
    link.click()
  }

  if (!produto) return null

  return (
    <div className="space-y-4">

      <div>
        <label className="text-sm text-white font-medium">Modelo Pimaco</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full border rounded px-2 py-2 mt-1 bg-transparent text-white"
        >
          {Object.keys(LABEL_MODELS).map((key) => (
            <option key={key} value={key} className="bg-secondary text-white">
              {key}
            </option>
          ))}
        </select>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {image && (
        <div className="border p-4 rounded bg-white flex justify-center">
          <img src={image} alt="Etiqueta" />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={download} className="flex-1">
          Baixar Imagem
        </Button>

        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
