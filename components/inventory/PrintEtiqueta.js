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

    // tamanho da etiqueta (em px - alta qualidade)
    canvas.width = 600
    canvas.height = 240

    // fundo branco
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // carregar logo
    const img = new Image()
    img.src = '/ige-supergesso.png'

    img.onload = () => {
      // logo
      ctx.drawImage(img, 10, 10, 120, 40)

      // código
      ctx.fillStyle = '#000'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(produto.cod, canvas.width - 10, 30)

      // nome produto
      ctx.font = 'bold 22px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(produto.nome, canvas.width / 2, 90)

      // gerar código de barras em outro canvas
      const barcodeCanvas = document.createElement('canvas')

      JsBarcode(barcodeCanvas, String(produto.cod), {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: false,
        margin: 0
      })

      // desenhar barcode
      ctx.drawImage(barcodeCanvas, 50, 110, 500, 80)

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