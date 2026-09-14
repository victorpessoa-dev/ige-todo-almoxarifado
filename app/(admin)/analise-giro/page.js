'use client'
import { getApiAuthHeaders } from '@/lib/supabase/client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { BarChart3, Sparkles } from 'lucide-react'
import { toast } from '@/lib/notifications/toast'

import { useData } from '@/contexts/data-context'
import { getUserMessage } from '@/lib/messaging/user-messages'
import { authenticatedFetch } from '@/lib/api/authenticated-fetch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckboxFilter } from '@/components/ui/checkbox-filter'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import TablePagination from '@/components/ui/table-pagination'

const PERIOD_OPTIONS = [
  { value: '14', label: '2 semanas', days: 14 },
  { value: '30', label: '1 mes', days: 30 },
  { value: '60', label: '2 meses', days: 60 },
  { value: '90', label: '3 meses', days: 90 },
  { value: '180', label: '6 meses', days: 180 },
  { value: '365', label: '1 ano', days: 365 },
  { value: '730', label: '2 anos', days: 365 * 2 }
]

const MAX_TURNOVER_ANALYSIS_PRODUCTS = 5
const DEFAULT_PAGE_SIZE = 50
function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getProductCategory(produto) {
  const category = String(produto?.categoria || '').trim()
  return category || 'Sem categoria'
}

function buildTurnoverStats(produtos, movimentacoes, periodDays) {
  const now = new Date()
  const selectedPeriodAgo = now.getTime() - periodDays * 24 * 60 * 60 * 1000
  const comparisonPeriodDays = Math.min(periodDays * 2, 365)
  const comparisonPeriodAgo =
    now.getTime() - comparisonPeriodDays * 24 * 60 * 60 * 1000

  return produtos
    .map((produto) => {
      const productMovements = movimentacoes.filter(
        (movimentacao) => movimentacao.produto_id === produto.id
      )

      let entrada30 = 0
      let entradaComparacao = 0
      let saida30 = 0
      let saidaComparacao = 0
      let lastSaidaAt = null

      productMovements.forEach((movimentacao) => {
        const createdAt = movimentacao?.created_at
          ? new Date(movimentacao.created_at).getTime()
          : 0
        const quantidade = Number(movimentacao?.quantidade || 0)

        if (movimentacao?.tipo === 'entrada') {
          if (createdAt >= selectedPeriodAgo) entrada30 += quantidade
          if (createdAt >= comparisonPeriodAgo) entradaComparacao += quantidade
        }

        if (movimentacao?.tipo === 'saida') {
          if (createdAt >= selectedPeriodAgo) saida30 += quantidade
          if (createdAt >= comparisonPeriodAgo) saidaComparacao += quantidade
          if (!lastSaidaAt || createdAt > lastSaidaAt) {
            lastSaidaAt = createdAt
          }
        }
      })

      const avgMonthlyOut = Number(
        ((saidaComparacao / Math.max(comparisonPeriodDays / 30, 1)) || 0).toFixed(1)
      )
      const daysWithoutSales = lastSaidaAt
        ? Math.floor((now.getTime() - lastSaidaAt) / (24 * 60 * 60 * 1000))
        : null

      let turnoverLabel = 'baixo'
      if (saida30 >= Math.max(10, produto.min || 0, Math.ceil(periodDays / 10))) {
        turnoverLabel = 'alto'
      } else if (saida30 >= Math.max(3, Math.ceil((produto.min || 0) / 2))) {
        turnoverLabel = 'medio'
      }

      return {
        productId: produto.id,
        cod: produto.cod,
        name: produto.nome,
        category: getProductCategory(produto),
        currentStock: Number(produto.estoque || 0),
        min: Number(produto.min || 0),
        max: Number(produto.max || 0),
        periodDays,
        comparisonPeriodDays,
        entrada30,
        entradaComparacao,
        saida30,
        saidaComparacao,
        avgMonthlyOut,
        daysWithoutSales,
        turnoverLabel
      }
    })
    .sort((a, b) => b.saida30 - a.saida30)
}

function ProductTurnoverChart({ item }) {
  const data = [
    {
      name: `${item.periodDays} dias`,
      Entrada: item.entrada30,
      Saida: item.saida30
    },
    {
      name: `${item.comparisonPeriodDays} dias`,
      Entrada: item.entradaComparacao,
      Saida: item.saidaComparacao
    }
  ]

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Entrada" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Saida" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GeneralTurnoverChart({ periodDays, comparisonPeriodDays, data }) {
  const chartData = [
    {
      name: `${periodDays} dias`,
      Entrada: data.reduce((acc, item) => acc + item.entrada30, 0),
      Saida: data.reduce((acc, item) => acc + item.saida30, 0)
    },
    {
      name: `${comparisonPeriodDays} dias`,
      Entrada: data.reduce((acc, item) => acc + item.entradaComparacao, 0),
      Saida: data.reduce((acc, item) => acc + item.saidaComparacao, 0)
    }
  ]

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Entrada" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Saida" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AnaliseGiroPage() {
  const { produtos, movimentacoes } = useData()
  const [turnoverAnalysis, setTurnoverAnalysis] = useState(null)
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [isAnalyzingTurnover, setIsAnalyzingTurnover] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedAnalysisProductIds, setSelectedAnalysisProductIds] = useState([])

  const selectedPeriodDays =
    PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.days || 30
  const comparisonPeriodDays = Math.min(selectedPeriodDays * 2, 365)

  const turnoverStats = useMemo(
    () => buildTurnoverStats(produtos, movimentacoes, selectedPeriodDays),
    [movimentacoes, produtos, selectedPeriodDays]
  )

  const [selectedProductId, setSelectedProductId] = useState(null)

  const selectedItem = useMemo(() => {
    if (!turnoverStats.length) return null

    return turnoverStats.find((item) => item.productId === selectedProductId) || null
  }, [turnoverStats, selectedProductId])

  const selectedAnalysisItems = useMemo(() => {
    if (selectedAnalysisProductIds.length > 0) {
      const validSelectedItems = selectedAnalysisProductIds
        .map((productId) =>
          turnoverStats.find((item) => item.productId === productId)
        )
        .filter(Boolean)

      if (validSelectedItems.length > 0) {
        return validSelectedItems
      }
    }

    return turnoverStats.slice(0, MAX_TURNOVER_ANALYSIS_PRODUCTS)
  }, [selectedAnalysisProductIds, turnoverStats])

  const categoryOptions = useMemo(() => {
    const categories = new Map()

    turnoverStats.forEach((item) => {
      const normalizedCategory = normalizeCategory(item.category)

      if (!categories.has(normalizedCategory)) {
        categories.set(normalizedCategory, item.category)
      }
    })

    return Array.from(categories.values()).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    )
  }, [turnoverStats])

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return turnoverStats.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        String(item.cod || '').toLowerCase().includes(normalizedSearch)

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(normalizeCategory(item.category))

      return matchesSearch && matchesCategory
    })
  }, [search, selectedCategories, turnoverStats])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, pageSize, safeCurrentPage])

  const summary = useMemo(() => {
    return {
      total: turnoverStats.length,
      high: turnoverStats.filter((item) => item.turnoverLabel === 'alto').length,
      medium: turnoverStats.filter((item) => item.turnoverLabel === 'medio').length,
      low: turnoverStats.filter((item) => item.turnoverLabel === 'baixo').length
    }
  }, [turnoverStats])

  const toggleAnalysisProduct = (productId) => {
    setSelectedAnalysisProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((itemId) => itemId !== productId)
      }

      if (prev.length >= MAX_TURNOVER_ANALYSIS_PRODUCTS) {
        toast.error(`Selecione no máximo ${MAX_TURNOVER_ANALYSIS_PRODUCTS} produtos para a IA.`)
        return prev
      }

      return [...prev, productId]
    })
  }

  const openProductDialog = (productId) => {
    setSelectedProductId(productId)
    setProductDialogOpen(true)
  }

  const handleAnalyzeTurnover = async (productsOverride) => {
    if (turnoverStats.length === 0) {
      toast.error('Ainda não há dados suficientes para analisar o giro.')
      return
    }

    const productsForAnalysis = Array.isArray(productsOverride)
      ? productsOverride
      : selectedAnalysisItems.slice(0, MAX_TURNOVER_ANALYSIS_PRODUCTS)

    if (productsForAnalysis.length === 0) {
      toast.error('Selecione produtos ou mantenha a lista com movimentacoes disponiveis.')
      return
    }

    setProductDialogOpen(false)
    setAnalysisDialogOpen(true)
    setIsAnalyzingTurnover(true)
    setTurnoverAnalysis(null)

    try {
      const response = await authenticatedFetch('/api/inventory-turnover-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getApiAuthHeaders()) },
        body: JSON.stringify({ products: productsForAnalysis })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível analisar o giro agora.')
      }

      setTurnoverAnalysis(data)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível analisar o giro agora.'))
      setTurnoverAnalysis(null)
    } finally {
      setIsAnalyzingTurnover(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 sm:gap-6 sm:pb-6">
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-5">
        <div className="min-w-0 space-y-1">
          <h1 className="flex min-w-0 items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="min-w-0 truncate">Análise de Giro</span>
          </h1>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Select
            value={selectedPeriod}
            onValueChange={(value) => {
              setSelectedPeriod(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => handleAnalyzeTurnover()}
            disabled={isAnalyzingTurnover || turnoverStats.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Analisar com IA
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Produtos avaliados
            </p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Giro alto
            </p>
            <p className="text-2xl font-bold text-emerald-700">{summary.high}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Giro medio
            </p>
            <p className="text-2xl font-bold text-amber-700">{summary.medium}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Giro baixo
            </p>
            <p className="text-2xl font-bold text-slate-700">{summary.low}</p>
          </CardContent>
        </Card>
      </div>

      {turnoverStats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="mb-4 h-12 w-12 text-primary/50" />
            <p className="text-muted-foreground">
              Ainda não há movimentacoes suficientes para analisar o giro dos produtos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle>Panorama geral do giro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <GeneralTurnoverChart
                data={turnoverStats}
                periodDays={selectedPeriodDays}
                comparisonPeriodDays={comparisonPeriodDays}
              />
              <p className="text-sm text-muted-foreground">
                Panorama consolidado de entradas e saídas no período escolhido.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <span>Produtos</span>
                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <CheckboxFilter
                    label="categoria"
                    allLabel="Todas as categorias"
                    options={categoryOptions.map((category) => ({
                      value: normalizeCategory(category),
                      label: category
                    }))}
                    value={selectedCategories}
                    onChange={(value) => {
                      setSelectedCategories(value)
                      setCurrentPage(1)
                    }}
                    className="sm:w-[220px]"
                  />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Buscar por nome ou código"
                  className="w-full sm:w-[280px]"
                />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Marque até {MAX_TURNOVER_ANALYSIS_PRODUCTS} produtos para a IA. Sem seleção, serão analisados os {MAX_TURNOVER_ANALYSIS_PRODUCTS} produtos com maior saída.
              </div>

              <div className="space-y-2">
                {paginatedItems.map((item) => (
                  <div
                    key={item.productId}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProductDialog(item.productId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openProductDialog(item.productId)
                      }
                    }}
                    className={`flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border p-3 text-left transition-colors hover:bg-muted/40 ${selectedItem?.productId === item.productId
                      ? 'border-primary bg-primary/5'
                      : ''
                      }`}
                  >
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="pt-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedAnalysisProductIds.includes(item.productId)}
                            onCheckedChange={() => toggleAnalysisProduct(item.productId)}
                            aria-label={`Selecionar ${item.name} para análise por IA`}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{item.name}</p>
                          <p className="break-words text-xs text-muted-foreground">
                            Cod: {item.cod} | Categoria: {item.category} | Estoque: {item.currentStock} | Min: {item.min} | Max: {item.max}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${item.turnoverLabel === 'alto'
                          ? 'bg-emerald-100 text-emerald-900'
                          : item.turnoverLabel === 'medio'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-900'
                          }`}
                      >
                        Giro {item.turnoverLabel}
                      </span>
                    </div>
                    <div className="grid min-w-0 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <span className="min-w-0 truncate">Saída {item.periodDays}d: {item.saida30}</span>
                      <span className="min-w-0 truncate">Entrada {item.periodDays}d: {item.entrada30}</span>
                      <span className="min-w-0 truncate">Média mensal: {item.avgMonthlyOut}</span>
                    </div>
                  </div>
                ))}
              </div>

              <TablePagination
                page={safeCurrentPage}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                pageSize={pageSize}
                itemLabel="produtos"
                onPageChange={setCurrentPage}
                onPageSizeChange={(value) => {
                  setPageSize(value)
                  setCurrentPage(1)
                }}
              />
            </CardContent>
          </Card>

          {false && selectedItem && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base">{selectedItem.name}</p>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      Cod: {selectedItem.cod} | Estoque atual: {selectedItem.currentStock} | Min: {selectedItem.min} | Max: {selectedItem.max}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${selectedItem.turnoverLabel === 'alto'
                      ? 'bg-emerald-100 text-emerald-900'
                      : selectedItem.turnoverLabel === 'medio'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-900'
                      }`}
                  >
                    Giro {selectedItem.turnoverLabel}
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Historico do produto
                  </p>
                  <ProductTurnoverChart item={selectedItem} />
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <p>Saída {selectedItem.periodDays} dias: {selectedItem.saida30}</p>
                  <p>Saída {selectedItem.comparisonPeriodDays} dias: {selectedItem.saidaComparacao}</p>
                  <p>Entrada {selectedItem.periodDays} dias: {selectedItem.entrada30}</p>
                  <p>Entrada {selectedItem.comparisonPeriodDays} dias: {selectedItem.entradaComparacao}</p>
                  <p>Média mensal de saída: {selectedItem.avgMonthlyOut}</p>
                  <p>
                    Dias sem saída:{' '}
                    {selectedItem.daysWithoutSales == null
                      ? 'sem registro'
                      : selectedItem.daysWithoutSales}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl p-4 sm:p-6">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base">{selectedItem.name}</p>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      Cod: {selectedItem.cod} | Categoria: {selectedItem.category} | Estoque atual: {selectedItem.currentStock} | Min: {selectedItem.min} | Max: {selectedItem.max}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${selectedItem.turnoverLabel === 'alto'
                      ? 'bg-emerald-100 text-emerald-900'
                      : selectedItem.turnoverLabel === 'medio'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-100 text-slate-900'
                      }`}
                  >
                    Giro {selectedItem.turnoverLabel}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleAnalyzeTurnover([selectedItem])}
                  disabled={isAnalyzingTurnover}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analisar este produto com IA
                </Button>

                <div>
                  <p className="mb-2 text-sm font-medium">
                    Histórico do produto
                  </p>
                  <ProductTurnoverChart item={selectedItem} />
                </div>

                <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                  <p>Saída {selectedItem.periodDays} dias: {selectedItem.saida30}</p>
                  <p>Saída {selectedItem.comparisonPeriodDays} dias: {selectedItem.saidaComparacao}</p>
                  <p>Entrada {selectedItem.periodDays} dias: {selectedItem.entrada30}</p>
                  <p>Entrada {selectedItem.comparisonPeriodDays} dias: {selectedItem.entradaComparacao}</p>
                  <p>Média mensal de saída: {selectedItem.avgMonthlyOut}</p>
                  <p>
                    Dias sem saída:{' '}
                    {selectedItem.daysWithoutSales == null
                      ? 'sem registro'
                      : selectedItem.daysWithoutSales}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={analysisDialogOpen}
        onOpenChange={(open) => {
          if (!isAnalyzingTurnover) {
            setAnalysisDialogOpen(open)
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Leitura da IA sobre o giro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isAnalyzingTurnover ? (
              <div className="rounded-xl border bg-primary/5 px-4 py-6 text-sm text-primary">
                Analisando o giro dos produtos...
              </div>
            ) : (
              <>
                {turnoverAnalysis?.summary && (
                  <div className="rounded-xl border bg-primary/5 px-4 py-4">
                    <p className="text-sm font-medium text-primary">
                      Resumo
                      {turnoverAnalysis.source === 'local' ? ' automatico' : ''}
                    </p>
                    <p className="mt-2 text-sm">{turnoverAnalysis.summary}</p>
                    {turnoverAnalysis.source === 'local' && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        A IA externa não respondeu ou não está configurada; foi usada uma análise local pelos dados de giro.
                      </p>
                    )}
                  </div>
                )}

                {Array.isArray(turnoverAnalysis?.recommendations) &&
                  turnoverAnalysis.recommendations.length > 0 && (
                    <div className="ige-scrollbar max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                      {turnoverAnalysis.recommendations.map((item, index) => (
                        <div
                          key={`${item.productId || item.name}-${index}`}
                          className="rounded-xl border bg-card p-3"
                        >
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Sugestão de mínimo: {item.minSuggestion ?? '-'} | Sugestão de máximo: {item.maxSuggestion ?? '-'}
                          </p>
                          {item.recommendation && (
                            <p className="mt-2 text-sm">{item.recommendation}</p>
                          )}
                          {item.reason && (
                            <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
