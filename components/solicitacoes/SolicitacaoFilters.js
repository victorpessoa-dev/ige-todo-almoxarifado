'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS
} from '@/constants/solicitacoes-config'

export function SolicitacaoFilters({ filters, setFilters }) {
  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(220px,1fr)_180px_180px]">
      <Input
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        placeholder="Buscar por codigo numerico, item, solicitante ou centro de custo"
      />

      <Select
        value={filters.status}
        onValueChange={(value) => updateFilter('status', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="exceto_concluidas">Exceto concluidas</SelectItem>
          <SelectItem value="exceto_canceladas">Exceto canceladas</SelectItem>
          <SelectItem value="exceto_concluidas_canceladas">Exceto concluidas e canceladas</SelectItem>
          {SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.prioridade}
        onValueChange={(value) => updateFilter('prioridade', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas prioridades</SelectItem>
          {SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

    </div>
  )
}
