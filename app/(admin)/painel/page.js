'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useData } from '@/contexts/data-context'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListTodo, StickyNote, Clock, Maximize2, Minimize2, User } from 'lucide-react'

function useAutoScroll(ref, onEnd, active) {
  useEffect(() => {
    if (!active) return

    const el = ref.current
    if (!el) return

    let isRunning = true

    const scrollStep = async () => {
      if (el.scrollHeight <= el.clientHeight) {
        await new Promise(r => setTimeout(r, 3000))
        onEnd?.()
        return
      }

      while (isRunning) {
        el.scrollBy({
          top: 120,
          behavior: 'smooth'
        })

        await new Promise(r => setTimeout(r, 2500))

        const chegouNoFim =
          el.scrollTop + el.clientHeight >= el.scrollHeight - 5

        if (chegouNoFim) {
          await new Promise(r => setTimeout(r, 1500))
          onEnd?.()
          return
        }
      }
    }

    scrollStep()

    return () => {
      isRunning = false
    }
  }, [onEnd, active, ref])
}

function getStatusInfo(status) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

function getPrioridadeInfo(prioridade) {
  return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[2]
}

function TarefaCard({ tarefa }) {
  const statusInfo = getStatusInfo(tarefa.status)
  const prioridadeInfo = getPrioridadeInfo(tarefa.prioridade)

  return (
    <Card className={`bg-card border-border ${prioridadeInfo.shadow}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-2">
            {tarefa.titulo}
          </CardTitle>
          <Badge className={prioridadeInfo.color}>{prioridadeInfo.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line break-words">
            {tarefa.descricao}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          {tarefa.responsavel && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{tarefa.responsavel}</span>
            </div>
          )}
          <Badge variant="outline">{statusInfo.label}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function LembreteCard({ lembrete }) {
  const statusInfo = getStatusInfo(lembrete.status)
  const prioridadeInfo = getPrioridadeInfo(lembrete.prioridade)

  return (
    <Card className={`bg-card border-border ${prioridadeInfo.shadow}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold line-clamp-2">
            {lembrete.titulo}
          </CardTitle>
          <Badge className={prioridadeInfo.color}>{prioridadeInfo.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {lembrete.conteudo && (
          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line break-words">
            {lembrete.conteudo}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          {lembrete.destinatario && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{lembrete.destinatario}</span>
            </div>
          )}
          <Badge variant="outline">{statusInfo.label}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function TarefasSlide({ tarefas, onEnd, active }) {
 const ref = useRef(null)

  const pendentes = useMemo(() => {
    return sortByPriority(tarefas.filter(t => t.status !== "concluido"))
  }, [tarefas])

  useAutoScroll(ref, onEnd, active)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollTo({ top: 0 })
    }
  }, [active])

  return (
    <div className="flex flex-col items-center h-full px-8 py-4">
      <div className="flex items-center gap-3 mb-6">
        <ListTodo className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold">Tarefas</h2>
      </div>

      <div ref={ref} className="w-full max-w-5xl flex-1 overflow-auto no-scrollbar">
        <div className="grid gap-4" style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))"
        }}>
          {pendentes.map(t => (
            <TarefaCard key={t.id} tarefa={t} />
          ))}
        </div>
      </div>

      <div className="mt-2 text-muted-foreground">
        Total: {pendentes.length}
      </div>
    </div>
  )
}

function LembretesSlide({ lembretes, onEnd, active }) {
  const ref = useRef(null)

  const pendentes = useMemo(() => {
    return sortByPriority(lembretes.filter(l => l.status !== "concluido"))
  }, [lembretes])

  useAutoScroll(ref, onEnd, active)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollTo({ top: 0 })
    }
  }, [active])

  return (
    <div className="flex flex-col items-center h-full px-8 py-4">
      <div className="flex items-center gap-3 mb-6">
        <StickyNote className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold">Lembretes</h2>
      </div>

      <div ref={ref} className="w-full max-w-5xl flex-1 overflow-auto no-scrollbar">
        <div className="grid gap-4" style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))"
        }}>
          {pendentes.map(l => (
            <LembreteCard key={l.id} lembrete={l} />
          ))}
        </div>
      </div>

      <div className="mt-2 text-muted-foreground">
        Total: {pendentes.length}
      </div>
    </div>
  )
}

function RelogioSlide({ onEnd }) {
 const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    const timeout = setTimeout(() => {
      onEnd?.()
    }, 8000)

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
  const { tarefas, lembretes, isLoaded } = useData()
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % 3)
  }, [])

  const slides = [
    {
      component: <TarefasSlide tarefas={tarefas} onEnd={nextSlide} active={currentSlide === 0} />,
      label: 'Tarefas'
    },
    {
      component: <LembretesSlide lembretes={lembretes} onEnd={nextSlide} active={currentSlide === 1} />,
      label: 'Lembretes'
    },
    {
      component: <RelogioSlide onEnd={nextSlide} />,
      label: 'Relogio'
    },
  ]

  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + 3) % 3)
  }, [])

  const goToSlide = (index) => {
    setCurrentSlide(index)
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