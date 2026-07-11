'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CheckboxFilter } from '@/components/ui/checkbox-filter'
import { Input } from '@/components/ui/input'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS
} from '@/constants/solicitacoes-config'

const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
]

export function SolicitacaoFilters({ filters, setFilters, yearOptions = [] }) {
  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      status: [],
      prioridade: [],
      mes: [],
      ano: []
    })
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <Input
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        placeholder="Buscar por código numérico, item, solicitante ou centro de custo"
        className="h-10 w-full"
      />

      <div className="grid w-full gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-4">
        <CheckboxFilter
          label="status"
          allLabel="Todos os status"
          options={SOLICITACAO_STATUS_GERAL_OPTIONS}
          value={filters.status}
          onChange={(value) => updateFilter('status', value)}
        />

        <CheckboxFilter
          label="prioridade"
          allLabel="Todas as prioridades"
          options={SOLICITACAO_PRIORIDADE_OPTIONS}
          value={filters.prioridade}
          onChange={(value) => updateFilter('prioridade', value)}
        />

        <CheckboxFilter
          label="mês"
          allLabel="Todos os meses"
          options={MONTH_OPTIONS}
          value={filters.mes}
          onChange={(value) => updateFilter('mes', value)}
        />

        <CheckboxFilter
          label="ano"
          allLabel="Todos os anos"
          options={yearOptions.map((year) => ({ value: year, label: year }))}
          value={filters.ano}
          onChange={(value) => updateFilter('ano', value)}
        />

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full bg-background"
          onClick={clearFilters}
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  )
}
