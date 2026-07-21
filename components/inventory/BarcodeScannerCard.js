'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserCodeReader, BrowserMultiFormatOneDReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Barcode, Camera, CameraOff, Sparkles, ZoomIn } from 'lucide-react'
import { authenticatedFetch } from '@/lib/api/authenticated-fetch'

const CAMERA_HELP = 'No celular, permita o acesso a câmera para escanear.'
const DEFAULT_CAMERA_ZOOM = 2
const SCANNER_FRAME_WIDTH = 1280
const SCANNER_FRAME_HEIGHT = 720
const SCANNER_DECODE_WIDTH = 960
const SCANNER_DECODE_HEIGHT = 360
const SCANNER_RETRY_DELAY = 320
const SCANNER_SUCCESS_DELAY = 900
const RECENT_SCAN_LOCK_MS = 1400

/**
 * Ajusta o canvas usado internamente pelo ZXing para priorizar a faixa central.
 *
 * As etiquetas do almoxarifado costumam aparecer pequenas no video; reduzir a
 * area de decodificacao melhora desempenho e diminui leituras fora do alvo.
 */
function installScannerCanvasOptimizer() {
  if (BrowserCodeReader.__inventoryScannerCanvasOptimizerInstalled) return

  const originalCreateCaptureCanvas = BrowserCodeReader.createCaptureCanvas
  const originalDrawImageOnCanvas = BrowserCodeReader.drawImageOnCanvas

  BrowserCodeReader.createCaptureCanvas = (mediaElement) => {
    if (mediaElement?.dataset?.inventoryScanner === 'true') {
      const canvas = document.createElement('canvas')
      canvas.style.width = `${SCANNER_DECODE_WIDTH}px`
      canvas.style.height = `${SCANNER_DECODE_HEIGHT}px`
      canvas.width = SCANNER_DECODE_WIDTH
      canvas.height = SCANNER_DECODE_HEIGHT
      return canvas
    }

    return originalCreateCaptureCanvas(mediaElement)
  }

  BrowserCodeReader.drawImageOnCanvas = (canvasContext, srcElement) => {
    if (srcElement?.dataset?.inventoryScanner === 'true') {
      const sourceWidth = srcElement.videoWidth || srcElement.width
      const sourceHeight = srcElement.videoHeight || srcElement.height

      if (!sourceWidth || !sourceHeight) {
        originalDrawImageOnCanvas(canvasContext, srcElement)
        return
      }

      const cropWidth = Math.round(sourceWidth * 0.96)
      const cropHeight = Math.round(sourceHeight * 0.5)
      const cropX = Math.round((sourceWidth - cropWidth) / 2)
      const cropY = Math.round((sourceHeight - cropHeight) / 2)

      canvasContext.drawImage(
        srcElement,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvasContext.canvas.width,
        canvasContext.canvas.height
      )
      return
    }

    originalDrawImageOnCanvas(canvasContext, srcElement)
  }

  BrowserCodeReader.__inventoryScannerCanvasOptimizerInstalled = true
}

/**
 * Define os formatos de codigo de barras aceitos no estoque.
 *
 * Restringir formatos reduz o trabalho do decoder e evita leituras ambiguuas
 * em imagens com muitos textos numericos.
 */
function createScannerHints() {
  const hints = new Map()

  // Limit decoding work to the barcode formats used by inventory labels.
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF
  ])

  return hints
}

/**
 * Normaliza textos para comparar sugestoes da IA com produtos cadastrados.
 *
 * @param {string} value Texto original.
 * @returns {string}
 */
function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Identifica dispositivos moveis para ajustar a experiencia da camera.
 *
 * @returns {boolean}
 */
function detectMobileDevice() {
  if (typeof navigator === 'undefined') return false

  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|BlackBerry|webOS/i.test(
    navigator.userAgent || ''
  )
}

/**
 * Card de leitura de codigo de barras do inventario.
 *
 * Combina entrada manual, camera, zoom e assistencia por imagem sem alterar o
 * fluxo principal de movimentacao de estoque.
 */
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
  const recentScansRef = useRef(new Map())
  const productByCodeRef = useRef(new Map())
  const modoRef = useRef('saida')

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [modo, setModo] = useState('saida')
  const [cameraError, setCameraError] = useState('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [isMobileDevice] = useState(() => detectMobileDevice())
  const [productSearch, setProductSearch] = useState('')
  const [isAiHelping, setIsAiHelping] = useState(false)
  const [zoomValue, setZoomValue] = useState(1)
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 2, step: 0.1 })
  const [isZoomSupported, setIsZoomSupported] = useState(false)

  const productByCode = useMemo(() => {
    const productMap = new Map()

    produtos.forEach((produto) => {
      if (produto.cod_barra) {
        productMap.set(String(produto.cod_barra), produto)
      }

      if (produto.cod) {
        productMap.set(String(produto.cod), produto)
      }
    })

    return productMap
  }, [produtos])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(productSearch)

    if (!normalizedSearch) return []

    return produtos
      .filter((produto) => normalizeText(produto.nome).includes(normalizedSearch))
      .slice(0, 8)
  }, [productSearch, produtos])

  const stopCamera = useCallback(() => {
    setIsCameraOpen(false)
    setIsStartingCamera(false)
    setScanSuccess(false)
    lastScanRef.current = null
    recentScansRef.current.clear()

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
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    installScannerCanvasOptimizer()

    codeReaderRef.current = new BrowserMultiFormatOneDReader(createScannerHints(), {
      delayBetweenScanAttempts: SCANNER_RETRY_DELAY,
      delayBetweenScanSuccess: SCANNER_SUCCESS_DELAY,
      tryPlayVideoTimeout: 5000
    })
    return () => {
      if (scanResetTimeoutRef.current) {
        clearTimeout(scanResetTimeoutRef.current)
      }

      stopCamera()
      audioContextRef.current?.close?.().catch?.(() => {})
    }
  }, [stopCamera])

  useEffect(() => {
    productByCodeRef.current = productByCode
  }, [productByCode])

  useEffect(() => {
    modoRef.current = modo
  }, [modo])

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
      console.warn('Não foi possível ajustar o zoom da câmera:', error)
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
        Array.isArray(capabilities.exposureMode) &&
        capabilities.exposureMode.includes('continuous')
      ) {
        advanced.push({ exposureMode: 'continuous' })
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
      console.warn('Não foi possível otimizar foco da câmera:', error)
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

  const handleScanResult = (result, error) => {
    if (error && error?.name !== 'NotFoundException') {
      console.error('Erro durante leitura do código:', error)
    }

    if (!result) return

    const code = String(result.getText() || '').trim()
    if (!code) return

    const now = Date.now()
    const lastSeenAt = recentScansRef.current.get(code) || 0
    if (code === lastScanRef.current || now - lastSeenAt < RECENT_SCAN_LOCK_MS) {
      return
    }

    recentScansRef.current.set(code, now)

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

    const produto = productByCodeRef.current.get(code)

    if (produto) {
      setBarcodeProduct(produto)
      setScanQuantity(1)
      stopCamera()

      setTimeout(() => {
        openMovimentoDialog(produto, modoRef.current, 1)
      }, 150)
    } else {
      setBarcodeProduct(null)
      stopCamera()
    }
  }

  const startCamera = async () => {
    if (isStartingCamera) return
    if (!isMobileDevice) {
      setCameraError('A câmera do scanner está disponível somente no celular.')
      return
    }

    stopCamera()
    setCameraError('')
    setIsStartingCamera(true)

    try {
      await new Promise((r) => setTimeout(r, 150))

      if (!videoRef.current) {
        throw new Error('Não foi possível preparar a câmera agora.')
      }

      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: SCANNER_FRAME_WIDTH, max: SCANNER_FRAME_WIDTH },
          height: { ideal: SCANNER_FRAME_HEIGHT, max: SCANNER_FRAME_HEIGHT },
          frameRate: { ideal: 24, max: 30 }
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
      setCameraError('Não foi possível abrir a câmera. Tente novamente.')
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

      const video = videoRef.current
      const sourceWidth = video.videoWidth
      const sourceHeight = video.videoHeight

      if (!sourceWidth || !sourceHeight) {
        setCameraError('A câmera ainda está preparando a imagem. Tente novamente.')
        return
      }

      const cropWidth = Math.round(sourceWidth * 0.82)
      const cropHeight = Math.round(sourceHeight * 0.62)
      const cropX = Math.round((sourceWidth - cropWidth) / 2)
      const cropY = Math.round((sourceHeight - cropHeight) / 2)
      const outputWidth = Math.max(1600, cropWidth)
      const outputHeight = Math.round(outputWidth * (cropHeight / cropWidth))

      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setCameraError('Não foi possível preparar a ajuda por imagem.')
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputWidth,
        outputHeight
      )

      const image = canvas.toDataURL('image/jpeg', 0.92)
      const response = await authenticatedFetch('/api/inventory-scan-assist', {
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
        setCameraError(data?.error || 'Não foi possível usar a ajuda por imagem agora.')
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

      setCameraError('A ajuda por imagem não conseguiu localizar o produto com segurança.')
    } catch (error) {
      console.error('Erro na ajuda por imagem do scanner:', error)
      setCameraError('Não foi possível usar a ajuda por imagem agora.')
    } finally {
      setIsAiHelping(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Barcode className="h-5 w-5" />
            Leitor de Código
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
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
            className="flex-1 sm:flex-none"
            onClick={() => setModo('entrada')}
          >
            Entrada
          </Button>

          <Button
            type="button"
            size="sm"
            variant={modo === 'saida' ? 'destructive' : 'outline'}
            className="flex-1 sm:flex-none"
            onClick={() => setModo('saida')}
          >
            Saida
          </Button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{CAMERA_HELP}</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Se a etiqueta estiver pequena demais para a câmera, busque pelo nome do produto.
        </p>
        {!isMobileDevice && (
          <p className="mb-3 text-xs text-amber-600">
            A câmera fica habilitada apenas no celular. No computador, use a digitação manual.
          </p>
        )}
        {(isCameraOpen || isStartingCamera) && (
          <div className="mb-4 overflow-hidden rounded-xl border bg-black">
            <div className="relative aspect-[4/3] min-h-[280px] w-full sm:min-h-[360px]">
              <video
                ref={videoRef}
                data-inventory-scanner="true"
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
                      className={`relative h-36 w-full max-w-sm rounded-xl border-2 ${
                        scanSuccess ? 'border-green-400' : 'border-white'
                      }`}
                    >
                      <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-red-400/90 shadow-[0_0_12px_rgba(248,113,113,0.8)]" />
                    </div>
                  </div>

                  <p className="absolute top-3 w-full text-center text-xs text-white">
                    {modo === 'entrada' ? 'Modo entrada' : 'Modo saída'}
                  </p>

                  <p className="absolute bottom-3 w-full text-center text-xs text-white">
                    Use a câmera traseira e aproxime até o código ficar nítido
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
                    setZoomValue(value[0])
                  }}
                  onValueCommit={(value) => applyCameraZoom(value[0])}
                  aria-label="Zoom da câmera"
                />

                {!isZoomSupported && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Este aparelho não liberou zoom manual para o navegador.
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
              Use quando a câmera não conseguir ler uma etiqueta pequena. A IA tenta achar o código ou o nome do produto na imagem atual.
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
            className="w-full sm:w-auto sm:self-end"
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
          <div className="mt-4 min-w-0 rounded-lg border bg-muted/30 p-4">
            <p className="truncate font-semibold" title={barcodeProduct.nome || '-'}>
              {barcodeProduct.nome}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={`Estoque: ${barcodeProduct.estoque}`}>
              Estoque: {barcodeProduct.estoque}
            </p>

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
                className="flex-1 sm:flex-none"
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
                className="flex-1 sm:flex-none"
                onClick={() =>
                  openMovimentoDialog(barcodeProduct, 'saida', scanQuantity)
                }
              >
                Saida
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
