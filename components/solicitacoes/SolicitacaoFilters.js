'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
      status: 'todos',
      prioridade: 'todas',
      mes: 'todos',
      ano: 'todos'
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
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger className="h-10 w-full bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="exceto_concluidas">Exceto concluídas</SelectItem>
            <SelectItem value="exceto_canceladas">Exceto canceladas</SelectItem>
            <SelectItem value="exceto_concluidas_canceladas">Exceto concluídas e canceladas</SelectItem>
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
          <SelectTrigger className="h-10 w-full bg-background">
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

        <Select
          value={filters.mes}
          onValueChange={(value) => updateFilter('mes', value)}
        >
          <SelectTrigger className="h-10 w-full bg-background">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {MONTH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.ano}
          onValueChange={(value) => updateFilter('ano', value)}
        >
          <SelectTrigger className="h-10 w-full bg-background">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os anos</SelectItem>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
