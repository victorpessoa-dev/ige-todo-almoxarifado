'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Eye } from 'lucide-react'
import { SolicitacaoStatusBadge } from './SolicitacaoStatusBadge'
import { getSolicitacaoSituacao } from '@/constants/solicitacoes-config'

function formatCurrency(value) {
  const number = Number(value || 0)
  if (!number) return '-'

  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function SolicitacaoTable({ solicitacoes, onOpen }) {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  })

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        }
      }

      return { key, direction: 'asc' }
    })
  }

  const sortedSolicitacoes = useMemo(() => {
    return [...solicitacoes].sort((a, b) => {
      const aValue = a[sortConfig.key] || ''
      const bValue = b[sortConfig.key] || ''

      if (sortConfig.key.includes('data') || sortConfig.key.includes('created_at') || sortConfig.key.includes('previsao')) {
        const aDate = aValue ? new Date(aValue).getTime() : 0
        const bDate = bValue ? new Date(bValue).getTime() : 0
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      if (typeof aValue === 'number' || typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue)
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
  }, [solicitacoes, sortConfig])

  const SortHeader = ({ label, columnKey }) => {
    const isActive = sortConfig.key === columnKey

    return (
      <TableHead>
        <button
          type="button"
          onClick={() => handleSort(columnKey)}
          className="flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
        >
          {label}
          {isActive ? (
            sortConfig.direction === 'asc'
              ? <ArrowUp className="h-3.5 w-3.5" />
              : <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5" />
          )}
        </button>
      </TableHead>
    )
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {sortedSolicitacoes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma solicitacao encontrada.
          </div>
        ) : (
          sortedSolicitacoes.map((solicitacao) => {
            const situacao = getSolicitacaoSituacao(solicitacao)

            return (
              <button
                key={solicitacao.id}
                type="button"
                onClick={() => onOpen(solicitacao)}
                className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{solicitacao.codigo || '-'}</p>
                    <p className="mt-1 line-clamp-2 text-sm">
                      {solicitacao.descricao}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {solicitacao.solicitante || '-'} | {solicitacao.centro_custo || '-'}
                    </p>
                  </div>

                  <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <SolicitacaoStatusBadge
                    type="prioridade"
                    value={solicitacao.prioridade}
                  />
                  <SolicitacaoStatusBadge value={solicitacao.status_geral} />
                  {situacao.label && (
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                      {situacao.label}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  <span>Quantidade: {solicitacao.quantidade || 0}</span>
                  <span>Valor: {formatCurrency(solicitacao.valor_total)}</span>
                  <span>Previsao: {formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-sm md:block">
        <div className="inventory-table-scroll overflow-x-auto">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHeader label="Codigo" columnKey="codigo" />
                <SortHeader label="Item" columnKey="descricao" />
                <SortHeader label="Solicitante" columnKey="solicitante" />
                <SortHeader label="Centro" columnKey="centro_custo" />
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Situacao</TableHead>
                <TableHead>Ref.</TableHead>
                <SortHeader label="Valor" columnKey="valor_total" />
                <SortHeader label="Previsao" columnKey="previsao_entrega" />
                <TableHead className="w-14 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedSolicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    Nenhuma solicitacao encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sortedSolicitacoes.map((solicitacao) => {
                  const situacao = getSolicitacaoSituacao(solicitacao)

                  return (
                    <TableRow
                      key={solicitacao.id}
                      className="cursor-pointer"
                      onClick={() => onOpen(solicitacao)}
                    >
                      <TableCell className="font-medium">
                        {solicitacao.codigo || '-'}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="truncate font-medium">{solicitacao.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd: {solicitacao.quantidade || 0}
                        </p>
                      </TableCell>
                      <TableCell>{solicitacao.solicitante || '-'}</TableCell>
                      <TableCell>{solicitacao.centro_custo || '-'}</TableCell>
                      <TableCell>
                        <SolicitacaoStatusBadge
                          type="prioridade"
                          value={solicitacao.prioridade}
                        />
                      </TableCell>
                      <TableCell>
                        <SolicitacaoStatusBadge value={solicitacao.status_geral} />
                      </TableCell>
                      <TableCell>
                        {situacao.label ? (
                          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${situacao.className}`}>
                            {situacao.label}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {solicitacao.link_referencia ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <a
                              href={solicitacao.link_referencia}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Abrir referencia"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(solicitacao.valor_total)}</TableCell>
                      <TableCell>
                        {formatDate(solicitacao.previsao_entrega || solicitacao.previsao_desejada)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => {
                            event.stopPropagation()
                            onOpen(solicitacao)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
