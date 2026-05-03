'use client'

import { useState } from 'react'
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
import { Plus } from 'lucide-react'
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

export default function InventarioPage() {
  const {
    produtos,
    addProduto,
    updateProduto,
    deleteProduto,
    entradaProduto,
    saidaProduto
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
  const { register, handleSubmit, reset, setValue, watch } = useForm()

  const selectedProducts = produtos.filter((produto) =>
    selectedProductIds.includes(produto.id)
  )


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
      toast.error(getUserMessage(error, 'Nao foi possivel salvar o produto.'))
    }
  }

  const handleEdit = (produto) => {
    setEditingProduto(produto)

    reset({
      cod: produto.cod,
      nome: produto.nome,
      cod_barra: produto.cod_barra,
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
        toast.success('Saida registrada com sucesso!')
      }

      setMovimentoDialog({ open: false, produto: null, tipo: null })
      setBarcodeProduct(null)
      setBarcodeInput('')
      setScanQuantity(1)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel registrar a movimentacao.'))
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

  const toggleSelectAllProducts = (checked) => {
    setSelectedProductIds(checked ? produtos.map((produto) => produto.id) : [])
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
      setBulkActionError(getUserMessage(error, 'Nao foi possivel excluir os produtos selecionados.'))
    }
  }

  const handleBulkSaida = async () => {
    const quantidade = Number(bulkSaidaQuantidade)

    if (!quantidade || quantidade <= 0) {
      setBulkActionError('Informe uma quantidade valida.')
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
      setBulkActionError(getUserMessage(error, 'Nao foi possivel concluir a baixa dos produtos.'))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 sm:gap-6 sm:pb-6">
      <div className="hidden print-area">
        <PrintEtiqueta produto={printDialog.produto} copies={printCopies} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">Inventario</h1>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto md:px-6">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:max-w-md sm:p-6">
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
          <div className="inventory-table-scroll w-full overflow-x-auto">
            <div className="min-w-[760px]">
              <ProductTable
                produtos={produtos}
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
                deleteProduto={(produto) =>
                  setDeleteDialog({ open: true, produto })
                }
              />
            </div>
          </div>
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

          <p className="text-sm text-muted-foreground">
            Deseja realmente excluir o produto{' '}
            <strong>{deleteDialog.produto?.nome}</strong>?
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
                  toast.error(getUserMessage(error, 'Nao foi possivel excluir o produto.'))
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
              <div key={produto.id} className="py-1">
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
            <DialogTitle>Codigo ja existente</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            O codigo <strong>{duplicateDialog.cod}</strong> ja esta cadastrado.
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
        <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:p-6">
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
              A quantidade informada sera aplicada em todos os {selectedProducts.length} produto(s) selecionados.
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
                  className="flex items-center justify-between gap-3 py-1"
                >
                  <span className="truncate">{produto.nome}</span>
                  <span className="text-muted-foreground">
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
        open={movimentoDialog.open}
        onOpenChange={() =>
          setMovimentoDialog({ open: false, produto: null, tipo: null })
        }
      >
        <DialogContent className="w-[95vw] max-w-[420px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {movimentoDialog.tipo === 'entrada' ? 'Entrada' : 'Saida'}
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
