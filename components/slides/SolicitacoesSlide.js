'use client'

import { useEffect } from 'react'
import { AlertTriangle, ShoppingCart } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { SolicitacaoStatusBadge } from '@/components/solicitacoes/SolicitacaoStatusBadge'
import { getSolicitacaoPrioridadeOrder } from '@/constants/solicitacoes-config'
import { formatDateBR, getLocalDateTime } from '@/lib/date-utils'

function isAtrasada(solicitacao) {
  const dateValue = solicitacao.previsao_entrega || solicitacao.previsao_desejada
  if (!dateValue) return false

  if (['concluida', 'cancelada', 'entregue'].includes(solicitacao.status_geral)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetTime = getLocalDateTime(dateValue)
  return targetTime !== null && targetTime < today.getTime()
}

function formatDate(value) {
  return formatDateBR(value, 'Sem previsão')
}

export function SolicitacoesSlide({ solicitacoes, active, onEnd }) {
  const abertas = solicitacoes.filter(
    (item) => !['concluida', 'cancelada'].includes(item.status_geral)
  )
  const importantes = [...abertas]
    .sort((a, b) => {
      const aAtrasada = isAtrasada(a) ? 1 : 0
      const bAtrasada = isAtrasada(b) ? 1 : 0
      if (aAtrasada !== bAtrasada) return bAtrasada - aAtrasada

      const priorityDiff =
        getSolicitacaoPrioridadeOrder(a.prioridade) -
        getSolicitacaoPrioridadeOrder(b.prioridade)
      if (priorityDiff !== 0) return priorityDiff

      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    })
    .slice(0, 6)
  const totalAtencao = abertas.filter(
    (item) => item.prioridade === 'urgente' || isAtrasada(item)
  ).length

  useEffect(() => {
    if (!active) return undefined

    const timeout = setTimeout(() => {
      onEnd?.()
    }, 12000)

    return () => clearTimeout(timeout)
  }, [active, onEnd])

  return (
    <div className="flex h-full flex-col overflow-hidden p-5 sm:p-8">
        <div className="mb-4 flex items-center justify-center gap-2 text-center sm:mb-6 sm:gap-3">
          <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Solicitações de Compra
            </h2>
        </div>


      {importantes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
          Nenhuma solicitação em aberto.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 px-4 text-base">Cod.</TableHead>
                <TableHead className="h-12 px-4 text-base">Produto</TableHead>
                <TableHead className="h-12 px-4 text-base">Solicitante</TableHead>
                <TableHead className="h-12 px-4 text-base">Status</TableHead>
                <TableHead className="h-12 px-4 text-base">Previsão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importantes.map((solicitacao) => (
                <TableRow key={solicitacao.id} className="hover:bg-muted/30">
                  <TableCell className="px-4 py-3 font-semibold tabular-nums">
                    {solicitacao.codigo || '-'}
                  </TableCell>
                  <TableCell className="max-w-[460px] px-4 py-3">
                    <p className="line-clamp-2 font-medium">
                      {solicitacao.descricao || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {solicitacao.solicitante || '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <SolicitacaoStatusBadge value={solicitacao.status_geral} />
                      <SolicitacaoStatusBadge
                        type="prioridade"
                        value={solicitacao.prioridade}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
