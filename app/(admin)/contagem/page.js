'use client'

import { useCallback, useState } from 'react'
import { AlertCircle, Camera, ImagePlus, Loader2, Sparkles, Trash2 } from 'lucide-react'

import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { CameraCapture } from '@/components/contagem/CameraCapture'
import { ImageGallery } from '@/components/contagem/ImageGallery'
import { ProductList } from '@/components/contagem/ProductList'
import { downloadExcel } from '@/lib/excel'
import { getUserMessage } from '@/lib/user-messages'

const MAX_IMAGES = 3

function getFriendlyAnalyzeError(error) {
  const message = getUserMessage(
    error,
    'Não foi possível analisar as imagens agora. Tente novamente.'
  )

  if (!message) {
    return 'Não foi possível analisar as imagens agora. Tente novamente.'
  }

  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed')
  ) {
    return 'Falha de conexão ao analisar as imagens. Tente novamente.'
  }

  return message
}

function normalizeProductName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function findInventoryMatch(name, inventoryProducts) {
  const normalizedName = normalizeProductName(name)
  if (!normalizedName) return null

  const exactMatch = inventoryProducts.find(
    (product) => normalizeProductName(product.nome) === normalizedName
  )

  if (exactMatch) return exactMatch

  const includesMatch = inventoryProducts.find((product) => {
    const normalizedInventoryName = normalizeProductName(product.nome)
    return (
      normalizedInventoryName.includes(normalizedName) ||
      normalizedName.includes(normalizedInventoryName)
    )
  })

  return includesMatch || null
}

function buildCountedProduct(product, inventoryMatch) {
  const finalName = inventoryMatch?.nome || product.name
  const physicalStock = Number(product.quantity || product.estoque || 0)
  const systemStock = Number(inventoryMatch?.estoque || 0)

  return {
    id: inventoryMatch?.id || `${normalizeProductName(finalName)}-${Date.now()}-${Math.random()}`,
    cod: inventoryMatch?.cod || '',
    nome: finalName,
    estoque: physicalStock,
    quantity: physicalStock,
    max: Number(inventoryMatch?.max || 0),
    min: Number(inventoryMatch?.min || 0),
    estoqueSistema: inventoryMatch ? systemStock : null,
    matchedProductId: inventoryMatch?.id || null,
    matchedByName: Boolean(inventoryMatch),
    estoqueIgual: inventoryMatch ? systemStock === physicalStock : null
  }
}

export default function ContagemPage() {
  const { produtos: inventoryProducts } = useData()
  const [products, setProducts] = useState([])
  const [pendingImages, setPendingImages] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzingIndex, setAnalyzingIndex] = useState(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [error, setError] = useState(null)

  const addImage = useCallback((imageBase64) => {
    setError(null)

    setPendingImages((prev) => {
      if (prev.length >= MAX_IMAGES) {
        setError(`Maximo de ${MAX_IMAGES} imagens permitidas`)
        return prev
      }

      return [...prev, imageBase64]
    })
  }, [])

  const removeImage = useCallback((index) => {
    setPendingImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }, [])

  const clearImages = useCallback(() => {
    setPendingImages([])
    setError(null)
  }, [])

  const analyzeAllImages = useCallback(async () => {
    if (pendingImages.length === 0) {
      setError('Adicione pelo menos uma imagem')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: pendingImages })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar imagens')
      }

      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts((prev) => {
          const updated = [...prev]

          data.products.forEach((newProduct) => {
            const inventoryMatch = findInventoryMatch(
              newProduct.name,
              inventoryProducts
            )
            const nextProduct = buildCountedProduct(newProduct, inventoryMatch)
            const existingIndex = updated.findIndex(
              (product) =>
                normalizeProductName(product.nome || product.name) ===
                normalizeProductName(nextProduct.nome)
            )

            if (existingIndex >= 0) {
              const current = updated[existingIndex]
              const nextPhysicalStock =
                Number(current.estoque || current.quantity || 0) +
                Number(nextProduct.estoque || 0)

              updated[existingIndex] = {
                ...current,
                cod: current.cod || nextProduct.cod,
                nome: current.nome || nextProduct.nome,
                estoque: nextPhysicalStock,
                quantity: nextPhysicalStock,
                max: current.max || nextProduct.max,
                min: current.min || nextProduct.min,
                estoqueSistema:
                  current.estoqueSistema ?? nextProduct.estoqueSistema,
                matchedProductId:
                  current.matchedProductId || nextProduct.matchedProductId,
                matchedByName: current.matchedByName || nextProduct.matchedByName,
                estoqueIgual:
                  (current.estoqueSistema ?? nextProduct.estoqueSistema) ===
                  nextPhysicalStock
              }
            } else {
              updated.push(nextProduct)
            }
          })

          return updated.sort((a, b) =>
            (a.nome || a.name || '').localeCompare(b.nome || b.name || '')
          )
        })

        setPendingImages([])
      } else {
        setError(
          'Nenhum produto identificado nas imagens. Tente novamente com fotos mais claras.'
        )
      }
    } catch (err) {
      setError(getFriendlyAnalyzeError(err))
    } finally {
      setIsAnalyzing(false)
      setAnalyzingIndex(null)
    }
  }, [inventoryProducts, pendingImages])

  const handleFileUpload = useCallback(
    (event) => {
      const files = event.target.files
      if (!files) return

      setError(null)

      const remainingSlots = MAX_IMAGES - pendingImages.length
      const filesToProcess = Array.from(files).slice(0, remainingSlots)

      if (files.length > remainingSlots) {
        setError(
          `Apenas ${remainingSlots} imagem(ns) adicionada(s). Limite de ${MAX_IMAGES} imagens.`
        )
      }

      filesToProcess.forEach((file) => {
        if (!file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result
          setPendingImages((prev) => [...prev, base64])
        }
        reader.readAsDataURL(file)
      })

      event.target.value = ''
    },
    [pendingImages.length]
  )

  const updateQuantity = useCallback((index, quantity) => {
    setProducts((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        estoque: quantity,
        quantity,
        estoqueIgual:
          updated[index].estoqueSistema == null
            ? null
            : Number(updated[index].estoqueSistema) === Number(quantity)
      }
      return updated
    })
  }, [])

  const removeProduct = useCallback((index) => {
    setProducts((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }, [])

  const handleDownload = useCallback(() => {
    if (products.length === 0) return

    const date = new Date().toISOString().split('T')[0]
    downloadExcel(products, `estoque_${date}.xlsx`)
  }, [products])

  const clearProducts = useCallback(() => {
    setProducts([])
    setClearConfirmOpen(false)
  }, [])

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={addImage}
        onClose={() => setShowCamera(false)}
        capturedCount={pendingImages.length}
        maxImages={MAX_IMAGES}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 sm:gap-6 sm:pb-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-5">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl">
            <Camera className="h-7 w-7 text-primary" />
            Contagem de Estoque
          </h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => setShowCamera(true)}
            className="w-full sm:w-auto"
            disabled={isAnalyzing}
          >
            <Camera className="mr-2 h-4 w-4" />
            Abrir Camera
          </Button>

          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isAnalyzing}
            />

            <Button
              variant="outline"
              asChild
              disabled={isAnalyzing}
              className="w-full sm:w-auto"
            >
              <span>
                <ImagePlus className="mr-2 h-4 w-4" />
                Adicionar Fotos
              </span>
            </Button>
          </label>

          <div className="rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
            Até {MAX_IMAGES} fotos
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-destructive hover:bg-destructive/20"
              onClick={() => setError(null)}
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {isAnalyzing && (
        <Card className="border-primary/50 bg-primary/10">
          <CardContent className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">
              Analisando {pendingImages.length} foto{pendingImages.length !== 1 ? 's' : ''} com IA...
            </span>
          </CardContent>
        </Card>
      )}

      <ImageGallery
        images={pendingImages}
        onRemove={removeImage}
        analyzingIndex={analyzingIndex}
      />

      {pendingImages.length > 0 && !isAnalyzing && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Button
            onClick={analyzeAllImages}
            className="w-full bg-secondary hover:bg-secondary/90"
            size="lg"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Analisar {pendingImages.length} foto{pendingImages.length !== 1 ? 's' : ''}
          </Button>

          <Button
            onClick={clearImages}
            variant="outline"
            size="lg"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      )}

      <ProductList
        products={products}
        onUpdateQuantity={updateQuantity}
        onRemove={removeProduct}
        onDownload={handleDownload}
        onClear={() => setClearConfirmOpen(true)}
      />

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar produtos contados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove todos os produtos da contagem atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={clearProducts}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
