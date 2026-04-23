'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListTodo, User } from 'lucide-react'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'

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
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line break-words">{tarefa.descricao}</p>
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

export function TarefasSlide({ tarefas, onEnd, active }) {
    const ref = useRef(null)

    const pendentes = useMemo(() => {
        return sortByPriority(
            tarefas.filter((l) => l.status !== "concluido")
        );
    }, [tarefas]);

    const isEmpty = pendentes.length === 0

    useAutoScroll(ref, !isEmpty ? onEnd : undefined, active)

    useEffect(() => {
        if (active && ref.current) {
            ref.current.scrollTo({ top: 0 })
        }
    }, [active])

    return (
        <div className="flex h-full min-h-0 w-full max-w-full flex-col items-center overflow-hidden px-4 py-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <ListTodo className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Tarefas</h2>
            </div>

            {isEmpty ? (
                <div className="flex-1 flex items-center justify-center px-4">
                    <p className="text-base sm:text-xl text-muted-foreground text-center">
                        Nenhuma tarefa pendente
                    </p>
                </div>
            ) : (
                <div ref={ref} className="slide-scroll scrollbar-soft w-full flex-1 overflow-auto px-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {pendentes.map((tarefa) => (
                            <TarefaCard key={tarefa.id} tarefa={tarefa} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2 text-muted-foreground">
                <p className="text-sm sm:text-base">
                    Total: {pendentes.length}
                </p>
            </div>
        </div>
    )
}
