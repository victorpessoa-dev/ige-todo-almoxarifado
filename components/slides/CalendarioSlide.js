'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useData } from '@/contexts/data-context'
import { PRIORIDADE_OPTIONS } from '@/constants/task-config'
import { CalendarDays } from 'lucide-react'
import { useAutoScroll } from '@/lib/utils'

function getPrioridadeInfo(prioridade) {
    return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[2]
}

function getMonthDays(year, month) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    const offset = (startingDay + 6) % 7

    const days = []

    for (let i = 0; i < offset; i++) {
        days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day))
    }

    return days
}

const PRIORIDADE_BORDER = {
    urgente: 'border-red-500',
    alto: 'border-orange-500',
    medio: 'border-yellow-500',
    baixo: 'border-emerald-500'
}

function capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export function CalendarioSlide({ active = false, onEnd }) {
    const [date] = useState(new Date())
    const { tarefas, lembretes } = useData()
    const ref = useRef(null)

    const days = useMemo(
        () => getMonthDays(date.getFullYear(), date.getMonth()),
        [date]
    )

    const eventsByDate = useMemo(() => {
        const map = {}

        const addEvent = (item, type) => {
            if (!item.data) return
            const key = new Date(item.data).toISOString().split('T')[0]
            if (!map[key]) map[key] = []
            map[key].push({
                id: item.id,
                type,
                title: item.titulo,
                prioridade: item.prioridade,
                status: item.status
            })
        }

        tarefas.forEach(tarefa => addEvent(tarefa, 'tarefa'))
        lembretes.forEach(lembrete => addEvent(lembrete, 'lembrete'))

        Object.values(map).forEach(events => {
            events.sort((a, b) => {
                const order = { urgente: 0, alto: 1, medio: 2, baixo: 3 }
                return (order[a.prioridade] ?? 99) - (order[b.prioridade] ?? 99)
            })
        })

        return map
    }, [tarefas, lembretes])

    const monthLabel = capitalize(
        date.toLocaleString('pt-BR', {
            month: 'long',
            year: 'numeric'
        })
    )

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
                <h2 className="text-4xl font-bold text-foreground">{monthLabel}</h2>
            </div>

            <div ref={ref} className="w-full h-full min-h-0 overflow-y-auto">
                <div className="grid grid-cols-7 auto-rows-fr gap-[6px] p-2 sm:p-3 h-full w-full min-h-0">
                    {days.map((day, index) => {
                        const key = day?.toISOString().split('T')[0]
                        const dayEvents = key ? eventsByDate[key] || [] : []
                        const firstPriority = dayEvents[0]?.prioridade
                        const borderClass = firstPriority
                            ? PRIORIDADE_BORDER[firstPriority]
                            : 'border-border'

                        return (
                            <div
                                key={index}
                                className={`h-full rounded-2xl border ${borderClass} bg-background p-2 min-w-0 ${day ? '' : 'bg-muted/80'}`}
                            >
                                {day ? (
                                    <>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm font-bold text-foreground">
                                                {day.getDate()}
                                            </div>

                                            {dayEvents.length > 0 && (
                                                <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-semibold text-primary">
                                                    {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="min-h-[24px]" />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}