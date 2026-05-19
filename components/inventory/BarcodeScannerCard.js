'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, Camera, CameraOff, History, Sparkles, Volume2, ZoomIn } from 'lucide-react'

const CAMERA_HELP = 'No celular, permita o acesso a camera para escanear.'
const MAX_HISTORY_ITEMS = 8
const DEFAULT_CAMERA_ZOOM = 1.5

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

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
  const [productSearch, setProductSearch] = useState('')
  const [isAiHelping, setIsAiHelping] = useState(false)
  const [zoomValue, setZoomValue] = useState(1)
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 2, step: 0.1 })
  const [isZoomSupported, setIsZoomSupported] = useState(false)

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(productSearch)

    if (!normalizedSearch) return []

    return produtos
      .filter((produto) => normalizeText(produto.nome).includes(normalizedSearch))
      .slice(0, 8)
  }, [productSearch, produtos])

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
    setIsZoomSupported(false)

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
  }

  const clampZoom = (value, range = zoomRange) => {
    const parsedValue = Number(value)
    if (!Number.isFinite(parsedValue)) return range.min

    return Math.min(range.max, Math.max(range.min, parsedValue))
  }

  const applyCameraZoom = async (value) => {
    const track = videoRef.current?.srcObject?.getVideoTracks?.()[0]
    if (!track || typeof track.applyConstraints !== 'function') return

    const nextZoom = clampZoom(value)
    setZoomValue(nextZoom)

    try {
      await track.applyConstraints({
        advanced: [{ zoom: nextZoom }]
      })
    } catch (error) {
      console.warn('Nao foi possivel ajustar o zoom da camera:', error)
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
        const nextRange = {
          min: capabilities.zoom.min,
          max: capabilities.zoom.max,
          step: capabilities.zoom.step || 0.1
        }
        const zoomTarget = clampZoom(
          zoomValue > nextRange.min ? zoomValue : DEFAULT_CAMERA_ZOOM,
          nextRange
        )

        if (Number.isFinite(zoomTarget)) {
          setZoomRange(nextRange)
          setZoomValue(zoomTarget)
          setIsZoomSupported(nextRange.max > nextRange.min)
          advanced.push({ zoom: zoomTarget })
        }
      } else {
        setZoomRange({ min: 1, max: 2, step: 0.1 })
        setZoomValue(1)
        setIsZoomSupported(false)
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
        throw new Error('Nao foi possivel preparar a camera agora.')
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
      setCameraError('Nao foi possivel abrir a camera. Tente novamente.')
      stopCamera()
    } finally {
      setIsStartingCamera(false)
    }
  }

  const selectProductByName = (produto) => {
    setBarcodeProduct(produto)
    setBarcodeInput(produto.cod_barra || String(produto.cod || ''))
    setScanQuantity(1)
    setProductSearch(produto.nome)
  }

  const handleAiAssist = async () => {
    if (!videoRef.current || isAiHelping) return

    try {
      setIsAiHelping(true)
      setCameraError('')

      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setCameraError('Nao foi possivel preparar a ajuda por imagem.')
        return
      }

      ctx.drawImage(videoRef.current, 0, 0)

      const image = canvas.toDataURL('image/jpeg', 0.75)
      const response = await fetch('/api/inventory-scan-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          produtos: produtos.map((produto) => ({
            id: produto.id,
            cod: produto.cod,
            cod_barra: produto.cod_barra,
            nome: produto.nome
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setCameraError(data?.error || 'Nao foi possivel usar a ajuda por imagem agora.')
        return
      }

      if (data?.match) {
        selectProductByName(data.match)
        setCameraError('')
        return
      }

      if (data?.suggestion?.productName) {
        setProductSearch(data.suggestion.productName)
      }

      setCameraError('A ajuda por imagem nao conseguiu localizar o produto com seguranca.')
    } catch (error) {
      console.error('Erro na ajuda por imagem do scanner:', error)
      setCameraError('Nao foi possivel usar a ajuda por imagem agora.')
    } finally {
      setIsAiHelping(false)
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
        <p className="mb-3 text-xs text-muted-foreground">
          Se a etiqueta estiver pequena demais para a camera, busque pelo nome do produto.
        </p>
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

            {isCameraOpen && (
              <div className="border-t border-white/10 bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <Label className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {zoomValue.toFixed(1)}x
                  </span>
                </div>

                <Slider
                  value={[zoomValue]}
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step}
                  disabled={!isZoomSupported}
                  onValueChange={(value) => {
                    const nextZoom = value[0]
                    setZoomValue(nextZoom)
                    applyCameraZoom(nextZoom)
                  }}
                  aria-label="Zoom da camera"
                />

                {!isZoomSupported && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Este aparelho nao liberou zoom manual para o navegador.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isCameraOpen && (
          <div className="mb-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAiAssist}
              disabled={isAiHelping}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isAiHelping ? 'Analisando imagem...' : 'Ajuda por IA'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Use quando a camera nao conseguir ler uma etiqueta pequena. A IA tenta achar o codigo ou o nome do produto na imagem atual.
            </p>
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
              setProductSearch('')
              setScanSuccess(false)
              lastScanRef.current = null
              setCameraError('')
            }}
          >
            Limpar
          </Button>
        </div>

        <div className="mt-4">
          <Label className="text-sm">Buscar por nome do produto</Label>

          <Input
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && filteredProducts[0]) {
                event.preventDefault()
                selectProductByName(filteredProducts[0])
              }
            }}
            placeholder="Digite o nome do produto"
          />

          {productSearch && (
            <div className="mt-2 rounded-lg border bg-card">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((produto) => (
                  <button
                    key={produto.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
                    onClick={() => selectProductByName(produto)}
                  >
                    <span className="min-w-0 truncate font-medium">{produto.nome}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Estoque: {produto.estoque}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhum produto encontrado com esse nome.
                </p>
              )}
            </div>
          )}
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
