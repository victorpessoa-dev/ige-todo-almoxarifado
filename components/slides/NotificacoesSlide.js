'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, AlertTriangle, User } from 'lucide-react'
import { chunkArray } from '@/lib/utils'
import { useItemsPerPage } from '@/lib/hooks/useItemsPerPage'
import { useAutoScroll } from '@/lib/hooks/useAutoScroll'

function getStatusInfo(status) {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

function getPrioridadeInfo(prioridade) {
    return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[2]
}

function NotificacaoCard({ tarefa }) {
    const statusInfo = getStatusInfo(tarefa.status)
    const prioridadeInfo = getPrioridadeInfo(tarefa.prioridade)

    const hoje = new Date().toISOString().split('T')[0]
    const dataTarefa = tarefa.data ? tarefa.data.split('T')[0] : null
    const isAtrasada = dataTarefa && dataTarefa < hoje && tarefa.status !== 'concluido'
    const isHoje = dataTarefa === hoje

    return (
        <Card className={`bg-card border-border ${isAtrasada ? 'border-red-500' : prioridadeInfo.shadow}`}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                        {tarefa.titulo}
                    </CardTitle>
                    <div className="flex gap-1">
                        {isAtrasada && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        <Badge className={`${prioridadeInfo.color} shrink-0`}>{prioridadeInfo.label}</Badge>
                    </div>
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
                    <div className="flex gap-1">
                        {isHoje && <Badge variant="outline" className="bg-blue-50 text-blue-700">Hoje</Badge>}
                        {isAtrasada && <Badge variant="outline" className="bg-red-50 text-red-700">Atrasada</Badge>}
                        <Badge variant="outline">{statusInfo.label}</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function NotificacoesSlide({ tarefas, onEnd, active }) {
    const ref = useRef(null)

    const notificacoes = useMemo(() => {
        const hoje = new Date().toISOString().split('T')[0]
        return sortByPriority(
            tarefas.filter((t) => {
                if (t.status === 'concluido') return false
                const dataTarefa = t.data ? t.data.split('T')[0] : null
                return dataTarefa === hoje || (dataTarefa && dataTarefa < hoje)
            })
        )
    }, [tarefas])

    const ITEMS_PER_PAGE = useItemsPerPage()

    const pages = useMemo(() => {
        return chunkArray(notificacoes, ITEMS_PER_PAGE)
    }, [notificacoes, ITEMS_PER_PAGE])

    const [page, setPage] = useState(0)

    const safePage = page >= pages.length ? 0 : page
    const currentItems = pages[safePage] || []
    const isLastPage = pages.length === 0 || safePage === pages.length - 1

    useAutoScroll(ref, isLastPage ? onEnd : undefined, active)

    useEffect(() => {
        if (active && ref.current) {
            ref.current.scrollTo({ top: 0 })
        }
    }, [active, safePage])

    useEffect(() => {
        if (pages.length <= 1) return

        const interval = setInterval(() => {
            setPage((prev) => (prev + 1) % pages.length)
        }, 10000)

        return () => clearInterval(interval)
    }, [pages.length])

    useEffect(() => {
        setPage(0)
    }, [ITEMS_PER_PAGE])

    return (
        <div className="flex flex-col items-center h-full px-8 py-4 m-0">
            <div className="flex items-center gap-3 mb-6">
                <Bell className="h-10 w-10 text-primary" />
                <h2 className="text-4xl font-bold text-foreground">Notificações</h2>
            </div>

            {notificacoes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-xl text-muted-foreground">Nenhuma notificação pendente</p>
                </div>
            ) : (
                <div ref={ref} className="w-full max-w-5xl flex-1 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentItems.map((tarefa) => (
                            <NotificacaoCard key={tarefa.id} tarefa={tarefa} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2 text-muted-foreground">
                <p className="text-md">
                    Página {page + 1} / {pages.length} • Total: {notificacoes.length}
                </p>
            </div>
        </div>
    )
}