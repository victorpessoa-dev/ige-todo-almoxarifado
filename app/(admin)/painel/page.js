'use client'

import { useState, useEffect, useCallback } from 'react'
import { useData } from '@/contexts/data-context'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListTodo, StickyNote, Clock, Maximize2, Minimize2, User } from 'lucide-react'

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
          <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
            {tarefa.titulo}
          </CardTitle>
          <Badge className={`${prioridadeInfo.color} shrink-0`}>{prioridadeInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tarefa.descricao}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          {tarefa.responsavel && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{tarefa.responsavel}</span>
            </div>
          )}
          <Badge variant="outline" className="ml-auto">{statusInfo.label}</Badge>
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
          <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
            {lembrete.titulo}
          </CardTitle>
          <Badge className={`${prioridadeInfo.color} shrink-0`}>{prioridadeInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {lembrete.conteudo && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lembrete.conteudo}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          {lembrete.destinatario && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{lembrete.destinatario}</span>
            </div>
          )}
          <Badge variant="outline" className="ml-auto">{statusInfo.label}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function chunkArray(array, size) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

function TarefasSlide({ tarefas }) {
  const pendentes = sortByPriority(tarefas.filter(t => t.status !== 'concluido'))

  const ITEMS_PER_PAGE = 8
  const pages = chunkArray(pendentes, ITEMS_PER_PAGE)

  const [page, setPage] = useState(0)

  useEffect(() => {
    if (pages.length <= 1) return

    const interval = setInterval(() => {
      setPage(prev => (prev + 1) % pages.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [pages.length])

  const currentItems = pages[page] || []

  return (
    <div className="flex flex-col items-center h-full p-8">
      <div className="flex items-center gap-3 mb-6">
        <ListTodo className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold text-foreground">Tarefas</h2>
      </div>

      {pendentes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Nenhuma tarefa pendente</p>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex-1 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((tarefa) => (
              <TarefaCard key={tarefa.id} tarefa={tarefa} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-muted-foreground">
        <p className="text-lg">
          Página {page + 1} / {pages.length} • Total: {pendentes.length}
        </p>
      </div>
    </div>
  )
}

function LembretesSlide({ lembretes }) {
  const pendentes = sortByPriority(lembretes.filter(l => l.status !== 'concluido'))

  const ITEMS_PER_PAGE = 8
  const pages = chunkArray(pendentes, ITEMS_PER_PAGE)

  const [page, setPage] = useState(0)

  useEffect(() => {
    if (pages.length <= 1) return

    const interval = setInterval(() => {
      setPage(prev => (prev + 1) % pages.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [pages.length])

  const currentItems = pages[page] || []

  return (
    <div className="flex flex-col items-center h-full p-8">
      <div className="flex items-center gap-3 mb-6">
        <StickyNote className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold text-foreground">Lembretes</h2>
      </div>

      {pendentes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Nenhum lembrete pendente</p>
        </div>
      ) : (
        <div className="w-full max-w-5xl flex-1 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentItems.map((lembrete) => (
              <LembreteCard key={lembrete.id} lembrete={lembrete} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-muted-foreground">
        <p className="text-lg">
          Página {page + 1} / {pages.length} • Total: {pendentes.length}
        </p>
      </div>
    </div>
  )
}

function RelogioSlide() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  const dateOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  const dateString = time.toLocaleDateString('pt-BR', dateOptions)

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
  const { tarefas, lembretes, isLoaded, reloadData } = useData()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const slides = [
    { component: <TarefasSlide tarefas={tarefas} />, label: 'Tarefas' },
    { component: <LembretesSlide lembretes={lembretes} />, label: 'Lembretes' },
    { component: <RelogioSlide />, label: 'Relogio' },
  ]

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const refreshData = () => {
    reloadData()
  }

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 15000)
    return () => clearInterval(timer)
  }, [nextSlide])

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

        <p className="text-center text-xs text-muted-foreground pb-2 bg-muted/50">
          F para sair do fullscreen | ESC para sair
        </p>
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

      <p className="text-center text-xs text-muted-foreground pb-2">
        F para fullscreen
      </p>
    </div>
  )
}