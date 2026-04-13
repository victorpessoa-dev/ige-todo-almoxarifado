'use client'

import { useState, useEffect, useCallback } from 'react'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { CalendarioSlide } from '@/components/slides/CalendarioSlide'
import { TarefasSlide } from '@/components/slides/TarefasSlide'
import { LembretesSlide } from '@/components/slides/LembretesSlide'
import { NotificacoesSlide } from '@/components/slides/NotificacoesSlide'
import { InventarioSlide } from '@/components/slides/InventarioSlide'
import { Clock, Maximize2, Minimize2 } from 'lucide-react'

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
    <div className="flex flex-col items-center justify-center h-full p-12 overflow-hidden">

      <div className="flex items-center gap-3 mb-8">
        <Clock className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold text-foreground">Relogio Local</h2>
      </div>

      <div className="text-center w-full max-w-full overflow-hidden">
        <div className="font-bold text-foreground tracking-wider mb-4 text-[clamp(3rem,10vw,8rem)] leading-none">
          {hours}:{minutes}:{seconds}
        </div>
        <p className="text-2xl sm:text-xl text-muted-foreground capitalize">
          {dateString}
        </p>
      </div>
      <div className="text-center mt-10 text-muted-foreground">
        {(() => {
          const hour = time.getHours()

          const isAberto =
            (hour >= 8 && hour < 9) ||
            (hour >= 14 && hour < 15)

          return (
            <div className="flex flex-col items-center">
              <span
                className={`px-8 py-2 rounded-full text-white font-semibold text-3xl sm:text-5xl xl:text-8xl ${isAberto ? 'bg-green-600' : 'bg-red-600'
                  }`}
              >
                {isAberto ? 'ABERTO' : 'FECHADO'}
              </span>
            </div>
          )
        })()}
      </div>
    </div >
  )
}

export default function PainelPage() {
  const { tarefas, lembretes, produtos, isLoaded } = useData()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)


  const slideCount = 6

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slideCount)
    setCycleKey(prev => prev + 1)
  }, [slideCount])

  const slides = [
    {
      component: (
        <TarefasSlide
          key={`tarefas-${cycleKey}`}
          tarefas={tarefas}
          onEnd={nextSlide}
          active={currentSlide === 0}
        />
      ),
      label: 'Tarefas'
    },
    {
      component: (
        <LembretesSlide
          key={`lembretes-${cycleKey}`}
          lembretes={lembretes}
          onEnd={nextSlide}
          active={currentSlide === 1}
        />
      ),
      label: 'Lembretes'
    },
    {
      component: (
        <CalendarioSlide
          key={`calendario-${cycleKey}`}
          tarefas={tarefas}
          lembretes={lembretes}
          active={currentSlide === 2}
          onEnd={nextSlide}
        />
      ),
      label: 'Calendário'
    },
    {
      component: (
        <NotificacoesSlide
          key={`notificacoes-${cycleKey}`}
          tarefas={tarefas}
          onEnd={nextSlide}
          active={currentSlide === 3}
        />
      ),
      label: 'Notificações'
    },
    {
      component: (
        <InventarioSlide
          key={`inventario-${cycleKey}`}
          produtos={produtos}
          onEnd={nextSlide}
          active={currentSlide === 4}
        />
      ),
      label: 'Inventário'
    },
    {
      component: (
        <RelogioSlide
          key={`relogio-${cycleKey}`}
          active={currentSlide === 5}
          onEnd={nextSlide}
        />
      ),
      label: 'Relogio'
    },
  ]

  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slideCount) % slideCount)
    setCycleKey(prev => prev + 1)
  }, [slideCount])

  const goToSlide = (index) => {
    setCurrentSlide(index)
    setCycleKey(prev => prev + 1)
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
    return <div className="animate-pulse flex items-center justify-center h-full">Carregando...</div>
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex-1 relative overflow-hidden">
          {slides[currentSlide].component}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/80 hover:bg-background border border-border"
            onClick={toggleFullscreen}
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 py-4 bg-muted/50">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentSlide === index
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
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex-1 relative bg-card rounded-xl border border-border overflow-hidden">
        {slides[currentSlide].component}

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/80 hover:bg-background"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 py-4 overflow-hidden">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentSlide === index
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