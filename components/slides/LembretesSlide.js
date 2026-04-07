'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StickyNote, User } from 'lucide-react'
import { useAutoScroll, useItemsPerPage, chunkArray } from '@/lib/utils'

function getStatusInfo(status) {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
}

function getPrioridadeInfo(prioridade) {
    return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[2]
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
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line break-words">{lembrete.conteudo}</p>
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

export function LembretesSlide({ lembretes, onEnd, active }) {
    const ref = useRef(null)

    const pendentes = useMemo(() => {
        return sortByPriority(
            lembretes.filter((l) => l.status !== "concluido")
        );
    }, [lembretes]);

    const ITEMS_PER_PAGE = useItemsPerPage();

    const pages = useMemo(() => {
        return chunkArray(pendentes, ITEMS_PER_PAGE);
    }, [pendentes, ITEMS_PER_PAGE]);

    const [page, setPage] = useState(0);

    const safePage = page >= pages.length ? 0 : page;
    const currentItems = pages[safePage] || [];
    const isLastPage = pages.length === 0 || safePage === pages.length - 1;

    useAutoScroll(ref, isLastPage ? onEnd : undefined, active)

    useEffect(() => {
        if (active && ref.current) {
            ref.current.scrollTo({ top: 0 })
        }
    }, [active, safePage])

    useEffect(() => {
        if (pages.length <= 1) return;

        const interval = setInterval(() => {
            setPage((prev) => (prev + 1) % pages.length);
        }, 10000);

        return () => clearInterval(interval);
    }, [pages.length]);

    useEffect(() => {
        setPage(0);
    }, [ITEMS_PER_PAGE]);

    return (
        <div className="flex flex-col items-center h-full px-8 py-4 m-0">
            <div className="flex items-center gap-3 mb-6">
                <StickyNote className="h-10 w-10 text-primary" />
                <h2 className="text-4xl font-bold text-foreground">Lembretes</h2>
            </div>

            {pendentes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-xl text-muted-foreground">Nenhum lembrete pendente</p>
                </div>
            ) : (
                <div ref={ref} className="w-full max-w-5xl flex-1 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentItems.map((lembrete) => (
                            <LembreteCard key={lembrete.id} lembrete={lembrete} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2 text-muted-foreground">
                <p className="text-md">
                    Página {page + 1} / {pages.length} • Total: {pendentes.length}
                </p>
            </div>
        </div>
    )
}
