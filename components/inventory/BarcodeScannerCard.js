'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, Camera, CameraOff } from 'lucide-react'

const CAMERA_HELP = 'No celular, permita o acesso à câmera para escanear.'

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
  const codeReaderRef = useRef(null)
  const controlsRef = useRef(null)
  const lastScanRef = useRef(null)
  const scanResetTimeoutRef = useRef(null)

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [modo, setModo] = useState('saida')
  const [scanMode, setScanMode] = useState('single')
  const [cameraError, setCameraError] = useState('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader()

    return () => {
      if (scanResetTimeoutRef.current) {
        clearTimeout(scanResetTimeoutRef.current)
      }

      stopCamera()
    }
  }, [])

  const stopCamera = () => {
    setIsCameraOpen(false)

    if (scanResetTimeoutRef.current) {
      clearTimeout(scanResetTimeoutRef.current)
      scanResetTimeoutRef.current = null
    }

    try {
      controlsRef.current?.stop()
    } catch {}

    controlsRef.current = null

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
  }

  const handleScanResult = (result, error) => {
    if (error && error?.name !== 'NotFoundException') {
      console.error('Erro durante leitura do código:', error)
    }

    if (!result) return

    const code = result.getText()
    if (!code || code === lastScanRef.current) return

    lastScanRef.current = code
    setScanSuccess(true)
    setBarcodeInput(code)

    navigator.vibrate?.(150)

    if (scanResetTimeoutRef.current) {
      clearTimeout(scanResetTimeoutRef.current)
    }

    scanResetTimeoutRef.current = setTimeout(() => {
      setScanSuccess(false)
      lastScanRef.current = null
    }, 1200)

    const produto = produtos.find(
      (p) => p.cod_barra === code || p.cod === code
    )

    if (produto) {
      setBarcodeProduct(produto)

      if (scanMode === 'single') {
        stopCamera()

        setTimeout(() => {
          openMovimentoDialog(produto, modo, scanQuantity)
        }, 150)
      }
    } else {
      setBarcodeProduct(null)
    }
  }

  const startCamera = async () => {
    if (isStartingCamera) return

    setCameraError('')
    setIsStartingCamera(true)

    try {
      await new Promise((r) => setTimeout(r, 150))

      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não disponível')
      }

      controlsRef.current = await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        handleScanResult
      )

      setIsCameraOpen(true)

      setTimeout(() => {
        videoRef.current?.play().catch(() => {})
      }, 300)
    } catch (err) {
      console.error('Erro ao iniciar câmera:', err)
      setCameraError(err.message || 'Erro ao iniciar câmera')
      stopCamera()
    } finally {
      setIsStartingCamera(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Leitor de Código
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={isCameraOpen ? stopCamera : startCamera}
            disabled={isStartingCamera}
          >
            {isCameraOpen ? (
              <CameraOff className="mr-1 h-4 w-4" />
            ) : (
              <Camera className="mr-1 h-4 w-4" />
            )}
            {isStartingCamera ? 'Abrindo...' : isCameraOpen ? 'Fechar' : 'Câmera'}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={modo === 'entrada' ? 'default' : 'outline'}
            onClick={() => setModo('entrada')}
          >
            Entrada
          </Button>

          <Button
            type="button"
            size="sm"
            variant={modo === 'saida' ? 'destructive' : 'outline'}
            onClick={() => setModo('saida')}
          >
            Saída
          </Button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={scanMode === 'single' ? 'secondary' : 'outline'}
            onClick={() => setScanMode('single')}
          >
            Leitura única
          </Button>

          <Button
            type="button"
            size="sm"
            variant={scanMode === 'continuous' ? 'secondary' : 'outline'}
            onClick={() => setScanMode('continuous')}
          >
            Scan contínuo
          </Button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{CAMERA_HELP}</p>

        <div className="mb-4 overflow-hidden rounded-xl border bg-black">
          <div className="relative aspect-[4/3] w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {isCameraOpen && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-black/25" />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                  <div
                    className={`h-32 w-full max-w-72 rounded-xl border-2 ${
                      scanSuccess ? 'border-green-400' : 'border-white'
                    }`}
                  />
                </div>

                <p className="absolute top-3 w-full text-center text-xs text-white">
                  {modo === 'entrada' ? 'Modo entrada' : 'Modo saída'}
                </p>

                <p className="absolute bottom-3 w-full text-center text-xs text-white">
                  Posicione o código dentro da moldura
                </p>
              </>
            )}
          </div>
        </div>

        {cameraError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {cameraError}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Label className="text-sm">Código</Label>

            <Input
              value={barcodeInput}
              onChange={handleBarcodeScan || (() => {})}
              onKeyDown={handleBarcodeKeyDown || (() => {})}
              placeholder="Escaneie ou digite"
              readOnly={isCameraOpen}
              inputMode="numeric"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="sm:self-end"
            onClick={() => {
              setBarcodeInput('')
              setBarcodeProduct(null)
              setScanQuantity(1)
              setScanSuccess(false)
              lastScanRef.current = null
              setCameraError('')
            }}
          >
            Limpar
          </Button>
        </div>

        {barcodeProduct && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="font-semibold">{barcodeProduct.nome}</p>
            <p className="text-xs text-muted-foreground">
              Estoque: {barcodeProduct.estoque}
            </p>
            {scanMode === 'continuous' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Produto identificado no scan contínuo. A câmera segue aberta para novas leituras.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setScanQuantity((q) => Math.max(1, q - 1))}
              >
                -
              </Button>

              <span className="font-semibold">{scanQuantity}</span>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setScanQuantity((q) => q + 1)}
              >
                +
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => openMovimentoDialog(barcodeProduct, 'entrada', scanQuantity)}
              >
                Entrada
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => openMovimentoDialog(barcodeProduct, 'saida', scanQuantity)}
              >
                Saída
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
