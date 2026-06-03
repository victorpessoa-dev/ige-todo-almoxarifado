'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Package, Plus, ShoppingCart } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import BarcodeScannerCard from '@/components/inventory/BarcodeScannerCard'
import ImportExportProdutos from '@/components/inventory/ImportExportProdutos'
import ProductTable from '@/components/inventory/ProductTable'
import ProductFormFields from '@/components/inventory/ProductFormFields'
import MovementFormFields from '@/components/inventory/MovementFormFields'
import PrintDialogContent from '@/components/inventory/PrintDialogContent'
import PrintEtiqueta from '@/components/inventory/PrintEtiqueta'
import { getUserMessage } from '@/lib/user-messages'

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getInventoryCategory(produto) {
  const categoria = String(produto?.categoria || '').trim()

  return categoria || 'Sem categoria'
}

export default function InventarioPage() {
  const {
    produtos,
    addProduto,
    updateProduto,
    deleteProduto,
    entradaProduto,
    saidaProduto,
    addSolicitacao,
    solicitantesCompra,
    centrosCusto
  } = useData()

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    produto: null
  })

  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    cod: ''
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState(null)
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkSaidaDialogOpen, setBulkSaidaDialogOpen] = useState(false)
  const [bulkSaidaQuantidade, setBulkSaidaQuantidade] = useState(1)
  const [bulkActionError, setBulkActionError] = useState('')
  const [compraDialog, setCompraDialog] = useState({
    open: false,
    produto: null,
    quantidade: 0
  })
  const [compraForm, setCompraForm] = useState({
    centro_custo_id: '',
    solicitante_id: ''
  })
  const [isSolicitandoCompra, setIsSolicitandoCompra] = useState(false)

  const [movimentoDialog, setMovimentoDialog] = useState({
    open: false,
    produto: null,
    tipo: null
  })

  const [printDialog, setPrintDialog] = useState({
    open: false,
    produto: null
  })

  const [printCopies, setPrintCopies] = useState(14)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [scanQuantity, setScanQuantity] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const { register, handleSubmit, reset, setValue, watch } = useForm()

  const categoryOptions = useMemo(() => {
    const categories = new Map()

    produtos.forEach((produto) => {
      const categoria = getInventoryCategory(produto)
      const key = normalizeCategory(categoria)

      if (key && !categories.has(key)) {
        categories.set(key, categoria)
      }
    })

    return Array.from(categories.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [produtos])

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'todas') return produtos

    return produtos.filter(
      (produto) => normalizeCategory(getInventoryCategory(produto)) === selectedCategory
    )
  }, [produtos, selectedCategory])

  const selectedProducts = produtos.filter((produto) =>
    selectedProductIds.includes(produto.id)
  )
  const lowStockProducts = produtos.filter(
    (produto) =>
      Number(produto.estoque || 0) <= Number(produto.min || 0) &&
      Number(produto.max || 0) > Number(produto.estoque || 0)
  )

  const activeSolicitantes = solicitantesCompra.filter((item) => item.ativo !== false)
  const activeCentrosCusto = centrosCusto.filter((item) => item.ativo !== false)

  const getCentroCustoLabel = (centroCusto) => {
    if (!centroCusto) return ''
    return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')
  }

  const getSolicitanteCentroCusto = (solicitante) => {
    if (!solicitante?.centro_custo_id) return null

    return (
      activeCentrosCusto.find((item) => item.id === solicitante.centro_custo_id) ||
      solicitante.centros_custo ||
      null
    )
  }

  const openCompraDialog = (produto) => {
    const quantidade = Math.max(
      0,
      Number(produto.max || 0) - Number(produto.estoque || 0)
    )

    setCompraDialog({ open: true, produto, quantidade })
    setCompraForm({ centro_custo_id: '', solicitante_id: '' })
  }

  const updateCompraField = (field, value) => {
    setCompraForm((prev) => {
      const nextForm = { ...prev, [field]: value }

      if (field === 'solicitante_id') {
        const solicitante = activeSolicitantes.find((item) => item.id === value)
        const centroCusto = getSolicitanteCentroCusto(solicitante)

        if (centroCusto) {
          nextForm.centro_custo_id = centroCusto.id
        }
      }

      return nextForm
    })
  }

  const handleSolicitarCompra = async () => {
    const produto = compraDialog.produto

    if (!produto) return
    if (!compraForm.centro_custo_id || !compraForm.solicitante_id) {
      toast.error('Selecione o centro de custo e o solicitante.')
      return
    }

    if (!compraDialog.quantidade || compraDialog.quantidade <= 0) {
      toast.error('Este produto não tem quantidade pendente para completar o máximo.')
      return
    }

    setIsSolicitandoCompra(true)

    try {
      const solicitacao = await addSolicitacao({
        nome_item: `${produto.cod ? `${produto.cod} - ` : ''}${produto.nome}`,
        quantidade: compraDialog.quantidade,
        prioridade: 'media',
        centro_custo_id: compraForm.centro_custo_id,
        solicitante_id: compraForm.solicitante_id,
        produto_id: produto.id,
        aplicacoes: `Reposição de estoque baixo. Estoque atual: ${produto.estoque}. Máximo: ${produto.max}.`
      })

      setCompraDialog({ open: false, produto: null, quantidade: 0 })
      setCompraForm({ centro_custo_id: '', solicitante_id: '' })
      toast.success(`Solicitação ${solicitacao.codigo || ''} criada com sucesso!`)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível criar a solicitação de compra.'))
    } finally {
      setIsSolicitandoCompra(false)
    }
  }

  const checkCodigoExists = async (cod, ignoreId = null) => {
    const { data, error } = await supabase
      .from('produtos')
      .select('id')
      .eq('cod', cod)
      .maybeSingle()

    if (error) throw error
    if (!data) return false
    if (ignoreId && data.id === ignoreId) return false

    return true
  }

  const onSubmit = async (data) => {
    try {
      const exists = await checkCodigoExists(data.cod, editingProduto?.id)

      if (exists) {
        setDuplicateDialog({
          open: true,
          cod: data.cod
        })
        return
      }

      const payload = {
        ...data,
        cod_barra: String(data.cod)
      }

      if (editingProduto) {
        await updateProduto(editingProduto.id, payload)
        setEditingProduto(null)
        toast.success('Produto atualizado com sucesso!')
      } else {
        await addProduto(payload)
        setIsAddDialogOpen(false)
        toast.success('Produto criado com sucesso!')
      }

      reset()
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível salvar o produto.'))
    }
  }

  const handleEdit = (produto) => {
    setEditingProduto(produto)

    reset({
      cod: produto.cod,
      nome: produto.nome,
      cod_barra: produto.cod_barra,
      categoria: produto.categoria || '',
      aplicacao: produto.aplicacao || '',
      medidas: produto.medidas || '',
      marcas: produto.marcas || '',
      img_url: produto.img_url || '',
      max: produto.max,
      min: produto.min,
      estoque: produto.estoque
    })
  }

  const openMovimentoDialog = (produto, tipo, quantidade = 1) => {
    setMovimentoDialog({ open: true, produto, tipo })
    setValue('quantidade', quantidade)
  }

  const handleMovimento = async (quantidade) => {
    if (!movimentoDialog.produto) return

    const amount = Number(quantidade)
    if (!amount || amount <= 0) return

    try {
      if (movimentoDialog.tipo === 'entrada') {
        await entradaProduto(movimentoDialog.produto.id, amount)
        toast.success('Entrada registrada com sucesso!')
      } else {
        await saidaProduto(movimentoDialog.produto.id, amount)
        toast.success('Saída registrada com sucesso!')
      }

      setMovimentoDialog({ open: false, produto: null, tipo: null })
      setBarcodeProduct(null)
      setBarcodeInput('')
      setScanQuantity(1)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível registrar a movimentacao.'))
    }
  }

  const handleBarcodeScan = (event) => {
    const scannedCode = event.target.value
    setBarcodeInput(scannedCode)

    const produto = produtos.find(
      (p) => p.cod_barra === scannedCode || p.cod === scannedCode
    )

    setBarcodeProduct(produto || null)
  }

  const handleBarcodeKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()

      const produto = produtos.find(
        (p) => p.cod_barra === barcodeInput || p.cod === barcodeInput
      )

      if (produto) {
        openMovimentoDialog(produto, 'saida', scanQuantity)
      }
    }
  }

  const handlePrint = () => {
    setPrintDialog((prev) => ({ ...prev, open: false }))

    setTimeout(() => {
      window.print()
    }, 600)
  }

  const toggleProductSelection = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAllProducts = (checked, visibleProducts = filteredProducts) => {
    const visibleIds = visibleProducts.map((produto) => produto.id)

    setSelectedProductIds((prev) => {
      if (!checked) {
        return prev.filter((id) => !visibleIds.includes(id))
      }

      return Array.from(new Set([...prev, ...visibleIds]))
    })
  }

  const clearSelection = () => {
    setSelectedProductIds([])
  }

  const handleBulkDelete = async () => {
    try {
      for (const produto of selectedProducts) {
        await deleteProduto(produto.id)
      }

      setBulkDeleteDialogOpen(false)
      setBulkActionError('')
      clearSelection()
      toast.success('Produtos removidos com sucesso!')
    } catch (error) {
      setBulkActionError(getUserMessage(error, 'Não foi possível excluir os produtos selecionados.'))
    }
  }

  const handleBulkSaida = async () => {
    const quantidade = Number(bulkSaidaQuantidade)

    if (!quantidade || quantidade <= 0) {
      setBulkActionError('Informe uma quantidade válida.')
      return
    }

    const insuficientes = selectedProducts.filter(
      (produto) => produto.estoque < quantidade
    )

    if (insuficientes.length > 0) {
      setBulkActionError(
        `Sem estoque suficiente para: ${insuficientes
          .map((produto) => produto.nome)
          .join(', ')}.`
      )
      return
    }

    try {
      for (const produto of selectedProducts) {
        await saidaProduto(produto.id, quantidade)
      }

      setBulkSaidaDialogOpen(false)
      setBulkSaidaQuantidade(1)
      setBulkActionError('')
      clearSelection()
      toast.success('Baixa registrada com sucesso!')
    } catch (error) {
      setBulkActionError(getUserMessage(error, 'Não foi possível concluir a baixa dos produtos.'))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 sm:gap-6 sm:pb-6">
      <div className="hidden print-area">
        <PrintEtiqueta produto={printDialog.produto} copies={printCopies} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-5">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl">
            <Package className="h-7 w-7 text-primary" />
            Inventario
          </h1>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            className="w-full sm:w-auto md:px-6"
            variant="outline"
            onClick={() => {
              if (lowStockProducts.length === 0) {
                toast.info('Nenhum produto com estoque baixo para solicitar compra.')
                return
              }

              openCompraDialog(lowStockProducts[0])
            }}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Solicitar Compra
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto md:px-6">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[calc(100vh-2rem)] w-[95vw] overflow-y-auto p-4 sm:max-w-xl sm:p-6">
              <DialogHeader>
                <DialogTitle>Adicionar Produto</DialogTitle>
              </DialogHeader>

              <ProductFormFields
                register={register}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                buttonText="Salvar"
                watch={watch}
                setValue={setValue}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap gap-2">
          <ImportExportProdutos />
        </div>

        <BarcodeScannerCard
          barcodeInput={barcodeInput}
          barcodeProduct={barcodeProduct}
          scanQuantity={scanQuantity}
          handleBarcodeScan={handleBarcodeScan}
          handleBarcodeKeyDown={handleBarcodeKeyDown}
          setBarcodeInput={setBarcodeInput}
          setBarcodeProduct={setBarcodeProduct}
          setScanQuantity={setScanQuantity}
          openMovimentoDialog={openMovimentoDialog}
          produtos={produtos}
        />

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <ProductTable
            produtos={filteredProducts}
            openMovimentoDialog={openMovimentoDialog}
            setPrintDialog={setPrintDialog}
            handleEdit={handleEdit}
            selectedIds={selectedProductIds}
            onToggleSelect={toggleProductSelection}
            onToggleSelectAll={toggleSelectAllProducts}
            onClearSelection={clearSelection}
            onBulkDelete={() => {
              setBulkActionError('')
              setBulkDeleteDialogOpen(true)
            }}
            onBulkSaida={() => {
              setBulkActionError('')
              setBulkSaidaQuantidade(1)
              setBulkSaidaDialogOpen(true)
            }}
            onSolicitarCompra={openCompraDialog}
            headerActions={
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  clearSelection()
                }}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categoryOptions.map((categoria) => (
                    <SelectItem key={categoria} value={normalizeCategory(categoria)}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            deleteProduto={(produto) =>
              setDeleteDialog({ open: true, produto })
            }
          />
        </div>
      </div>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={() => setDeleteDialog({ open: false, produto: null })}
      >
        <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
          </DialogHeader>

          <p className="min-w-0 text-sm text-muted-foreground">
            Deseja realmente excluir o produto{' '}
            <strong className="break-words">{deleteDialog.produto?.nome}</strong>?
          </p>

          <div className="mt-4 flex flex-col justify-end gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, produto: null })}
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteProduto(deleteDialog.produto.id)
                  setDeleteDialog({ open: false, produto: null })
                  toast.success('Produto removido com sucesso!')
                } catch (error) {
                  toast.error(getUserMessage(error, 'Não foi possível excluir o produto.'))
                }
              }}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={(open) => {
          setBulkDeleteDialogOpen(open)
          if (!open) {
            setBulkActionError('')
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[520px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Excluir produtos selecionados</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Deseja realmente excluir {selectedProducts.length} produto(s)?
          </p>

          <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm">
            {selectedProducts.map((produto) => (
              <div key={produto.id} className="truncate py-1" title={produto.nome || '-'}>
                {produto.nome}
              </div>
            ))}
          </div>

          {bulkActionError && (
            <p className="text-sm text-destructive">{bulkActionError}</p>
          )}

          <div className="mt-2 flex flex-col justify-end gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedProducts.length === 0}
            >
              Excluir selecionados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={duplicateDialog.open}
        onOpenChange={() => setDuplicateDialog({ open: false, cod: '' })}
      >
        <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Código já existente</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            O código <strong>{duplicateDialog.cod}</strong> já está cadastrado.
          </p>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => setDuplicateDialog({ open: false, cod: '' })}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingProduto}
        onOpenChange={() => setEditingProduto(null)}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[95vw] overflow-y-auto p-4 sm:max-w-xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>

          <ProductFormFields
            register={register}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            buttonText="Salvar"
            watch={watch}
            setValue={setValue}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkSaidaDialogOpen}
        onOpenChange={(open) => {
          setBulkSaidaDialogOpen(open)
          if (!open) {
            setBulkSaidaQuantidade(1)
            setBulkActionError('')
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[520px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Dar baixa em varios produtos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A quantidade informada será aplicada em todos os {selectedProducts.length} produto(s) selecionados.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Quantidade para cada produto
              </label>
              <Input
                type="number"
                min={1}
                value={bulkSaidaQuantidade}
                onChange={(event) => {
                  setBulkSaidaQuantidade(event.target.value)
                  setBulkActionError('')
                }}
              />
            </div>

            <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm">
              {selectedProducts.map((produto) => (
                <div
                  key={produto.id}
                  className="flex min-w-0 items-center justify-between gap-3 py-1"
                >
                  <span className="min-w-0 truncate" title={produto.nome || '-'}>{produto.nome}</span>
                  <span className="shrink-0 text-muted-foreground">
                    Estoque: {produto.estoque}
                  </span>
                </div>
              ))}
            </div>

            {bulkActionError && (
              <p className="text-sm text-destructive">{bulkActionError}</p>
            )}

            <div className="flex flex-col justify-end gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setBulkSaidaDialogOpen(false)}
              >
                Cancelar
              </Button>

              <Button
                variant="destructive"
                onClick={handleBulkSaida}
                disabled={selectedProducts.length === 0}
              >
                Confirmar baixa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={compraDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCompraDialog({ open: false, produto: null, quantidade: 0 })
            setCompraForm({ centro_custo_id: '', solicitante_id: '' })
          } else {
            setCompraDialog((prev) => ({ ...prev, open: true }))
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[520px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Solicitar compra
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="min-w-0 rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="truncate font-medium" title={compraDialog.produto?.nome || '-'}>
                {compraDialog.produto?.nome}
              </p>
              <p
                className="truncate text-muted-foreground"
                title={`Código: ${compraDialog.produto?.cod || '-'} | Estoque: ${compraDialog.produto?.estoque || 0} | Max: ${compraDialog.produto?.max || 0}`}
              >
                Código: {compraDialog.produto?.cod || '-'} | Estoque: {compraDialog.produto?.estoque || 0} | Max: {compraDialog.produto?.max || 0}
              </p>
              <p className="mt-2 font-semibold">
                Quantidade a solicitar: {compraDialog.quantidade}
              </p>
            </div>

            {lowStockProducts.length > 1 && (
              <div className="grid min-w-0 gap-2">
                <label className="truncate text-sm font-medium" title="Produto com estoque baixo">Produto com estoque baixo</label>
                <Select
                  value={compraDialog.produto?.id || ''}
                  onValueChange={(value) => {
                    const produto = lowStockProducts.find((item) => item.id === value)
                    if (produto) {
                      const quantidade = Math.max(
                        0,
                        Number(produto.max || 0) - Number(produto.estoque || 0)
                      )

                      setCompraDialog({ open: true, produto, quantidade })
                    }
                  }}
                >
                  <SelectTrigger className="w-full min-w-0 overflow-hidden">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {lowStockProducts.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        <span
                          className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                          title={produto.cod ? `${produto.cod} - ${produto.nome}` : produto.nome}
                        >
                          {produto.cod ? `${produto.cod} - ${produto.nome}` : produto.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-2">
                <label className="truncate text-sm font-medium" title="Centro de custo">Centro de custo</label>
                <Select
                  value={compraForm.centro_custo_id}
                  onValueChange={(value) => updateCompraField('centro_custo_id', value)}
                >
                  <SelectTrigger className="w-full min-w-0 overflow-hidden">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {activeCentrosCusto.map((centroCusto) => (
                      <SelectItem key={centroCusto.id} value={centroCusto.id}>
                        <span
                          className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                          title={getCentroCustoLabel(centroCusto)}
                        >
                          {getCentroCustoLabel(centroCusto)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid min-w-0 gap-2">
                <label className="truncate text-sm font-medium" title="Solicitante">Solicitante</label>
                <Select
                  value={compraForm.solicitante_id}
                  onValueChange={(value) => updateCompraField('solicitante_id', value)}
                >
                  <SelectTrigger className="w-full min-w-0 overflow-hidden">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {activeSolicitantes.map((solicitante) => (
                      <SelectItem key={solicitante.id} value={solicitante.id}>
                        <span
                          className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                          title={[
                            solicitante.nome,
                            getCentroCustoLabel(getSolicitanteCentroCusto(solicitante))
                          ].filter(Boolean).join(' - ')}
                        >
                          {[
                            solicitante.nome,
                            getCentroCustoLabel(getSolicitanteCentroCusto(solicitante))
                          ].filter(Boolean).join(' - ')}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setCompraDialog({ open: false, produto: null, quantidade: 0 })
                  setCompraForm({ centro_custo_id: '', solicitante_id: '' })
                }}
                disabled={isSolicitandoCompra}
              >
                Cancelar
              </Button>

              <Button
                onClick={handleSolicitarCompra}
                disabled={isSolicitandoCompra}
              >
                {isSolicitandoCompra ? 'Solicitando...' : 'Criar solicitação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={movimentoDialog.open}
        onOpenChange={() =>
          setMovimentoDialog({ open: false, produto: null, tipo: null })
        }
      >
        <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {movimentoDialog.tipo === 'entrada' ? 'Entrada' : 'Saída'}
            </DialogTitle>
          </DialogHeader>

          <MovementFormFields
            register={register}
            handleSubmit={handleSubmit}
            onSubmit={({ quantidade }) => handleMovimento(Number(quantidade))}
            tipo={movimentoDialog.tipo}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={printDialog.open}
        onOpenChange={() => setPrintDialog({ open: false, produto: null })}
      >
        <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Imprimir Etiqueta</DialogTitle>
          </DialogHeader>

          <PrintDialogContent
            produto={printDialog.produto}
            printCopies={printCopies}
            setPrintCopies={setPrintCopies}
            onPrint={handlePrint}
            onCancel={() => setPrintDialog({ open: false, produto: null })}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
