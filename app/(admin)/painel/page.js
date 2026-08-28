'use client'

import { motion } from 'motion/react'
import { useState, useEffect, useCallback } from 'react'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/spinner'
import { SolicitacoesSlide } from '@/components/slides/SolicitacoesSlide'
import InventarioSlide from '@/components/slides/InventarioSlide'
import { CalendarioSlide } from '@/components/slides/CalendarioSlide'
import { listRevisoesCalendario } from '@/lib/services/revisoes-service'
import { Clock, Maximize2, Minimize2, Monitor } from 'lucide-react'
import { isSolicitacaoEncerrada } from '@/constants/solicitacoes-config'

function RelogioSlide({ onEnd }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    const timeout = setTimeout(() => {
      onEnd?.()
    }, 10000)

    return () => {
      clearInterval(timer)
      clearTimeout(timeout)
    }
  }, [onEnd])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  const dateString = time.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden">
      <div className="mb-8 flex items-center gap-3">
        <Clock className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold text-foreground">Relogio Local</h2>
      </div>

      <div className="w-full max-w-full overflow-hidden text-center">
        <div className="mb-4 text-[clamp(3rem,10vw,8rem)] leading-none font-bold tracking-wider text-foreground">
          {hours}:{minutes}:{seconds}
        </div>
        <p className="text-2xl capitalize text-muted-foreground sm:text-xl">
          {dateString}
        </p>
      </div>
      <div className="mt-10 text-center text-muted-foreground">
        {(() => {
          const hour = time.getHours()

          const isAberto =
            (hour >= 8 && hour < 9) ||
            (hour >= 14 && hour < 15)

          return (
            <div className="flex flex-col items-center">
              <span
                className={`px-8 py-2 text-3xl font-semibold text-white sm:text-5xl xl:text-8xl rounded-full ${isAberto ? 'bg-green-600' : 'bg-red-600'
                  }`}
              >
                {isAberto ? 'ABERTO' : 'FECHADO'}
              </span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default function PainelPage() {
  const { produtos, solicitacoesCompra, isLoaded } = useData()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [revisoes, setRevisoes] = useState([])
  useEffect(() => { if (isLoaded) listRevisoesCalendario().then(setRevisoes).catch(() => setRevisoes([])) }, [isLoaded])

  const hasProdutosBaixos = produtos.some((produto) => produto.estoque <= produto.min)
  const hasSolicitacoesAbertas = solicitacoesCompra.some(
    (solicitacao) => !isSolicitacaoEncerrada(solicitacao)
  )
  const slideDefinitions = [
    ...(hasProdutosBaixos
      ? [{ key: 'inventario', label: 'Inventario' }]
      : []),
    ...(hasSolicitacoesAbertas
      ? [{ key: 'solicitacoes', label: 'Solicitacoes' }]
      : []),
    { key: 'calendario', label: 'Calendário' },
    { key: 'relogio', label: 'Relogio' }
  ]

  const slideCount = slideDefinitions.length
  const safeCurrentSlide = Math.min(currentSlide, slideCount - 1)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (Math.min(prev, slideCount - 1) + 1) % slideCount)
    setCycleKey((prev) => prev + 1)
  }, [slideCount])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (Math.min(prev, slideCount - 1) - 1 + slideCount) % slideCount)
    setCycleKey((prev) => prev + 1)
  }, [slideCount])

  const slides = slideDefinitions.map((slide, index) => {
    if (slide.key === 'inventario') {
      return {
        ...slide,
        component: (
          <InventarioSlide
            key={`inventario-${cycleKey}`}
            produtos={produtos}
            onEnd={nextSlide}
            active={safeCurrentSlide === index}
          />
        )
      }
    }

    if (slide.key === 'solicitacoes') {
      return {
        ...slide,
        component: (
          <SolicitacoesSlide
            key={`solicitacoes-${cycleKey}`}
            solicitacoes={solicitacoesCompra}
            onEnd={nextSlide}
            active={safeCurrentSlide === index}
          />
        )
      }
    }

    if (slide.key === 'calendario') {
      return { ...slide, component: <CalendarioSlide key={'calendario-' + cycleKey} revisoes={revisoes} onEnd={nextSlide} active={safeCurrentSlide === index} /> }
    }

    return {
      ...slide,
      component: (
        <RelogioSlide
          key={`relogio-${cycleKey}`}
          active={safeCurrentSlide === index}
          onEnd={nextSlide}
        />
      )
    }
  })

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  const goToSlide = (index) => {
    setCurrentSlide(index)
    setCycleKey((prev) => prev + 1)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide()
      if (e.key === 'ArrowLeft') prevSlide()
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
      if (e.key === 'f' || e.key === 'F') toggleFullscreen()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, isFullscreen])

  if (!isLoaded) {
    return <LoadingState className="h-full min-h-[60vh]" />
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-6">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card/40">
          <motion.div
            key={slides[safeCurrentSlide].key}
            className="h-full"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {slides[safeCurrentSlide].component}
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full border border-border bg-background/80 hover:bg-background"
            onClick={toggleFullscreen}
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-3 rounded-2xl border bg-muted/40 p-3">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${safeCurrentSlide === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {slide.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-[60vh] items-center justify-center md:hidden">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center shadow-sm">
          <Monitor className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Painel disponível no desktop</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta tela usa slides operacionais e foi desativada no mobile para evitar cortes e sobreposições.
          </p>
          <Button asChild className="mt-4 w-full">
            <a href="/solicitacoes">Abrir solicitacoes</a>
          </Button>
        </div>
      </div>

      <div className="hidden h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] min-h-0 flex-col gap-3 overflow-hidden md:flex">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card/40">
          <motion.div
            key={slides[safeCurrentSlide].key}
            className="h-full"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {slides[safeCurrentSlide].component}
          </motion.div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 overflow-hidden rounded-2xl border bg-muted/30 p-3">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${safeCurrentSlide === index
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {slide.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
