'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, SwitchCamera, X, Check } from 'lucide-react'

export function CameraCapture({ onCapture, onClose, capturedCount, maxImages }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const flashTimeoutRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [isLoading, setIsLoading] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStream(null)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setCameraError('')

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Este aparelho nao suporta abertura da camera por aqui.')
        return
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      streamRef.current = mediaStream
      setStream(mediaStream)
    } catch (error) {
      console.error('Erro ao acessar a camera:', error)
      setCameraError('Nao foi possivel abrir a camera. Verifique a permissao do navegador.')
    } finally {
      setIsLoading(false)
    }
  }, [facingMode])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  useEffect(() => {
    if (streamRef.current) {
      startCamera()
    }
  }, [facingMode, startCamera])

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }

      stopCamera()
    }
  }, [stopCamera])

  const captureImage = useCallback(() => {
    if (maxImages && capturedCount >= maxImages) return
    if (!videoRef.current) return

    const sourceWidth = videoRef.current.videoWidth
    const sourceHeight = videoRef.current.videoHeight
    if (!sourceWidth || !sourceHeight) return

    const outputWidth = Math.min(sourceWidth, 1280)
    const outputHeight = Math.round(outputWidth * (sourceHeight / sourceWidth))

    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0, outputWidth, outputHeight)

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.72)
    onCapture(imageBase64)

    setShowFlash(true)
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }
    flashTimeoutRef.current = setTimeout(() => setShowFlash(false), 150)
  }, [capturedCount, maxImages, onCapture])

  const handleClose = useCallback(() => {
    stopCamera()
    onClose()
  }, [onClose, stopCamera])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {showFlash && (
        <div className="pointer-events-none absolute inset-0 z-50 bg-white" />
      )}

      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>

        {capturedCount > 0 && (
          <div className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            {capturedCount}{maxImages ? `/${maxImages}` : ''} foto{capturedCount !== 1 ? 's' : ''}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={switchCamera}
          className="text-white hover:bg-white/20"
        >
          <SwitchCamera className="h-6 w-6" />
        </Button>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        {!stream ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <Button
              onClick={startCamera}
              disabled={isLoading}
              className="bg-white text-black hover:bg-white/90"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Camera'}
            </Button>

            {cameraError && (
              <p className="max-w-sm text-sm text-white/80">{cameraError}</p>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {stream && (
        <div className="flex items-center justify-center gap-8 p-6">
          <Button
            onClick={captureImage}
            size="lg"
            className="h-16 w-16 rounded-full bg-white hover:bg-white/90"
            disabled={Boolean(maxImages && capturedCount >= maxImages)}
          >
            <Camera className="h-8 w-8 text-black" />
          </Button>

          {capturedCount > 0 && (
            <Button
              onClick={handleClose}
              size="lg"
              className="h-14 w-14 rounded-full bg-secondary hover:bg-secondary/90"
            >
              <Check className="h-7 w-7" />
            </Button>
          )}
        </div>
      )}

      <p className="pb-4 text-center text-sm text-white/70">
        Tire ate {maxImages || 'varias'} fotos e toque no check para analisar
      </p>
    </div>
  )
}
