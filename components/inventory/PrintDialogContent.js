'use client'

import Barcode from 'react-barcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PrintDialogContent({ produto, printCopies, setPrintCopies, onPrint, onCancel }) {
  if (!produto) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="border p-4 rounded-lg bg-white">
        <div className="text-black">
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

            <div className="bg-white p-2 border rounded flex flex-col items-center">
                <Barcode
                    value={String(produto.cod)}
                    format="CODE128"
                    width={2}
                    height={40}
                    displayValue={false}
                />
            </div>
        </div>
        </div>
      <div className="grid gap-3">
        <div className="flex gap-3 items-center space-y-2">
          <div className="flex-1 space-y-1 ">
            <Label htmlFor="print-copies">Quantidade de etiquetas</Label>
            <Input
              id="print-copies"
              type="number"
              min={1}
              max={100}
              value={printCopies}
              onChange={(event) => setPrintCopies(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
            />
          <div className="text-sm text-muted-foreground">
            Cada folha A4 cabe até 14 códigos em duas colunas de 7 etiquetas (10cm x 3.8cm cada).
          </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onPrint} className="flex-1">
            Imprimir
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
