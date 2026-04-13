'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'

import BarcodeScannerCard from '@/components/inventory/BarcodeScannerCard'
import LowStockCard from '@/components/inventory/LowStockCard'
import ProductTable from '@/components/inventory/ProductTable'
import ProductFormFields from '@/components/inventory/ProductFormFields'
import MovementFormFields from '@/components/inventory/MovementFormFields'
import PrintDialogContent from '@/components/inventory/PrintDialogContent'
import PrintEtiqueta from '@/components/inventory/PrintEtiqueta'

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

  const openDeleteDialog = (produto) => {
    setDeleteDialog({ open: true, produto })
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog.produto) return

    await deleteProduto(deleteDialog.produto.id)

    setDeleteDialog({ open: false, produto: null })
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState(null)
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

  const printRef = useRef() 

  const { register, handleSubmit, reset, setValue, watch } = useForm()

  const onSubmit = async (data) => {
    const exists = await checkCodigoExists(
      data.cod,
      editingProduto?.id
    )

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
    } else {
      await addProduto(payload)
      setIsAddDialogOpen(false)
    }

    reset()
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

    if (movimentoDialog.tipo === 'entrada') {
      await entradaProduto(movimentoDialog.produto.id, amount)
    } else {
      await saidaProduto(movimentoDialog.produto.id, amount)
    }

    setMovimentoDialog({ open: false, produto: null, tipo: null })
    setBarcodeProduct(null)
    setBarcodeInput('')
    setScanQuantity(1)
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

  const produtosBaixoEstoque = produtos.filter(
    (p) => p.estoque <= p.min
  )

  const checkCodigoExists = async (cod, ignoreId = null) => {
  const query = supabase
    .from('produtos')
    .select('id')
    .eq('cod', cod)

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  if (!data) return false

  if (ignoreId && data.id === ignoreId) return false

  return true
}

  return (
    <div className="container mx-auto p-6">

      <div className="hidden print-area">
        <PrintEtiqueta
          produto={printDialog.produto}
          copies={printCopies}
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Inventário</h1>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>

          <DialogContent>
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

      <LowStockCard produtosBaixoEstoque={produtosBaixoEstoque} />

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
      />

      <ProductTable
        produtos={produtos}
        openMovimentoDialog={openMovimentoDialog}
        setPrintDialog={setPrintDialog}
        handleEdit={handleEdit}
        deleteProduto={openDeleteDialog}
      />

      <Dialog
        open={duplicateDialog.open}
        onOpenChange={() =>
          setDuplicateDialog({ open: false, cod: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código já existente</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            O código <strong>{duplicateDialog.cod}</strong> já está cadastrado no sistema.
            <br />
            Por favor, utilize outro código.
          </p>

          <div className="flex justify-end mt-4">
            <Button
              onClick={() =>
                setDuplicateDialog({ open: false, cod: '' })
              }
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduto} onOpenChange={() => setEditingProduto(null)}>
        <DialogContent>
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
        open={movimentoDialog.open}
        onOpenChange={() =>
          setMovimentoDialog({ open: false, produto: null, tipo: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movimentoDialog.tipo === 'entrada'
                ? 'Entrada'
                : 'Saída'}
            </DialogTitle>
          </DialogHeader>

          <MovementFormFields
            register={register}
            handleSubmit={handleSubmit}
            onSubmit={({ quantidade }) =>
              handleMovimento(Number(quantidade))
            }
            tipo={movimentoDialog.tipo}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={printDialog.open}
        onOpenChange={() =>
          setPrintDialog({ open: false, produto: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imprimir Etiqueta</DialogTitle>
          </DialogHeader>

          <PrintDialogContent
            produto={printDialog.produto}
            printCopies={printCopies}
            setPrintCopies={setPrintCopies}
            onPrint={handlePrint} 
            onCancel={() =>
              setPrintDialog({ open: false, produto: null })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}