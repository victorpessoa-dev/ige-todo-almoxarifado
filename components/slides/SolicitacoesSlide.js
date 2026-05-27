'use client'

import { useEffect } from 'react'
import { AlertTriangle, ShoppingCart } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { SolicitacaoStatusBadge } from '@/components/solicitacoes/SolicitacaoStatusBadge'

function isAtrasada(solicitacao) {
  const dateValue = solicitacao.previsao_entrega || solicitacao.previsao_desejada
  if (!dateValue) return false

  if (['concluida', 'cancelada', 'entregue'].includes(solicitacao.status_geral)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(dateValue)
  target.setHours(0, 0, 0, 0)

  return target < today
}

function formatDate(value) {
  if (!value) return 'Sem previsao'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function SolicitacoesSlide({ solicitacoes, active, onEnd }) {
  const abertas = solicitacoes.filter(
    (item) => !['concluida', 'cancelada'].includes(item.status_geral)
  )
  const importantes = abertas
    .sort((a, b) => {
      const aAtrasada = isAtrasada(a) ? 1 : 0
      const bAtrasada = isAtrasada(b) ? 1 : 0
      if (aAtrasada !== bAtrasada) return bAtrasada - aAtrasada

      const aUrgente = a.prioridade === 'urgente' ? 1 : 0
      const bUrgente = b.prioridade === 'urgente' ? 1 : 0
      if (aUrgente !== bUrgente) return bUrgente - aUrgente

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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-9 w-9 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">Solicitacoes de Compra</h2>
            <p className="text-sm text-muted-foreground">
              {abertas.length} compra(s) em aberto
            </p>
          </div>
        </div>

        {totalAtencao > 0 && (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            <AlertTriangle className="h-3 w-3" />
            {totalAtencao} atencao
          </Badge>
        )}
      </div>

      {importantes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/30 text-muted-foreground">
          Nenhuma solicitacao em aberto.
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
                <TableHead className="h-12 px-4 text-base">Previsao</TableHead>
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
