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
      <div className="flex items-center justify-center">
        <div className="flex flex-row gap-2">
          <Button onClick={exportToCSV}>Exp. CSV</Button>

          <Button onClick={exportToXLSX}>Exp. XLSX</Button>

          <Button onClick={() => fileInputRef.current?.click()}>
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
        <DialogContent className="w-[95vw] max-w-4xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Confirmar importacao</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revise os produtos lidos antes de salvar no banco. Quando houver codigo duplicado,
              voce pode somar ao produto existente ou criar um novo com outro codigo.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total lidos
                </p>
                <p className="text-2xl font-bold">{importSummary.total}</p>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">
                  Serao criados
                </p>
                <p className="text-2xl font-bold text-emerald-900">
                  {importSummary.create}
                </p>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-amber-700">
                  Serao somados
                </p>
                <p className="text-2xl font-bold text-amber-900">
                  {importSummary.sum}
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {itemsWithDuplicates.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.duplicateProduct
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'bg-card'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.nome}</p>
                        {item.duplicateProduct ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            Codigo ja existe
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                            Produto novo
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Codigo lido: {item.originalCode} | Estoque: {item.estoque}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Min: {item.min} | Max: {item.max}
                      </p>

                      {item.duplicateProduct && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          Ja existe no banco: <strong>{item.duplicateProduct.nome}</strong>
                          {' '}com codigo <strong>{item.duplicateProduct.cod}</strong> e estoque atual{' '}
                          <strong>{item.duplicateProduct.estoque}</strong>.
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-2 lg:w-[320px]">
                      {item.duplicateProduct ? (
                        <>
                          <div className="flex flex-col gap-2 rounded-lg border p-3">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`action-${item.id}`}
                                checked={item.action === 'sum'}
                                onChange={() =>
                                  updateImportItem(item.id, {
                                    action: 'sum',
                                    code: item.originalCode
                                  })
                                }
                              />
                              Somar ao produto existente
                            </label>

                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`action-${item.id}`}
                                checked={item.action === 'create'}
                                onChange={() =>
                                  updateImportItem(item.id, {
                                    action: 'create',
                                    code:
                                      item.code && item.code !== item.originalCode
                                        ? item.code
                                        : ''
                                  })
                                }
                              />
                              Criar como novo produto
                            </label>
                          </div>

                          {item.action === 'create' && (
                            <div>
                              <label className="mb-1 block text-sm font-medium">
                                Novo codigo
                              </label>
                              <Input
                                value={item.code}
                                onChange={(event) =>
                                  updateImportItem(item.id, {
                                    code: event.target.value
                                  })
                                }
                                placeholder="Informe outro codigo"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                          Produto novo. Sera criado no banco com o codigo {item.code}.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col justify-end gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={resetImportState}
                disabled={isImporting}
              >
                Cancelar
              </Button>

              <Button onClick={confirmImport} disabled={isImporting}>
                {isImporting
                  ? 'Importando...'
                  : `Confirmar importacao (${importSummary.create} criar, ${importSummary.sum} somar)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
