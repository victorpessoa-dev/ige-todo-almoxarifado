'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, Camera, CameraOff, History, Volume2 } from 'lucide-react'

const CAMERA_HELP = 'No celular, permita o acesso a camera para escanear.'
const MAX_HISTORY_ITEMS = 8

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
  const audioContextRef = useRef(null)
  const scanHistoryRef = useRef([])

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [modo, setModo] = useState('saida')
  const [scanMode, setScanMode] = useState('single')
  const [cameraError, setCameraError] = useState('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [scanHistory, setScanHistory] = useState([])
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader()
    const userAgent = navigator.userAgent || ''
    const mobileMatch =
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|BlackBerry|webOS/i.test(
        userAgent
      )

    setIsMobileDevice(mobileMatch)

    return () => {
      if (scanResetTimeoutRef.current) {
        clearTimeout(scanResetTimeoutRef.current)
      }

      stopCamera()
      audioContextRef.current?.close?.().catch?.(() => {})
    }
  }, [])

  useEffect(() => {
    scanHistoryRef.current = scanHistory
  }, [scanHistory])

  const stopCamera = () => {
    setIsCameraOpen(false)
    setIsStartingCamera(false)
    setScanSuccess(false)
    lastScanRef.current = null

    if (scanResetTimeoutRef.current) {
      clearTimeout(scanResetTimeoutRef.current)
      scanResetTimeoutRef.current = null
    }

    try {
      controlsRef.current?.stop()
    } catch {}

    try {
      codeReaderRef.current?.reset()
    } catch {}

    controlsRef.current = null

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
  }

  const optimizeCameraTrack = async (stream) => {
    const track = stream?.getVideoTracks?.()[0]
    if (!track || typeof track.getCapabilities !== 'function') return

    try {
      const capabilities = track.getCapabilities()
      const advanced = []

      if (
        Array.isArray(capabilities.focusMode) &&
        capabilities.focusMode.includes('continuous')
      ) {
        advanced.push({ focusMode: 'continuous' })
      }

      if (
        typeof capabilities.zoom?.min === 'number' &&
        typeof capabilities.zoom?.max === 'number'
      ) {
        const zoomTarget = Math.min(
          capabilities.zoom.max,
          Math.max(capabilities.zoom.min, 1.5)
        )

        if (Number.isFinite(zoomTarget)) {
          advanced.push({ zoom: zoomTarget })
        }
      }

      if (advanced.length > 0) {
        await track.applyConstraints({ advanced })
      }
    } catch (error) {
      console.warn('Nao foi possivel otimizar foco da camera:', error)
    }
  }

  const playScanSound = async () => {
    if (typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextClass()
    }

    const ctx = audioContextRef.current

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        return
      }
    }

    const now = ctx.currentTime
    const notes = [
      { at: 0, frequency: 1568, duration: 0.05 },
      { at: 0.075, frequency: 2093, duration: 0.05 }
    ]

    notes.forEach(({ at, frequency, duration }) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(frequency, now + at)

      gain.gain.setValueAtTime(0.0001, now + at)
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + duration)

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.start(now + at)
      oscillator.stop(now + at + duration)
    })
  }

  const registerHistoryItem = (produto, code) => {
    const historyKey = `${modo}:${produto?.id || code}`
    const timestamp = new Date().toISOString()
    const existingItem = scanHistoryRef.current.find((item) => item.key === historyKey)
    const nextQuantity = existingItem ? existingItem.quantidade + 1 : 1

    setScanHistory((prev) => {
      const updatedItem = {
        key: historyKey,
        code,
        produto,
        nome: produto?.nome || 'Codigo nao encontrado',
        modo,
        quantidade: nextQuantity,
        lastScannedAt: timestamp,
        found: Boolean(produto)
      }

      return [updatedItem, ...prev.filter((item) => item.key !== historyKey)].slice(
        0,
        MAX_HISTORY_ITEMS
      )
    })

    return nextQuantity
  }

  const handleScanResult = (result, error) => {
    if (error && error?.name !== 'NotFoundException') {
      console.error('Erro durante leitura do codigo:', error)
    }

    if (!result) return

    const code = result.getText()
    if (!code || code === lastScanRef.current) return

    lastScanRef.current = code
    setScanSuccess(true)
    setBarcodeInput(code)
    playScanSound()

    navigator.vibrate?.(150)

    if (scanResetTimeoutRef.current) {
      clearTimeout(scanResetTimeoutRef.current)
    }

    scanResetTimeoutRef.current = setTimeout(() => {
      setScanSuccess(false)
      lastScanRef.current = null
    }, 900)

    const produto = produtos.find(
      (p) => p.cod_barra === code || p.cod === code
    )

    if (produto) {
      setBarcodeProduct(produto)
      const nextQuantity = registerHistoryItem(produto, code)

      if (scanMode === 'single') {
        setScanQuantity(1)
        stopCamera()

        setTimeout(() => {
          openMovimentoDialog(produto, modo, 1)
        }, 150)
      } else {
        setScanQuantity(nextQuantity)
      }
    } else {
      setBarcodeProduct(null)
      registerHistoryItem(null, code)
    }
  }

  const startCamera = async () => {
    if (isStartingCamera) return
    if (!isMobileDevice) {
      setCameraError('A camera do scanner esta disponivel somente no celular.')
      return
    }

    stopCamera()
    setCameraError('')
    setIsStartingCamera(true)

    try {
      await new Promise((r) => setTimeout(r, 150))

      if (!videoRef.current) {
        throw new Error('Elemento de video nao disponivel')
      }

      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 4 / 3 }
        }
      }

      controlsRef.current = await codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        handleScanResult
      )

      await optimizeCameraTrack(videoRef.current.srcObject)
      setIsCameraOpen(true)

      setTimeout(() => {
        videoRef.current?.play().catch(() => {})
      }, 300)
    } catch (err) {
      console.error('Erro ao iniciar camera:', err)
      setCameraError(err.message || 'Erro ao iniciar camera')
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
            Leitor de Codigo
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={isCameraOpen ? stopCamera : startCamera}
            disabled={isStartingCamera || (!isMobileDevice && !isCameraOpen)}
          >
            {isCameraOpen ? (
              <CameraOff className="mr-1 h-4 w-4" />
            ) : (
              <Camera className="mr-1 h-4 w-4" />
            )}
            {isStartingCamera ? 'Abrindo...' : isCameraOpen ? 'Fechar' : 'Camera'}
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
            Saida
          </Button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={scanMode === 'single' ? 'secondary' : 'outline'}
            onClick={() => setScanMode('single')}
          >
            Leitura unica
          </Button>

          <Button
            type="button"
            size="sm"
            variant={scanMode === 'continuous' ? 'secondary' : 'outline'}
            onClick={() => setScanMode('continuous')}
          >
            Scan continuo
          </Button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{CAMERA_HELP}</p>
        {!isMobileDevice && (
          <p className="mb-3 text-xs text-amber-600">
            A camera fica habilitada apenas no celular. No computador, use a digitacao manual.
          </p>
        )}
        {scanMode === 'continuous' && (
          <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Volume2 className="h-3.5 w-3.5" />
            Cada leitura toca um bip e soma no historico em tempo real.
          </p>
        )}

        {(isCameraOpen || isStartingCamera) && (
          <div className="mb-4 overflow-hidden rounded-xl border bg-black">
            <div className="relative aspect-[4/3] w-full">
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
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
                    >
                      <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-red-400/90 shadow-[0_0_12px_rgba(248,113,113,0.8)]" />
                    </div>
                  </div>

                  <p className="absolute top-3 w-full text-center text-xs text-white">
                    {modo === 'entrada' ? 'Modo entrada' : 'Modo saida'}
                  </p>

                  <p className="absolute bottom-3 w-full text-center text-xs text-white">
                    Use a camera traseira e aproxime ate o codigo ficar nitido
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
            <Label className="text-sm">Codigo</Label>

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
                Produto identificado no scan continuo. A camera segue aberta e a quantidade vai sendo somada.
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
                onClick={() =>
                  openMovimentoDialog(barcodeProduct, 'entrada', scanQuantity)
                }
              >
                Entrada
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() =>
                  openMovimentoDialog(barcodeProduct, 'saida', scanQuantity)
                }
              >
                Saida
              </Button>
            </div>
          </div>
        )}

        {scanMode === 'continuous' && (
          <div className="mt-4 rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <p className="font-medium">Historico em tempo real</p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setScanHistory([])
                  setBarcodeProduct(null)
                  setBarcodeInput('')
                  setScanQuantity(1)
                }}
              >
                Limpar historico
              </Button>
            </div>

            {scanHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                As leituras do scan continuo vao aparecer aqui com quantidade acumulada.
              </p>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Codigo: {item.code} - {item.modo === 'entrada' ? 'Entrada' : 'Saida'} - Qtde:{' '}
                        {item.quantidade}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.found && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setBarcodeInput(item.code)
                              setBarcodeProduct(item.produto)
                              setScanQuantity(item.quantidade)
                            }}
                          >
                            Selecionar
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant={item.modo === 'entrada' ? 'default' : 'destructive'}
                            onClick={() =>
                              openMovimentoDialog(
                                item.produto,
                                item.modo,
                                item.quantidade
                              )
                            }
                          >
                            Lancar {item.quantidade}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
