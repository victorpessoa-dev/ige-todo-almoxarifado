'use client'

import JsBarcode from 'jsbarcode'
import { useEffect, useRef } from 'react'

export default function PrintEtiqueta({ produto, copies = 1 }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!produto || !containerRef.current) return

    const canvases = containerRef.current.querySelectorAll('canvas')

    canvases.forEach((canvas) => {
      JsBarcode(canvas, String(produto.cod), {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: false
      })
    })
  }, [produto, copies])

  if (!produto) return null

  return (
    <div ref={containerRef} className="print-area hidden print:grid">
      {Array.from({ length: copies }).map((_, i) => (
        <div key={i} className="label">

          <div className="flex justify-between items-center mb-2">
            <img
                src="/ige-supergesso.png"
                alt={produto.nome}
                className="h-8 w-auto"
            />

            <div className="font-mono text-sm">
                {produto.cod}
            </div>
        </div>
          
        <div className="text-lg font-semibold text-center mb-2">
        {produto.nome}
        </div>

         <div className="flex flex-col items-center">
            <canvas />
        </div>
        </div>
      ))}
    </div>
  )
}