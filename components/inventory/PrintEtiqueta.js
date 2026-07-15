'use client'

import JsBarcode from 'jsbarcode'
import { useEffect, useRef, useState } from 'react'

/**
 * Gera uma ou mais copias imprimiveis da etiqueta de um produto.
 */
export default function PrintEtiqueta({ produto, copies = 1 }) {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!produto) {
      setImage(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const scale = 2

    canvas.width = 600 * scale
    canvas.height = 240 * scale
    canvas.style.width = '600px'
    canvas.style.height = '240px'
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 600, 240)

    const img = new Image()
    img.src = '/ige-supergesso.svg'

    const renderLabel = () => {
      if (img.complete && img.naturalWidth > 0) {
        ctx.save()
        ctx.globalAlpha = 0.22
        ctx.drawImage(img, 0, 0, 600, 240)
        ctx.restore()
        ctx.drawImage(img, 10, 10, 120, 40)
      }

      ctx.fillStyle = '#000'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(String(produto.cod || ''), 590, 30)

      ctx.font = 'bold 22px Arial'
      ctx.textAlign = 'center'
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ffffff'
      ctx.strokeText(String(produto.nome || ''), 300, 90)
      ctx.fillText(String(produto.nome || ''), 300, 90)

      const barcodeCanvas = document.createElement('canvas')
      JsBarcode(barcodeCanvas, String(produto.cod || produto.cod_barra || produto.id), {
        format: 'CODE128',
        width: 3,
        height: 78,
        displayValue: false,
        margin: 4,
        background: '#ffffff',
        lineColor: '#111111'
      })

      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(barcodeCanvas, 50, 110, 500, 80)
      ctx.restore()

      setImage(canvas.toDataURL('image/png'))
    }

    img.onload = renderLabel
    img.onerror = renderLabel
  }, [produto])

  if (!produto) return null

  const safeCopies = Math.max(1, Math.floor(Number(copies) || 1))

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {image && Array.from({ length: safeCopies }, (_, index) => (
        <div className="print-label-item" key={`${produto.id || produto.cod}-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Etiqueta de ${produto.nome}`} />
        </div>
      ))}
    </>
  )
}
