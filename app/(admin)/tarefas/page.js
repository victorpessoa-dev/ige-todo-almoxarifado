'use client'

import { useState } from 'react'
import { useData } from '@/contexts/data-context'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS, sortByPriority } from '@/constants/task-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingState } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, Calendar, ListTodo } from 'lucide-react'
import EventForm from '@/components/events/EventForm'
import { getUserMessage } from '@/lib/user-messages'
import { formatDateBR, toDateInputValue } from '@/lib/date-utils'

function groupByDate(items) {
  const groups = {}

  items.forEach(item => {
    const date = new Date(item.created_at)
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

function formatDateLabel(value) {
  return formatDateBR(value, '')
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
    data: null,
    status: 'a_fazer',
    prioridade: 'medio',
    type: 'tarefa'
  })

  const tarefasPendentes = tarefas.filter(t => t.status !== 'concluido')
  const tarefasConcluidas = tarefas.filter(t => t.status === 'concluido')

  const tarefasPendentesGrouped = groupByDate(tarefasPendentes)
  const tarefasConcluidasGrouped = groupByDate(tarefasConcluidas)

  const resetForm = () => {
    setForm({
      titulo: '',
      descricao: '',
      responsavel: '',
      data: null,
      status: 'a_fazer',
      prioridade: 'medio',
      type: 'tarefa'
    })
    setEditingTarefa(null)
  }

  const handleOpenChange = (open) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleEdit = (tarefa) => {
    setEditingTarefa(tarefa)
    setForm({
      titulo: tarefa.titulo || '',
      descricao: tarefa.descricao || '',
      data: toDateInputValue(tarefa.data) || toDateInputValue(new Date()),
      responsavel: tarefa.responsavel || '',
      status: tarefa.status,
      prioridade: tarefa.prioridade || 'medio'
    })
    setIsOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error('O titulo e obrigatorio!')
      return
    }

    try {
      if (editingTarefa) {
        await updateTarefa(editingTarefa.id, form)
        toast.success('Tarefa atualizada com sucesso!')
      } else {
        await addTarefa(form)
        toast.success('Tarefa criada com sucesso!')
      }
      handleOpenChange(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível salvar a tarefa.'))
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTarefa(id)
      toast.success('Tarefa removida com sucesso!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível remover a tarefa.'))
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateTarefa(id, { status: newStatus })
      if (newStatus === 'concluido') {
        toast.success('Tarefa concluida!')
      } else {
        toast.success('Status atualizado!')
      }
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível atualizar o status.'))
    }
  }

  const handleConcluir = async (id) => {
    try {
      await updateTarefa(id, { status: 'concluido' })
      toast.success('Tarefa concluida!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível concluir a tarefa.'))
    }
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
    return <LoadingState className="min-h-[60vh]" />
  }

  const TarefaCard = ({ tarefa, isConcluido = false }) => {
    const prioridadeInfo = getPrioridadeInfo(tarefa.prioridade)
    const statusInfo = getStatusInfo(tarefa.status)

    return (
      <Card
        className={`transition-all ${isConcluido
          ? 'opacity-70 bg-muted/30'
          : `hover:shadow-lg ${prioridadeInfo.shadow}`
          }`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">

            <div className="flex items-start gap-3 flex-1 w-full">
              <button
                onClick={() =>
                  isConcluido
                    ? handleStatusChange(tarefa.id, 'a_fazer')
                    : handleConcluir(tarefa.id)
                }
                className="mt-1 hover:scale-110 transition-transform"
                title={
                  isConcluido
                    ? 'Reabrir tarefa'
                    : 'Marcar como concluida'
                }
              >
                {getStatusIcon(tarefa.status)}
              </button>

              <div className="flex-1">
                <h3
                  className={`font-semibold text-foreground break-words ${isConcluido
                    ? 'line-through text-muted-foreground'
                    : ''
                    }`}
                >
                  {tarefa.titulo}
                </h3>

                {tarefa.descricao && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                    {tarefa.descricao}
                  </p>
                )}

                {tarefa.data && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateLabel(tarefa.data)}</span>
                  </div>
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
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded break-words">
                      Para: {tarefa.responsavel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
              {!isConcluido && (
                <Select
                  value={tarefa.status}
                  onValueChange={(value) =>
                    handleStatusChange(tarefa.id, value)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs">
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

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(tarefa)}
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(tarefa.id)}
              >
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
      <div className={`flex flex-col gap-3 pl-6 border-l-2 ${isConcluido ? 'border-muted/50' : 'border-muted'} ${!isConcluido ? 'outline-' : ''}`}>
        {items.map((tarefa) => (
          <TarefaCard key={tarefa.id} tarefa={tarefa} isConcluido={isConcluido} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 sm:gap-6 sm:pb-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl">
            <ListTodo className="h-7 w-7 text-primary" />
            Tarefas
          </h1>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
            </DialogHeader>
            <EventForm
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              typeLocked="tarefa"
              isEditing={!!editingTarefa}
              onDelete={() => {
                if (editingTarefa) {
                  handleDelete(editingTarefa.id)
                  handleOpenChange(false)
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pb-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Circle className="h-5 w-5" />
            Pendentes ({tarefasPendentes.length})
          </h2>
          {tarefasPendentesGrouped.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">Nenhuma tarefa pendente</p>
                <p className="text-sm text-muted-foreground">Clique em &quot;Nova Tarefa&quot; para começar</p>
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
    </div>
  )
}
