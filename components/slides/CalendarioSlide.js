'use client'

import { useMemo, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { CalendarDays } from 'lucide-react'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'
import { MotionScrollIndicator } from '@/components/animations/MotionScrollIndicator'

export function CalendarioSlide({
  tarefas = [],
  lembretes = [],
  active = false,
  onEnd
}) {
  const ref = useRef(null)

  const events = useMemo(() => {
    const tarefaEvents = tarefas.map((tarefa) => ({
      id: `tarefa-${tarefa.id}`,
      title: tarefa.titulo || 'Tarefa sem titulo',
      start: tarefa.data || null,
      backgroundColor: '#028358',
      borderColor: '#028358',
      textColor: '#ffffff',
      extendedProps: {
        type: 'tarefa',
        prioridade: tarefa.prioridade,
        status: tarefa.status
      }
    }))

    const lembreteEvents = lembretes.map((lembrete) => ({
      id: `lembrete-${lembrete.id}`,
      title: lembrete.titulo || 'Lembrete sem titulo',
      start: lembrete.data || null,
      backgroundColor: '#6442b1',
      borderColor: '#6442b1',
      textColor: '#ffffff',
      extendedProps: {
        type: 'lembrete',
        prioridade: lembrete.prioridade,
        status: lembrete.status
      }
    }))

    return [...tarefaEvents, ...lembreteEvents].filter((event) => !!event.start)
  }, [tarefas, lembretes])

  useAutoScroll(ref, active ? onEnd : undefined, active)

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollTo({ top: 0 })
    }
  }, [active])

  return (
    <div className="flex h-full w-full min-h-0 flex-col px-4 py-4 sm:px-6 md:px-8">
      <div className="mb-6 flex w-full items-center justify-center gap-3">
        <CalendarDays className="h-10 w-10 text-primary" />
        <h2 className="text-4xl font-bold text-foreground">Calendario</h2>
      </div>

      <div ref={ref} className="slide-scroll motion-scroll-container scrollbar-soft relative h-full w-full min-h-0 overflow-y-auto">
        <MotionScrollIndicator targetRef={ref} />
        <div className="h-full min-h-[600px]">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            headerToolbar={false}
            events={events}
            height="100%"
            dayMaxEvents={3}
            moreLinkClick={false}
            eventDisplay="block"
            displayEventTime={false}
            eventMouseEnter={() => {}}
            eventMouseLeave={() => {}}
            dayCellClassNames={() => ''}
            eventClassNames={() => 'pointer-events-none'}
            viewClassNames={() => 'pointer-events-none'}
          />
        </div>
      </div>
    </div>
  )
}
