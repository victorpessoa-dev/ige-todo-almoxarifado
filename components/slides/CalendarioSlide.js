'use client'

import { useMemo, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useData } from '@/contexts/data-context'
import { CalendarDays } from 'lucide-react'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'

export function CalendarioSlide({ active = false, onEnd }) {
    const { tarefas, lembretes } = useData()
    const ref = useRef(null)

    const events = useMemo(() => {
        const tarefaEvents = tarefas.map((tarefa) => ({
            id: `tarefa-${tarefa.id}`,
            title: tarefa.titulo || 'Tarefa sem título',
            start: tarefa.data || null,
            backgroundColor: '#3b82f6', // blue-500
            borderColor: '#3b82f6',
            textColor: '#ffffff',
            extendedProps: {
                type: 'tarefa',
                prioridade: tarefa.prioridade,
                status: tarefa.status
            }
        }))

        const lembreteEvents = lembretes.map((lembrete) => ({
            id: `lembrete-${lembrete.id}`,
            title: lembrete.titulo || 'Lembrete sem título',
            start: lembrete.data || null,
            backgroundColor: '#8b5cf6', // purple-500
            borderColor: '#8b5cf6',
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
        <div className="flex flex-col h-full w-full min-h-0 px-8 py-4 m-0">
            <div className="flex items-center justify-center gap-3 mb-6 w-full">
                <CalendarDays className="h-10 w-10 text-primary" />
                <h2 className="text-4xl font-bold text-foreground">Calendário</h2>
            </div>

            <div ref={ref} className="w-full h-full min-h-0 overflow-y-auto">
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
                        eventMouseEnter={() => {}} // Disable hover
                        eventMouseLeave={() => {}} // Disable hover
                        dayCellClassNames={() => ''} // Remove default hover classes
                        eventClassNames={() => 'pointer-events-none'} // Disable event interactions
                        viewClassNames={() => 'pointer-events-none'} // Disable view interactions
                    />
                </div>
            </div>
        </div>
    )
}