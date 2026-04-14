'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, Camera } from 'lucide-react'

export default function BarcodeScannerCard({
  barcodeInput,
  barcodeProduct,
  scanQuantity,
  handleBarcodeScan,
  handleBarcodeKeyDown,
  setBarcodeInput,
  setBarcodeProduct,
  setScanQuantity,
  openMovimentoDialog,
  produtos
}) {
  const videoRef = useRef(null)
  const codeReader = useRef(null)
  const controlsRef = useRef(null)

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [modo, setModo] = useState('saida')

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader()

    return () => {
      stopCamera()
    }
  }, [])


  const startCamera = async () => {
    setIsCameraOpen(true)

    try {
      controlsRef.current = await codeReader.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result) {
            const code = result.getText()

            if (code === lastScan) return

            setLastScan(code)
            setScanSuccess(true)

            navigator.vibrate?.(150)
            setTimeout(() => setScanSuccess(false), 300)

            setBarcodeInput(code)

            const produto = produtos.find(
              (p) => p.cod_barra === code || p.cod === code
            )

            if (produto) {
              setBarcodeProduct(produto)

              setTimeout(() => {
                openMovimentoDialog(produto, modo, scanQuantity)
              }, 200)
            } else {
              setBarcodeProduct(null)
            }
          }
        }
      )
    } catch (err) {
      console.error(err)
      alert('Erro ao acessar câmera')
      setIsCameraOpen(false)
    }
  }


  const stopCamera = () => {
    setIsCameraOpen(false)

    try {
      controlsRef.current?.stop()
    } catch (err) {
      console.warn('Erro ao parar câmera:', err)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Leitor de Código
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={isCameraOpen ? stopCamera : startCamera}
          >
            <Camera className="h-4 w-4 mr-1" />
            {isCameraOpen ? 'Fechar' : 'Câmera'}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>

        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={modo === 'entrada' ? 'default' : 'outline'}
            onClick={() => setModo('entrada')}
          >
            📥 Entrada
          </Button>

          <Button
            size="sm"
            variant={modo === 'saida' ? 'destructive' : 'outline'}
            onClick={() => setModo('saida')}
          >
            📤 Saída
          </Button>
        </div>

        {isCameraOpen && (
          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="w-full rounded-lg border"
            />

            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`w-64 h-32 border-2 rounded-lg transition-all duration-200 ${scanSuccess
                  ? 'border-green-400 shadow-lg shadow-green-400/50'
                  : 'border-white'
                  }`}
              />
            </div>

            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white">
              Aponte para o código
            </p>

            <p className="absolute top-2 left-0 right-0 text-center text-xs text-white">
              {modo === 'entrada' ? '📥 Entrada' : '📤 Saída'}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-sm">Código</Label>

            <Input
              value={barcodeInput}
              onChange={handleBarcodeScan || (() => { })}
              onKeyDown={handleBarcodeKeyDown || (() => { })}
              placeholder="Escaneie ou digite"
              readOnly={isCameraOpen}
            />
          </div>

          <Button
            variant="outline"
            className="sm:self-end"
            onClick={() => {
              setBarcodeInput('')
              setBarcodeProduct(null)
              setScanQuantity(1)
              setLastScan(null)
            }}
          >
            Limpar
          </Button>
        </div>

        {barcodeProduct && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <p className="font-semibold">{barcodeProduct.nome}</p>
            <p className="text-xs text-muted-foreground">
              Estoque: {barcodeProduct.estoque}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setScanQuantity(q => Math.max(1, q - 1))}>
                -
              </Button>

              <span className="font-semibold">{scanQuantity}</span>

              <Button size="sm" variant="outline" onClick={() => setScanQuantity(q => q + 1)}>
                +
              </Button>

              <Button size="sm" onClick={() => openMovimentoDialog(barcodeProduct, 'entrada', scanQuantity)}>
                Entrada
              </Button>

              <Button size="sm" variant="destructive" onClick={() => openMovimentoDialog(barcodeProduct, 'saida', scanQuantity)}>
                Saída
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}