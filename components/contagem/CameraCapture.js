'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, SwitchCamera, X, Check } from 'lucide-react'

export function CameraCapture({ onCapture, onClose, capturedCount }) {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [isLoading, setIsLoading] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setCameraError('')

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Este aparelho nao suporta abertura da camera por aqui.')
        return
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setStream(mediaStream)
    } catch (error) {
      console.error('Erro ao acessar a camera:', error)
      setCameraError('Nao foi possivel abrir a camera. Verifique a permissao do navegador.')
    } finally {
      setIsLoading(false)
    }
  }, [facingMode, stream])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }, [])

  useEffect(() => {
    if (stream) {
      startCamera()
    }
  }, [facingMode, startCamera, stream])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const captureImage = useCallback(() => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0)

    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8)
    onCapture(imageBase64)

    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 150)
  }, [onCapture])

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
            {capturedCount} foto{capturedCount !== 1 ? 's' : ''}
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
        Tire varias fotos e toque no check para analisar
      </p>
    </div>
  )
}
