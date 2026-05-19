'use client'

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

import { useData } from '@/contexts/data-context'
import { supabase } from '@/lib/supabaseClient'
import { getUserMessage } from '@/lib/user-messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Check, MoreHorizontal, Plus } from 'lucide-react'

function normalizeImportedProducts(rows) {
  return rows.reduce((acc, item, index) => {
    if (!item?.cod || !item?.nome) return acc

    acc.push({
      id: `${item.cod}-${index}`,
      originalCode: String(item.cod).trim(),
      code: String(item.cod).trim(),
      nome: String(item.nome).trim(),
      estoque: Number(item.estoque || 0),
      max: Number(item.max || 0),
      min: Number(item.min || 0),
      action: 'create'
    })

    return acc
  }, [])
}

export default function ImportExportProdutos() {
  const { produtos, loadData } = useData()
  const fileInputRef = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importItems, setImportItems] = useState([])

  const itemsWithDuplicates = useMemo(() => {
    return importItems.map((item) => {
      const duplicateProduct = produtos.find((produto) => produto.cod === item.originalCode)
      return {
        ...item,
        duplicateProduct,
        action: duplicateProduct ? item.action || 'sum' : 'create'
      }
    })
  }, [importItems, produtos])

  const importSummary = useMemo(() => {
    return itemsWithDuplicates.reduce(
      (acc, item) => {
        if (item.duplicateProduct && item.action === 'sum') {
          acc.sum += 1
        } else {
          acc.create += 1
        }

        acc.total += 1
        return acc
      },
      { total: 0, create: 0, sum: 0 }
    )
  }, [itemsWithDuplicates])

  const lowStockPurchaseItems = useMemo(() => {
    return produtos
      .filter((produto) => {
        const estoque = Number(produto.estoque || 0)
        const min = Number(produto.min || 0)
        const max = Number(produto.max || 0)

        return estoque <= min && max > estoque
      })
      .map((produto) => {
        const estoque = Number(produto.estoque || 0)
        const max = Number(produto.max || 0)

        return {
          produto: produto.nome,
          quantidade_comprar: max - estoque
        }
      })
      .sort((a, b) => a.produto.localeCompare(b.produto))
  }, [produtos])

  const exportToCSV = () => {
    const headers = ['cod', 'nome', 'estoque', 'max', 'min']
    const rows = produtos.map((produto) => [
      produto.cod,
      produto.nome,
      produto.estoque,
      produto.max,
      produto.min
    ])

    const csv = [headers, ...rows].map((row) => row.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'produtos.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  const exportToXLSX = () => {
    const data = produtos.map((produto) => ({
      cod: produto.cod,
      nome: produto.nome,
      estoque: produto.estoque,
      max: produto.max,
      min: produto.min
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
    XLSX.writeFile(wb, 'produtos.xlsx')
  }

  const exportLowStockPurchaseList = () => {
    if (lowStockPurchaseItems.length === 0) {
      toast.info('Nenhum produto abaixo do estoque minimo para comprar.')
      return
    }

    const ws = XLSX.utils.json_to_sheet(lowStockPurchaseItems)
    ws['!cols'] = [
      { wch: 36 },
      { wch: 20 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de compra')
    XLSX.writeFile(wb, 'produtos-para-comprar.xlsx')
    toast.success('Lista de compra baixada com sucesso!')
  }

  const updateImportItem = (id, updates) => {
    setImportItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const resetImportState = () => {
    setImportItems([])
    setPreviewOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)
      const imported = normalizeImportedProducts(json)

      if (imported.length === 0) {
        toast.error('Nenhum produto valido foi encontrado no arquivo.')
        resetImportState()
        return
      }

      setImportItems(imported)
      setPreviewOpen(true)
    } catch (error) {
      console.error('Erro ao ler arquivo de importacao:', error)
      toast.error('Nao foi possivel ler o arquivo informado.')
      resetImportState()
    }
  }

  const validateImport = () => {
    const usedCodes = new Set()

    for (const item of itemsWithDuplicates) {
      if (item.action === 'sum') continue

      const nextCode = String(item.code || '').trim()

      if (!nextCode) {
        return 'Informe um codigo para todos os produtos que serao criados.'
      }

      const existingWithCode = produtos.find(
        (produto) => produto.cod === nextCode && produto.cod !== item.originalCode
      )

      if (existingWithCode) {
        return `O codigo ${nextCode} ja existe no produto ${existingWithCode.nome}.`
      }

      if (usedCodes.has(nextCode)) {
        return `O codigo ${nextCode} foi repetido mais de uma vez na importacao.`
      }

      usedCodes.add(nextCode)
    }

    return null
  }

  const confirmImport = async () => {
    const validationError = validateImport()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsImporting(true)

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Sua sessao expirou. Entre novamente para continuar.')
      }

      for (const item of itemsWithDuplicates) {
        if (item.action === 'sum' && item.duplicateProduct) {
          const { error } = await supabase
            .from('produtos')
            .update({
              estoque: Number(item.duplicateProduct.estoque || 0) + Number(item.estoque || 0)
            })
            .eq('id', item.duplicateProduct.id)

          if (error) throw error
          continue
        }

        const { error } = await supabase.from('produtos').insert({
          user_id: user.id,
          cod: item.code,
          nome: item.nome,
          estoque: item.estoque,
          max: item.max,
          min: item.min,
          cod_barra: item.code
        })

        if (error) throw error
      }

      await loadData()
      toast.success('Importacao concluida com sucesso!')
      resetImportState()
    } catch (error) {
      console.error('Erro ao confirmar importacao:', error)
      toast.error(getUserMessage(error, 'Nao foi possivel concluir a importacao.'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <div className="w-full sm:w-auto">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            onClick={exportToCSV}
            className="h-auto min-h-10 w-full whitespace-normal px-3 text-sm"
          >
            Exp. CSV
          </Button>

          <Button
            onClick={exportToXLSX}
            className="h-auto min-h-10 w-full whitespace-normal px-3 text-sm"
          >
            Exp. XLSX
          </Button>

          <Button
            onClick={exportLowStockPurchaseList}
            className="h-auto min-h-10 w-full whitespace-normal px-3 text-center text-sm leading-tight"
          >
            Lista compra
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="h-auto min-h-10 w-full whitespace-normal px-3 text-sm"
          >
            Imp. Arquivo
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!isImporting) {
            if (!open) {
              resetImportState()
            } else {
              setPreviewOpen(true)
            }
          }
        }}
      >
        <DialogContent className="grid max-h-[calc(100vh-2rem)] w-[95vw] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>Confirmar importacao de produtos</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Confira os itens lidos do arquivo antes de gravar no estoque.
            </p>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border bg-background px-3 py-3">
                <p className="text-xs uppercase text-muted-foreground">Lidos</p>
                <p className="text-xl font-bold">{importSummary.total}</p>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3">
                <p className="text-xs uppercase text-emerald-700">Criar</p>
                <p className="text-xl font-bold text-emerald-900">
                  {importSummary.create}
                </p>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3">
                <p className="text-xs uppercase text-amber-700">Somar</p>
                <p className="text-xl font-bold text-amber-900">
                  {importSummary.sum}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[minmax(220px,1fr)_120px_80px_80px_80px_minmax(280px,340px)] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground lg:grid">
                <span>Produto</span>
                <span>Codigo</span>
                <span>Estoque</span>
                <span>Min</span>
                <span>Max</span>
                <span>Acoes</span>
              </div>

              <div className="divide-y">
                {itemsWithDuplicates.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 bg-background p-3 sm:p-4 lg:grid-cols-[minmax(220px,1fr)_120px_80px_80px_80px_minmax(280px,340px)] lg:items-start"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words font-semibold">
                          {item.nome}
                        </p>
                        {item.duplicateProduct ? (
                          <span className="w-fit rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Duplicado
                          </span>
                        ) : (
                          <span className="w-fit rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Novo
                          </span>
                        )}
                      </div>

                      {item.duplicateProduct && (
                        <p className="mt-1 text-xs text-amber-900">
                          Existe: {item.duplicateProduct.nome} | Estoque atual:{' '}
                          {item.duplicateProduct.estoque}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-sm lg:contents">
                      <div className="rounded-lg border bg-background/70 px-3 py-2 lg:border-0 lg:bg-transparent lg:p-0">
                        <p className="text-xs uppercase text-muted-foreground lg:hidden">Codigo</p>
                        <p className="font-medium">{item.originalCode}</p>
                      </div>
                      <div className="rounded-lg border bg-background/70 px-3 py-2 lg:border-0 lg:bg-transparent lg:p-0">
                        <p className="text-xs uppercase text-muted-foreground lg:hidden">Estoque</p>
                        <p className="font-medium">{item.estoque}</p>
                      </div>
                      <div className="rounded-lg border bg-background/70 px-3 py-2 lg:border-0 lg:bg-transparent lg:p-0">
                        <p className="text-xs uppercase text-muted-foreground lg:hidden">Min</p>
                        <p className="font-medium">{item.min}</p>
                      </div>
                      <div className="rounded-lg border bg-background/70 px-3 py-2 lg:border-0 lg:bg-transparent lg:p-0">
                        <p className="text-xs uppercase text-muted-foreground lg:hidden">Max</p>
                        <p className="font-medium">{item.max}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      {item.duplicateProduct ? (
                        <>
                          <div className="flex w-full items-center justify-between gap-2 lg:justify-end">
                            <span className="text-sm text-muted-foreground">
                              {item.action === 'sum' ? 'Somar estoque' : 'Criar novo'}
                            </span>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    updateImportItem(item.id, {
                                      action: 'sum',
                                      code: item.originalCode
                                    })
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                  Somar estoque
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    updateImportItem(item.id, {
                                      action: 'create',
                                      code:
                                        item.code && item.code !== item.originalCode
                                          ? item.code
                                          : ''
                                    })
                                  }
                                >
                                  <Plus className="h-4 w-4" />
                                  Criar novo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {item.action === 'create' && (
                            <Input
                              value={item.code}
                              onChange={(event) =>
                                updateImportItem(item.id, {
                                  code: event.target.value
                                })
                              }
                              placeholder="Novo codigo"
                            />
                          )}
                        </>
                      ) : (
                        <div className="flex w-full items-center justify-between gap-2 lg:justify-end">
                          <span className="text-sm text-muted-foreground">
                            Criar produto
                          </span>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acoes</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled>
                                <Plus className="h-4 w-4" />
                                Criar produto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:px-6">
            <Button
              variant="outline"
              onClick={resetImportState}
              disabled={isImporting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>

            <Button
              onClick={confirmImport}
              disabled={isImporting}
              className="w-full whitespace-normal text-center sm:w-auto"
            >
              {isImporting
                ? 'Importando...'
                : `Confirmar importacao (${importSummary.create} criar, ${importSummary.sum} somar)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
