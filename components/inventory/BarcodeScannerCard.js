'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, Camera, CameraOff } from 'lucide-react'

const CAMERA_HELP =
  'No celular, permita o acesso à câmera e prefira abrir por HTTPS ou localhost.'

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
  const [environmentInfo, setEnvironmentInfo] = useState({
    origin: '',
    host: '',
    isSecureContext: false,
    hasCameraApi: false,
    isLikelyCameraReady: false
  })

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader()

    const host = window.location.hostname
    const isLocalhost =
      host === 'localhost' || host === '127.0.0.1' || host === '::1'

    setEnvironmentInfo({
      origin: window.location.origin,
      host,
      isSecureContext: window.isSecureContext,
      hasCameraApi: Boolean(navigator.mediaDevices?.getUserMedia),
      isLikelyCameraReady:
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        (window.isSecureContext || isLocalhost)
    })

    return () => {
      if (scanResetTimeoutRef.current) {
        clearTimeout(scanResetTimeoutRef.current)
      }

      stopCamera()
    }
  }, [])

  const resolveCameraError = (error) => {
    if (!window.isSecureContext) {
      return 'A câmera do navegador precisa de HTTPS ou localhost para funcionar.'
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Este navegador não oferece suporte ao acesso da câmera.'
    }

    switch (error?.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permissão da câmera negada. Libere o acesso nas configurações do navegador.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Nenhuma câmera disponível foi encontrada neste aparelho.'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'A câmera já está sendo usada por outro aplicativo ou não pôde ser iniciada.'
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return 'Não foi possível usar a câmera traseira. Tente novamente ou use a digitação manual.'
      default:
        return 'Não foi possível abrir a câmera agora.'
    }
  }

  const stopCamera = () => {
    setIsCameraOpen(false)
    setIsStartingCamera(false)

    if (scanResetTimeoutRef.current) {
      clearTimeout(scanResetTimeoutRef.current)
      scanResetTimeoutRef.current = null
    }

    try {
      controlsRef.current?.stop()
    } catch (error) {
      console.warn('Erro ao parar câmera:', error)
    }

    controlsRef.current = null

    const videoElement = videoRef.current
    if (videoElement?.srcObject) {
      const stream = videoElement.srcObject
      stream.getTracks?.().forEach((track) => track.stop())
      videoElement.srcObject = null
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

    if (!window.isSecureContext) {
      setCameraError(resolveCameraError())
      setIsStartingCamera(false)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(resolveCameraError())
      setIsStartingCamera(false)
      return
    }

    stopCamera()

    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      controlsRef.current = await codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        handleScanResult
      )

      setIsCameraOpen(true)
    } catch (primaryError) {
      try {
        controlsRef.current = await codeReaderRef.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          handleScanResult
        )

        setIsCameraOpen(true)
      } catch (fallbackError) {
        console.error('Erro ao iniciar câmera:', fallbackError)
        setCameraError(resolveCameraError(primaryError || fallbackError))
        stopCamera()
      }
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

        <div
          className={`mb-4 rounded-lg border p-3 text-xs ${
            environmentInfo.isLikelyCameraReady
              ? 'border-green-500/30 bg-green-500/10 text-green-700'
              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700'
          }`}
        >
          <p className="font-medium">
            Ambiente atual:{' '}
            {environmentInfo.isLikelyCameraReady
              ? 'pronto para câmera'
              : 'precisa de atenção'}
          </p>
          <p>Origem: {environmentInfo.origin || 'carregando...'}</p>
          <p>
            Contexto seguro: {environmentInfo.isSecureContext ? 'sim' : 'não'}
          </p>
          <p>
            API de câmera: {environmentInfo.hasCameraApi ? 'disponível' : 'indisponível'}
          </p>
          {!environmentInfo.isLikelyCameraReady && (
            <p className="mt-2">
              Se estiver abrindo pelo celular em `http://IP:porta`, troque para uma
              origem com HTTPS. Nesse cenário a câmera costuma ser bloqueada pelo navegador.
            </p>
          )}
          {scanMode === 'continuous' && (
            <p className="mt-2">
              No modo contínuo, a câmera permanece aberta após a leitura e o item
              encontrado fica disponível logo abaixo para ação manual.
            </p>
          )}
        </div>

        {(isCameraOpen || cameraError) && (
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
                      className={`h-32 w-full max-w-72 rounded-xl border-2 transition-all duration-200 ${
                        scanSuccess
                          ? 'border-green-400 shadow-lg shadow-green-400/50'
                          : 'border-white'
                      }`}
                    />
                  </div>

                  <p className="absolute left-0 right-0 top-3 text-center text-xs text-white">
                    {modo === 'entrada' ? 'Modo entrada' : 'Modo saída'}
                  </p>

                  <p className="absolute bottom-3 left-0 right-0 px-4 text-center text-xs text-white">
                    Posicione o código dentro da moldura
                  </p>
                </>
              )}
            </div>
          </div>
        )}

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
