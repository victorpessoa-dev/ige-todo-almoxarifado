'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2, UserRound, WalletCards } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { getUserMessage } from '@/lib/messaging/user-messages'

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

/**
 * Dialog de manutencao de solicitantes e centros de custo.
 *
 * Esses cadastros alimentam a tela publica de solicitacao; por isso a flag
 * "ativo" controla disponibilidade sem apagar historico ja usado.
 */

function Field({ label, children }) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="truncate text-sm font-medium" title={label}>{label}</label>
      {children}
    </div>
  )
}

function AtivoField({ checked, onChange }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">Cadastro ativo</p>
        <p className="text-xs text-muted-foreground">
          Itens ativos aparecem nas listas públicas.
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function StatusBadge({ active }) {
  return (
    <Badge
      variant={active ? 'secondary' : 'outline'}
      className={active ? 'bg-emerald-500/15 text-emerald-200' : 'text-muted-foreground'}
    >
      {active ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}

function EmptyRows({ colSpan, label }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  )
}

function EmptyCardList({ label }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {label}
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
  const [activeTab, setActiveTab] = useState('solicitantes')
  const [solicitanteForm, setSolicitanteForm] = useState(defaultSolicitante)
  const [centroCustoForm, setCentroCustoForm] = useState(defaultCentroCusto)
  const [editingSolicitante, setEditingSolicitante] = useState(null)
  const [editingCentroCusto, setEditingCentroCusto] = useState(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const resetSolicitante = () => {
    setSolicitanteForm(defaultSolicitante)
    setEditingSolicitante(null)
  }

  const resetCentroCusto = () => {
    setCentroCustoForm(defaultCentroCusto)
    setEditingCentroCusto(null)
  }

  const closeFormDialog = () => {
    setFormDialogOpen(false)
    resetSolicitante()
    resetCentroCusto()
  }

  const openNewSolicitante = () => {
    resetSolicitante()
    setActiveTab('solicitantes')
    setFormDialogOpen(true)
  }

  const openEditSolicitante = (item) => {
    setEditingSolicitante(item)
    setSolicitanteForm({
      nome: item.nome || '',
      centro_custo_id: item.centro_custo_id || '',
      ativo: item.ativo ?? true
    })
    setActiveTab('solicitantes')
    setFormDialogOpen(true)
  }

  const openNewCentroCusto = () => {
    resetCentroCusto()
    setActiveTab('centros')
    setFormDialogOpen(true)
  }

  const openEditCentroCusto = (item) => {
    setEditingCentroCusto(item)
    setCentroCustoForm({
      nome: item.nome || '',
      codigo: item.codigo || '',
      ativo: item.ativo ?? true
    })
    setActiveTab('centros')
    setFormDialogOpen(true)
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
      closeFormDialog()
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível salvar o solicitante.'))
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
      closeFormDialog()
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível salvar o centro de custo.'))
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
            ? 'Não foi possível excluir o solicitante.'
            : 'Não foi possível excluir o centro de custo.'
        )
      )
    }
  }

  const isSolicitanteMode = activeTab === 'solicitantes'
  const formTitle = isSolicitanteMode
    ? editingSolicitante
      ? 'Editar solicitante'
      : 'Novo solicitante'
    : editingCentroCusto
      ? 'Editar centro de custo'
      : 'Novo centro de custo'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="ige-scrollbar h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:w-[95vw] sm:max-w-5xl sm:rounded-lg sm:p-6">
          <DialogHeader>
            <DialogTitle>Cadastros de solicitação</DialogTitle>
            <DialogDescription>
              Gerencie os solicitantes e centros de custo usados no formulário público.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="solicitantes">
                <UserRound className="h-4 w-4" />
                Solicitantes
              </TabsTrigger>
              <TabsTrigger value="centros">
                <WalletCards className="h-4 w-4" />
                Centros de custo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="solicitantes" className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="truncate text-sm font-semibold" title="Solicitantes cadastrados">Solicitantes cadastrados</p>
                  <p className="text-xs text-muted-foreground">
                    {solicitantes.length} registro{solicitantes.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button type="button" className="w-full sm:w-auto" onClick={openNewSolicitante}>
                  <Plus className="h-4 w-4" />
                  Novo solicitante
                </Button>
              </div>

              <div className="grid gap-3 md:hidden">
                {solicitantes.length === 0 ? (
                  <EmptyCardList label="Nenhum solicitante cadastrado." />
                ) : (
                  solicitantes.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={item.nome || '-'}>{item.nome}</p>
                          <p
                            className="mt-1 truncate text-xs text-muted-foreground"
                            title={getCentroCustoLabel(centrosCusto, item.centro_custo_id) || '-'}
                          >
                            {getCentroCustoLabel(centrosCusto, item.centro_custo_id) || '-'}
                          </p>
                        </div>
                        <StatusBadge active={item.ativo} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditSolicitante(item)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: 'solicitante', item })}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden overflow-hidden rounded-lg border md:block">
                <div className="ige-scrollbar inventory-table-scroll overflow-x-auto">
                  <Table className="min-w-[720px] table-fixed">
                    <colgroup>
                      <col className="w-[36%]" />
                      <col className="w-[38%]" />
                      <col className="w-[100px]" />
                      <col className="w-[96px]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Nome</TableHead>
                        <TableHead>Centro de custo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitantes.length === 0 ? (
                        <EmptyRows colSpan={4} label="Nenhum solicitante cadastrado." />
                      ) : (
                        solicitantes.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              <p className="truncate" title={item.nome || '-'}>
                                {item.nome || '-'}
                              </p>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <p className="truncate" title={getCentroCustoLabel(centrosCusto, item.centro_custo_id) || '-'}>
                                {getCentroCustoLabel(centrosCusto, item.centro_custo_id) || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusBadge active={item.ativo} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditSolicitante(item)}
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
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="centros" className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="truncate text-sm font-semibold" title="Centros de custo cadastrados">Centros de custo cadastrados</p>
                  <p className="text-xs text-muted-foreground">
                    {centrosCusto.length} registro{centrosCusto.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button type="button" className="w-full sm:w-auto" onClick={openNewCentroCusto}>
                  <Plus className="h-4 w-4" />
                  Novo centro
                </Button>
              </div>

              <div className="grid gap-3 md:hidden">
                {centrosCusto.length === 0 ? (
                  <EmptyCardList label="Nenhum centro de custo cadastrado." />
                ) : (
                  centrosCusto.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium tabular-nums" title={item.codigo || '-'}>
                            {item.codigo || '-'}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground" title={item.nome || '-'}>
                            {item.nome}
                          </p>
                        </div>
                        <StatusBadge active={item.ativo} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditCentroCusto(item)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: 'centro', item })}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden overflow-hidden rounded-lg border md:block">
                <div className="ige-scrollbar inventory-table-scroll overflow-x-auto">
                  <Table className="min-w-[640px] table-fixed">
                    <colgroup>
                      <col className="w-[160px]" />
                      <col />
                      <col className="w-[100px]" />
                      <col className="w-[96px]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {centrosCusto.length === 0 ? (
                        <EmptyRows colSpan={4} label="Nenhum centro de custo cadastrado." />
                      ) : (
                        centrosCusto.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium tabular-nums">
                              <p className="truncate" title={item.codigo || '-'}>
                                {item.codigo || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="truncate" title={item.nome || '-'}>
                                {item.nome || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <StatusBadge active={item.ativo} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditCentroCusto(item)}
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
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={formDialogOpen} onOpenChange={(nextOpen) => {
        if (!nextOpen) closeFormDialog()
        else setFormDialogOpen(true)
      }}>
        <DialogContent className="w-[95vw] p-4 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle>{formTitle}</DialogTitle>
            <DialogDescription>
              {isSolicitanteMode
                ? 'Informe o nome e o centro de custo padrao do solicitante.'
                : 'Informe o nome, código e status do centro de custo.'}
            </DialogDescription>
          </DialogHeader>

          {isSolicitanteMode ? (
            <form onSubmit={submitSolicitante} className="grid gap-4">
              <Field label="Nome">
                <Input
                  className="min-w-0"
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
                  <SelectTrigger className="w-full min-w-0 overflow-hidden">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {centrosCusto.map((centroCusto) => (
                      <SelectItem key={centroCusto.id} value={centroCusto.id}>
                        <span
                          className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                          title={[centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')}
                        >
                          {[centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <AtivoField
                checked={solicitanteForm.ativo}
                onChange={(value) => setSolicitanteForm((prev) => ({ ...prev, ativo: value }))}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeFormDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSolicitante ? 'Salvar alterações' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={submitCentroCusto} className="grid gap-4">
              <Field label="Nome">
                <Input
                  className="min-w-0"
                  value={centroCustoForm.nome}
                  onChange={(event) => setCentroCustoForm((prev) => ({ ...prev, nome: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Código">
                <Input
                  className="min-w-0 truncate"
                  value={centroCustoForm.codigo}
                  onChange={(event) => setCentroCustoForm((prev) => ({ ...prev, codigo: event.target.value }))}
                />
              </Field>
              <AtivoField
                checked={centroCustoForm.ativo}
                onChange={(value) => setCentroCustoForm((prev) => ({ ...prev, ativo: value }))}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeFormDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCentroCusto ? 'Salvar alterações' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          )}
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
              Esta ação remove o cadastro selecionado e não pode ser desfeita.
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
