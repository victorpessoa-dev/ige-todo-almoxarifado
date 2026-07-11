'use client'

import JsBarcode from 'jsbarcode'
import { useEffect, useRef, useState } from 'react'

/**
 * Gera uma etiqueta padrao para produto do inventario.
 *
 * Mantem compatibilidade com o fluxo antigo de impressao, usando canvas para
 * exportar uma imagem pronta com logo, nome e codigo de barras.
 */
export default function PrintEtiqueta({ produto }) {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!produto) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const scale = 2

    // Renderiza em escala maior para preservar nitidez na impressao.
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

    img.onload = () => {
      // A marca d'agua identifica a origem da etiqueta sem disputar contraste
      // com o codigo de barras.
      ctx.save()
      ctx.globalAlpha = 0.22
      ctx.drawImage(img, 0, 0, 600, 240)
      ctx.restore()

      ctx.drawImage(img, 10, 10, 120, 40)

      ctx.fillStyle = '#000'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(produto.cod, 590, 30)

      ctx.font = 'bold 22px Arial'
      ctx.textAlign = 'center'
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ffffff'
      ctx.strokeText(produto.nome, 300, 90)
      ctx.fillText(produto.nome, 300, 90)

      const barcodeCanvas = document.createElement('canvas')

      JsBarcode(barcodeCanvas, String(produto.cod), {
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

      const url = canvas.toDataURL('image/png')
      setImage(url)
    }
  }, [produto])

  if (!produto) return null

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} className="hidden" />

      {image && (
        <>
          {/* Generated label data URL is rendered as-is for print/download fidelity. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Etiqueta" className="border" />

          <a
            href={image}
            download={`etiqueta-${produto.cod}.png`}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Baixar Imagem
          </a>
        </>
      )}
    </div>
  )
}
