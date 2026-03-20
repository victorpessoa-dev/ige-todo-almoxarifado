'use client'

import { useState } from 'react'
import { useData } from '@/contexts/data-context'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, Calendar } from 'lucide-react'

// Funcao para agrupar itens por data
function groupByDate(items) {
  const groups = {}

  items.forEach(item => {
    const date = new Date(item.created_at) // ✅ corrigido
    const dateKey = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(item)
  })

  const sortedGroups = Object.entries(groups)
    .sort((a, b) => {
      const dateA = new Date(a[1][0].created_at)
      const dateB = new Date(b[1][0].created_at)
      return dateB - dateA
    })
    .map(([dateKey, items]) => [dateKey, sortByPriority(items)])

  return sortedGroups
}

export default function TarefasPage() {
  const { tarefas, addTarefa, updateTarefa, deleteTarefa, isLoaded } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [editingTarefa, setEditingTarefa] = useState(null)
  const [showConcluidos, setShowConcluidos] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    responsavel: '',
    status: 'a_fazer',
    prioridade: 'medio'
  })

  const tarefasPendentes = tarefas.filter(t => t.status !== 'concluido')
  const tarefasConcluidas = tarefas.filter(t => t.status === 'concluido')

  const tarefasPendentesGrouped = groupByDate(tarefasPendentes)
  const tarefasConcluidasGrouped = groupByDate(tarefasConcluidas)

  const resetForm = () => {
    setForm({ titulo: '', descricao: '', responsavel: '', status: 'a_fazer', prioridade: 'medio' })
    setEditingTarefa(null)
  }

  const handleOpenChange = (open) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleEdit = (tarefa) => {
    setEditingTarefa(tarefa)
    setForm({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      responsavel: tarefa.responsavel,
      status: tarefa.status,
      prioridade: tarefa.prioridade || 'medio'
    })
    setIsOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error('O titulo e obrigatorio!')
      return
    }

    if (editingTarefa) {
      updateTarefa(editingTarefa.id, form)
      toast.success('Tarefa atualizada com sucesso!')
    } else {
      addTarefa(form)
      toast.success('Tarefa criada com sucesso!')
    }
    handleOpenChange(false)
  }

  const handleDelete = (id) => {
    deleteTarefa(id)
    toast.success('Tarefa removida!')
  }

  const handleStatusChange = (id, newStatus) => {
    updateTarefa(id, { status: newStatus })
    if (newStatus === 'concluido') {
      toast.success('Tarefa concluida!')
    } else {
      toast.success('Status atualizado!')
    }
  }

  const handleConcluir = (id) => {
    updateTarefa(id, { status: 'concluido' })
    toast.success('Tarefa concluida!')
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'concluido': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'em_andamento': return <Clock className="h-4 w-4 text-blue-600" />
      default: return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusInfo = (status) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  }

  const getPrioridadeInfo = (prioridade) => {
    return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[2]
  }

  if (!isLoaded) {
    return <div className="animate-pulse">Carregando...</div>
  }

  const TarefaCard = ({ tarefa, isConcluido = false }) => {
    const prioridadeInfo = getPrioridadeInfo(tarefa.prioridade)
    const statusInfo = getStatusInfo(tarefa.status)

    return (
      <Card className={`transition-all ${isConcluido ? 'opacity-70 bg-muted/30' : `hover:shadow-lg ${prioridadeInfo.shadow}`}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => isConcluido ? handleStatusChange(tarefa.id, 'a_fazer') : handleConcluir(tarefa.id)}
                className="mt-1 hover:scale-110 transition-transform"
                title={isConcluido ? 'Reabrir tarefa' : 'Marcar como concluida'}
              >
                {getStatusIcon(tarefa.status)}
              </button>
              <div className="flex-1">
                <h3 className={`font-semibold text-foreground ${isConcluido ? 'line-through text-muted-foreground' : ''}`}>
                  {tarefa.titulo}
                </h3>
                {tarefa.descricao && (
                  <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge className={prioridadeInfo.color}>
                    {prioridadeInfo.label}
                  </Badge>
                  {!isConcluido && (
                    <Badge variant="outline" className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  )}
                  {tarefa.responsavel && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Para: {tarefa.responsavel}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isConcluido && (
                <Select
                  value={tarefa.status}
                  onValueChange={(value) => handleStatusChange(tarefa.id, value)}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(tarefa)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(tarefa.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const DateGroup = ({ dateLabel, items, isConcluido = false }) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="font-medium capitalize">{dateLabel}</span>
      </div>
      <div className="flex flex-col gap-3 pl-6 border-l-2 border-muted">
        {items.map((tarefa) => (
          <TarefaCard key={tarefa.id} tarefa={tarefa} isConcluido={isConcluido} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Titulo</label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Digite o titulo da tarefa"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Descricao</label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Digite a descricao"
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Responsavel</label>
                <Input
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  placeholder="Para quem e essa tarefa?"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select value={form.prioridade} onValueChange={(value) => setForm({ ...form, prioridade: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="mt-2">
                {editingTarefa ? 'Salvar Alteracoes' : 'Criar Tarefa'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Circle className="h-5 w-5" />
          Pendentes ({tarefasPendentes.length})
        </h2>
        {tarefasPendentesGrouped.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhuma tarefa pendente</p>
              <p className="text-sm text-muted-foreground">Clique em "Nova Tarefa" para comecar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {tarefasPendentesGrouped.map(([dateLabel, items]) => (
              <DateGroup key={dateLabel} dateLabel={dateLabel} items={items} />
            ))}
          </div>
        )}
      </div>

      {tarefasConcluidas.length > 0 && (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowConcluidos(!showConcluidos)}
            className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors w-fit"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Concluidos ({tarefasConcluidas.length})
            {showConcluidos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showConcluidos && (
            <div className="flex flex-col gap-6">
              {tarefasConcluidasGrouped.map(([dateLabel, items]) => (
                <DateGroup key={dateLabel} dateLabel={dateLabel} items={items} isConcluido />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
