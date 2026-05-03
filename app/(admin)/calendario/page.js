'use client'

import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { getUserMessage } from '@/lib/user-messages'

import { useData } from '@/contexts/data-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EventForm from '@/components/events/EventForm'

const defaultForm = {
  type: 'tarefa',
  titulo: '',
  descricao: '',
  conteudo: '',
  responsavel: '',
  destinatario: '',
  data: '',
  status: 'a_fazer',
  prioridade: 'medio'
}

function formatDateForInput(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const {
    tarefas,
    lembretes,
    addTarefa,
    addLembrete,
    updateTarefa,
    updateLembrete,
    deleteTarefa,
    deleteLembrete
  } = useData()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [form, setForm] = useState(defaultForm)

  const events = useMemo(() => {
    const tarefaEvents = tarefas
      .filter((tarefa) => tarefa.status !== 'concluido')
      .map((tarefa) => ({
      id: `tarefa-${tarefa.id}`,
      title: tarefa.titulo || 'Tarefa sem titulo',
      start: tarefa.data || null,
      backgroundColor: '#028358',
      borderColor: '#028358',
      textColor: '#ffffff',
      extendedProps: {
        type: 'tarefa',
        originalId: tarefa.id
      }
      }))

    const lembreteEvents = lembretes
      .filter((lembrete) => lembrete.status !== 'concluido')
      .map((lembrete) => ({
      id: `lembrete-${lembrete.id}`,
      title: lembrete.titulo || 'Lembrete sem titulo',
      start: lembrete.data || null,
      backgroundColor: '#6442b1',
      borderColor: '#6442b1',
      textColor: '#ffffff',
      extendedProps: {
        type: 'lembrete',
        originalId: lembrete.id
      }
      }))

    return [...tarefaEvents, ...lembreteEvents].filter((event) => !!event.start)
  }, [tarefas, lembretes])

  const openNewEventDialog = (dateStr = formatDateForInput(new Date())) => {
    setSelectedEvent(null)
    setForm({ ...defaultForm, data: dateStr })
    setDialogOpen(true)
  }

  const openEditEventDialog = (event) => {
    const { type, originalId } = event.extendedProps
    const item =
      type === 'tarefa'
        ? tarefas.find((tarefa) => tarefa.id === originalId)
        : lembretes.find((lembrete) => lembrete.id === originalId)

    if (!item) return

    setSelectedEvent({ type, id: originalId })
    setForm({
      type,
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      conteudo: item.conteudo || '',
      responsavel: item.responsavel || '',
      destinatario: item.destinatario || '',
      data: formatDateForInput(item.data),
      status: item.status || 'a_fazer',
      prioridade: item.prioridade || 'medio'
    })
    setDialogOpen(true)
  }

  const handleDateClick = (arg) => {
    openNewEventDialog(arg.dateStr)
  }

  const handleEventClick = (arg) => {
    openEditEventDialog(arg.event)
  }

  const resetForm = () => {
    setSelectedEvent(null)
    setForm(defaultForm)
  }

  const handleOpenChange = (open) => {
    setDialogOpen(open)
    if (!open) resetForm()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      titulo: form.titulo.trim(),
      data: form.data || null,
      status: form.status,
      prioridade: form.prioridade
    }

    if (form.type === 'tarefa') {
      payload.descricao = form.descricao
      payload.responsavel = form.responsavel
    } else {
      payload.conteudo = form.conteudo
      payload.destinatario = form.destinatario
    }

    try {
      if (selectedEvent) {
        if (selectedEvent.type === 'tarefa') {
          await updateTarefa(selectedEvent.id, payload)
          toast.success('Tarefa atualizada com sucesso!')
        } else {
          await updateLembrete(selectedEvent.id, payload)
          toast.success('Lembrete atualizado com sucesso!')
        }
      } else if (form.type === 'tarefa') {
        await addTarefa(payload)
        toast.success('Tarefa criada com sucesso!')
      } else {
        await addLembrete(payload)
        toast.success('Lembrete criado com sucesso!')
      }

      setDialogOpen(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel salvar o evento.'))
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return

    try {
      if (selectedEvent.type === 'tarefa') {
        await deleteTarefa(selectedEvent.id)
        toast.success('Tarefa removida com sucesso!')
      } else {
        await deleteLembrete(selectedEvent.id)
        toast.success('Lembrete removido com sucesso!')
      }

      setDialogOpen(false)
    } catch (error) {
      toast.error(getUserMessage(error, 'Nao foi possivel excluir o evento.'))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="rounded-2xl border bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Calendario</h1>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="h-full min-h-[640px] rounded-xl border bg-background p-2 sm:p-4">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'today'
            }}
            buttonText={{
              today: 'Hoje'
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="100%"
          />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Editar evento' : 'Criar evento'}</DialogTitle>
          </DialogHeader>

          <EventForm
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            typeLocked={null}
            isEditing={!!selectedEvent}
            onDelete={handleDelete}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
