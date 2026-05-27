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
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, StickyNote, Calendar } from 'lucide-react'
import EventForm from '@/components/events/EventForm'
import { getUserMessage } from '@/lib/user-messages'

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

    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(item)
  })

  return Object.entries(groups)
    .sort((a, b) => new Date(b[1][0].created_at) - new Date(a[1][0].created_at))
    .map(([dateKey, items]) => [dateKey, sortByPriority(items)])
}

function formatDateLabel(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString('pt-BR')
}

export default function LembretesPage() {
  const { lembretes, addLembrete, updateLembrete, deleteLembrete, isLoaded } = useData()

  const [isOpen, setIsOpen] = useState(false)
  const [editingLembrete, setEditingLembrete] = useState(null)
  const [showConcluidos, setShowConcluidos] = useState(false)

  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    destinatario: '',
    data: null,
    status: 'a_fazer',
    prioridade: 'medio',
    type: 'lembrete'
  })

  const lembretesPendentes = lembretes.filter(l => l.status !== 'concluido')
  const lembretesConcluidos = lembretes.filter(l => l.status === 'concluido')

  const resetForm = () => {
    setForm({
      titulo: '',
      conteudo: '',
      destinatario: '',
      data: null,
      status: 'a_fazer',
      prioridade: 'medio',
      type: 'lembrete'
    })
    setEditingLembrete(null)
  }

  const handleOpenChange = (open) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) return toast.error('O titulo é obrigatório!')

    try {
      if (editingLembrete) {
        await updateLembrete(editingLembrete.id, form)
        toast.success('Lembrete atualizado com sucesso!')
      } else {
        await addLembrete(form)
        toast.success('Lembrete criado com sucesso!')
      }
      handleOpenChange(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel salvar o lembrete.'))
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteLembrete(id)
      toast.success('Lembrete removido com sucesso!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel remover o lembrete.'))
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateLembrete(id, { status })
      toast.success('Status atualizado!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel atualizar o status.'))
    }
  }

  const handleConcluir = async (id) => {
    try {
      await updateLembrete(id, { status: 'concluido' })
      toast.success('Lembrete concluído!')
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel concluir o lembrete.'))
    }
  }

  const handleEdit = (lembrete) => {
    setEditingLembrete(lembrete)
    setForm({
      titulo: lembrete.titulo || '',
      conteudo: lembrete.conteudo || '',
      destinatario: lembrete.destinatario || '',
      data: lembrete.data ? new Date(lembrete.data) : null,
      status: lembrete.status,
      prioridade: lembrete.prioridade || 'medio'
    })
    setIsOpen(true)
  }

  if (!isLoaded) return <LoadingState className="min-h-[60vh]" />

  const LembreteCard = ({ lembrete, isConcluido }) => {
    const prioridadeInfo = PRIORIDADE_OPTIONS.find(p => p.value === lembrete.prioridade) || PRIORIDADE_OPTIONS[2]
    const statusInfo = STATUS_OPTIONS.find(s => s.value === lembrete.status) || STATUS_OPTIONS[0]

    return (
      <Card className={`transition-all ${isConcluido ? 'opacity-70 bg-muted/30' : `hover:shadow-lg ${prioridadeInfo.shadow}`}`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">

            <div className="flex gap-3 flex-1">
              <button
                onClick={() =>
                  isConcluido
                    ? handleStatusChange(lembrete.id, 'a_fazer')
                    : handleConcluir(lembrete.id)
                }
                className="mt-1 hover:scale-110 transition-transform"
              >
                {lembrete.status === 'concluido'
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : lembrete.status === 'em_andamento'
                    ? <Clock className="h-4 w-4 text-blue-600" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
              </button>

              <div className="flex-1">
                <h3 className={`font-semibold text-sm sm:text-base break-words ${isConcluido ? 'line-through text-muted-foreground' : ''}`}>
                  {lembrete.titulo}
                </h3>

                {lembrete.conteudo && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    {lembrete.conteudo}
                  </p>
                )}

                {lembrete.data && (
                  <div className="flex items-center gap-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDateLabel(lembrete.data)}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  <Badge className={prioridadeInfo.color}>{prioridadeInfo.label}</Badge>
                  {!isConcluido && (
                    <Badge variant="outline" className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">

              {!isConcluido && (
                <Select value={lembrete.status} onValueChange={(v) => handleStatusChange(lembrete.id, v)}>
                  <SelectTrigger className="w-full sm:w-[130px] h-9 sm:h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-8 sm:w-8"
                  onClick={() => handleEdit(lembrete)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-8 sm:w-8"
                  onClick={() => handleDelete(lembrete.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    )
  }

  const DateGroup = ({ dateLabel, items, isConcluido }) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="capitalize">{dateLabel}</span>
      </div>

      <div className="flex flex-col gap-3 pl-4 sm:pl-6 border-l-2 border-muted">
        {items.map(l => (
          <LembreteCard key={l.id} lembrete={l} isConcluido={isConcluido} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Lembretes</h1>

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLembrete ? 'Editar' : 'Novo Lembrete'}</DialogTitle>
            </DialogHeader>

            <EventForm
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              typeLocked="lembrete"
              isEditing={!!editingLembrete}
              onDelete={() => {
                if (editingLembrete) {
                  handleDelete(editingLembrete.id)
                  handleOpenChange(false)
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:gap-6 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto pr-2 pb-6">

        {groupByDate(lembretesPendentes).map(([date, items]) => (
          <DateGroup key={date} dateLabel={date} items={items} />
        ))}

        {lembretesConcluidos.length > 0 && (
          <div>
            <button onClick={() => setShowConcluidos(!showConcluidos)} className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Concluídos ({lembretesConcluidos.length})
              {showConcluidos ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showConcluidos && groupByDate(lembretesConcluidos).map(([date, items]) => (
              <DateGroup key={date} dateLabel={date} items={items} isConcluido />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
