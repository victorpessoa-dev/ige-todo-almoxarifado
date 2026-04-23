'use client'

import JsBarcode from 'jsbarcode'
import { useEffect, useRef, useState } from 'react'

export default function PrintEtiqueta({ produto }) {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!produto) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const scale = 2

    // tamanho da etiqueta (em px - alta qualidade)
    canvas.width = 600 * scale
    canvas.height = 240 * scale
    canvas.style.width = '600px'
    canvas.style.height = '240px'
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // fundo branco
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 600, 240)

    // carregar logo
    const img = new Image()
    img.src = '/ige-supergesso.png'

    img.onload = () => {
      ctx.save()
      ctx.globalAlpha = 0.12
      ctx.drawImage(img, 0, 0, 600, 240)
      ctx.restore()

      // logo
      ctx.drawImage(img, 10, 10, 120, 40)

      // código
      ctx.fillStyle = '#000'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(produto.cod, 590, 30)

      // nome produto
      ctx.font = 'bold 22px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(produto.nome, 300, 90)

      // gerar código de barras em outro canvas
      const barcodeCanvas = document.createElement('canvas')

      JsBarcode(barcodeCanvas, String(produto.cod), {
        format: 'CODE128',
        width: 3,
        height: 78,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#111111'
      })

      // desenhar barcode
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(barcodeCanvas, 50, 110, 500, 80)
      ctx.restore()

      // converter para imagem
      const url = canvas.toDataURL('image/png')
      setImage(url)
    }
  }, [produto])

  if (!produto) return null

  return (
    <div className="flex flex-col items-center gap-4">
      {/* canvas oculto */}
      <canvas ref={canvasRef} className="hidden" />

      {/* imagem gerada */}
      {image && (
        <>
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
