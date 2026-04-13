'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode } from 'lucide-react'

export default function BarcodeScannerCard({
  barcodeInput,
  barcodeProduct,
  scanQuantity,
  handleBarcodeScan,
  handleBarcodeKeyDown,
  setBarcodeInput,
  setBarcodeProduct,
  setScanQuantity,
  openMovimentoDialog
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          Leitor de Código de Barras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="barcode-input" className="text-sm font-medium py-2">
              Escanear Código de Barras
            </Label>
            <Input
              id="barcode-input"
              value={barcodeInput}
              onChange={handleBarcodeScan}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Posicione o cursor aqui e escaneie"
              autoFocus
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setBarcodeInput('')
              setBarcodeProduct(null)
              setScanQuantity(1)
            }}
            className="self-end"
          >
            Limpar
          </Button>
        </div>

        {barcodeInput && (
          <p className="text-sm text-muted-foreground mt-2">
            Código escaneado: {barcodeInput}
          </p>
        )}

        {barcodeProduct ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-700">Produto encontrado:</p>
              <div className="rounded-lg bg-white p-3 shadow-sm">
                <p className="font-semibold text-slate-900">{barcodeProduct.nome}</p>
                <p className="text-xs text-slate-500">Cód: {barcodeProduct.cod}</p>
                <p className="text-xs text-slate-500">Estoque atual: {barcodeProduct.estoque}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setScanQuantity((prev) => Math.max(1, prev - 1))}>
                -
              </Button>
              <div className="min-w-[3rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-base font-semibold">
                {scanQuantity}
              </div>
              <Button size="sm" variant="outline" onClick={() => setScanQuantity((prev) => prev + 1)}>
                +
              </Button>
              <Button size="sm" onClick={() => openMovimentoDialog(barcodeProduct, 'entrada', scanQuantity)}>
                Entrada
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openMovimentoDialog(barcodeProduct, 'saida', scanQuantity)}>
                Saída
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pressione Enter para abrir o diálogo de saída automaticamente.
            </p>
          </div>
        ) : barcodeInput ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Produto não encontrado para este código.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
