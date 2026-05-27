'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { getUserMessage } from '@/lib/user-messages'

const defaultSolicitante = {
  nome: '',
  centro_custo_id: '',
  ativo: true
}

const defaultCentroCusto = {
  nome: '',
  codigo: '',
  ativo: true
}

function Field({ label, children }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function AtivoField({ checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-sm font-medium">Ativo</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function getCentroCustoLabel(centrosCusto = [], centroCustoId) {
  const centroCusto = centrosCusto.find((item) => item.id === centroCustoId)
  if (!centroCusto) return ''

  return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')
}

export function SolicitacaoCadastrosDialog({
  open,
  onOpenChange,
  solicitantes,
  centrosCusto,
  onAddSolicitante,
  onUpdateSolicitante,
  onDeleteSolicitante,
  onAddCentroCusto,
  onUpdateCentroCusto,
  onDeleteCentroCusto
}) {
  const [solicitanteForm, setSolicitanteForm] = useState(defaultSolicitante)
  const [centroCustoForm, setCentroCustoForm] = useState(defaultCentroCusto)
  const [editingSolicitante, setEditingSolicitante] = useState(null)
  const [editingCentroCusto, setEditingCentroCusto] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const resetSolicitante = () => {
    setSolicitanteForm(defaultSolicitante)
    setEditingSolicitante(null)
  }

  const resetCentroCusto = () => {
    setCentroCustoForm(defaultCentroCusto)
    setEditingCentroCusto(null)
  }

  const submitSolicitante = async (event) => {
    event.preventDefault()

    if (!solicitanteForm.centro_custo_id) {
      toast.error('Selecione o centro de custo do solicitante.')
      return
    }

    try {
      if (editingSolicitante) {
        await onUpdateSolicitante(editingSolicitante.id, solicitanteForm)
        toast.success('Solicitante atualizado!')
      } else {
        await onAddSolicitante(solicitanteForm)
        toast.success('Solicitante cadastrado!')
      }
      resetSolicitante()
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel salvar o solicitante.'))
    }
  }

  const submitCentroCusto = async (event) => {
    event.preventDefault()

    try {
      if (editingCentroCusto) {
        await onUpdateCentroCusto(editingCentroCusto.id, centroCustoForm)
        toast.success('Centro de custo atualizado!')
      } else {
        await onAddCentroCusto(centroCustoForm)
        toast.success('Centro de custo cadastrado!')
      }
      resetCentroCusto()
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel salvar o centro de custo.'))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { type, item } = deleteTarget

    try {
      if (type === 'solicitante') {
        await onDeleteSolicitante(item.id)
        toast.success('Solicitante excluido!')
      } else {
        await onDeleteCentroCusto(item.id)
        toast.success('Centro de custo excluido!')
      }
      setDeleteTarget(null)
    } catch (error) {
      toast.error(
        getUserMessage(
          error,
          type === 'solicitante'
            ? 'Nao foi possivel excluir o solicitante.'
            : 'Nao foi possivel excluir o centro de custo.'
        )
      )
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[95vw] overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Cadastros de solicitacao</DialogTitle>
          </DialogHeader>

        <Tabs defaultValue="solicitantes">
          <TabsList>
            <TabsTrigger value="solicitantes">Solicitantes</TabsTrigger>
            <TabsTrigger value="centros">Centros de custo</TabsTrigger>
          </TabsList>

          <TabsContent value="solicitantes" className="mt-4 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <form onSubmit={submitSolicitante} className="grid gap-3 rounded-xl border bg-card p-4">
              <Field label="Nome">
                <Input
                  value={solicitanteForm.nome}
                  onChange={(event) => setSolicitanteForm((prev) => ({ ...prev, nome: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Centro de custo">
                <Select
                  value={solicitanteForm.centro_custo_id || ''}
                  onValueChange={(value) => setSolicitanteForm((prev) => ({ ...prev, centro_custo_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map((centroCusto) => (
                      <SelectItem key={centroCusto.id} value={centroCusto.id}>
                        {[centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <AtivoField
                checked={solicitanteForm.ativo}
                onChange={(value) => setSolicitanteForm((prev) => ({ ...prev, ativo: value }))}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4" />
                  {editingSolicitante ? 'Salvar' : 'Cadastrar'}
                </Button>
                {editingSolicitante && (
                  <Button type="button" variant="outline" onClick={resetSolicitante}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>

            <div className="grid gap-2">
              {solicitantes.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCentroCustoLabel(centrosCusto, item.centro_custo_id) || 'Sem centro de custo'}
                      {!item.ativo ? ' | Inativo' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingSolicitante(item)
                        setSolicitanteForm({
                          nome: item.nome || '',
                          centro_custo_id: item.centro_custo_id || '',
                          ativo: item.ativo ?? true
                        })
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget({ type: 'solicitante', item })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="centros" className="mt-4 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <form onSubmit={submitCentroCusto} className="grid gap-3 rounded-xl border bg-card p-4">
              <Field label="Nome">
                <Input
                  value={centroCustoForm.nome}
                  onChange={(event) => setCentroCustoForm((prev) => ({ ...prev, nome: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Codigo">
                <Input
                  value={centroCustoForm.codigo}
                  onChange={(event) => setCentroCustoForm((prev) => ({ ...prev, codigo: event.target.value }))}
                />
              </Field>
              <AtivoField
                checked={centroCustoForm.ativo}
                onChange={(value) => setCentroCustoForm((prev) => ({ ...prev, ativo: value }))}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4" />
                  {editingCentroCusto ? 'Salvar' : 'Cadastrar'}
                </Button>
                {editingCentroCusto && (
                  <Button type="button" variant="outline" onClick={resetCentroCusto}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>

            <div className="grid gap-2">
              {centrosCusto.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {[item.codigo, item.nome].filter(Boolean).join(' - ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingCentroCusto(item)
                        setCentroCustoForm({
                          nome: item.nome || '',
                          codigo: item.codigo || '',
                          ativo: item.ativo ?? true
                        })
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget({ type: 'centro', item })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {deleteTarget?.item?.nome || 'cadastro'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove o cadastro selecionado e nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
