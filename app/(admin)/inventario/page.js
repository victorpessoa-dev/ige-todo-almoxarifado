'use client'

import { useState, useRef } from 'react'
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
    if (editingProduto) {
      await updateProduto(editingProduto.id, data)
      setEditingProduto(null)
    } else {
      await addProduto(data)
      setIsAddDialogOpen(false)
    }
    reset()
  }

  const handleEdit = (produto) => {
    setEditingProduto(produto)

    setValue('cod', produto.cod)
    setValue('nome', produto.nome)
    setValue('cod_barra', produto.cod_barra)
    setValue('max', produto.max)
    setValue('min', produto.min)
    setValue('estoque', produto.estoque)
  }

  const openMovimentoDialog = (produto, tipo, quantidade = 1) => {
    setMovimentoDialog({ open: true, produto, tipo })
    setValue('quantidade', quantidade)
  }

  const handleMovimento = async (quantidade) => {
    if (!movimentoDialog.produto) return

    const amount = parseInt(quantidade) || 0
    if (amount <= 0) return

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
        deleteProduto={deleteProduto}
      />

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
            onSubmit={(data) =>
              handleMovimento(data.quantidade)
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