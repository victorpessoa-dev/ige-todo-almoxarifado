'use client'

import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { useData } from '@/contexts/data-context'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS } from '@/constants/task-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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
        const tarefaEvents = tarefas.map((tarefa) => ({
            id: `tarefa-${tarefa.id}`,
            title: tarefa.titulo || 'Tarefa sem título',
            start: tarefa.data || null,
            extendedProps: {
                type: 'tarefa',
                originalId: tarefa.id
            }
        }))

        const lembreteEvents = lembretes.map((lembrete) => ({
            id: `lembrete-${lembrete.id}`,
            title: lembrete.titulo || 'Lembrete sem título',
            start: lembrete.data || null,
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
        const item = type === 'tarefa'
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

        if (selectedEvent) {
            if (selectedEvent.type === 'tarefa') {
                await updateTarefa(selectedEvent.id, payload)
            } else {
                await updateLembrete(selectedEvent.id, payload)
            }
        } else {
            if (form.type === 'tarefa') {
                await addTarefa(payload)
            } else {
                await addLembrete(payload)
            }
        }

        setDialogOpen(false)
    }

    const handleDelete = async () => {
        if (!selectedEvent) return

        if (selectedEvent.type === 'tarefa') {
            await deleteTarefa(selectedEvent.id)
        } else {
            await deleteLembrete(selectedEvent.id)
        }

        setDialogOpen(false)
    }

    return (
        <div className="flex h-screen  text-white">
            <div className="flex-1 p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <h1 className="text-3xl font-bold text-foreground">Calendário</h1>
                </div>

                <div className="h-[calc(100%-80px)] shadow-inner">
                    <FullCalendar
                        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={ptBrLocale}
                        headerToolbar={{
                            left: 'prev,next',
                            center: 'title',
                            right: 'today'
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
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Tipo</label>
                            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tarefa">Tarefa</SelectItem>
                                    <SelectItem value="lembrete">Lembrete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Título</label>
                            <Input
                                value={form.titulo}
                                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                placeholder="Digite o título"
                                required
                            />
                        </div>

                        {form.type === 'tarefa' ? (
                            <>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Descrição</label>
                                    <Textarea
                                        value={form.descricao}
                                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                        placeholder="Descrição da tarefa"
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Responsável</label>
                                    <Input
                                        value={form.responsavel}
                                        onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                                        placeholder="Responsável pela tarefa"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Conteúdo</label>
                                    <Textarea
                                        value={form.conteudo}
                                        onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                                        placeholder="Conteúdo do lembrete"
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Destinatário</label>
                                    <Input
                                        value={form.destinatario}
                                        onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                        placeholder="Destinatário do lembrete"
                                    />
                                </div>
                            </>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Data</label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Prioridade</label>
                                <Select value={form.prioridade} onValueChange={(value) => setForm({ ...form, prioridade: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORIDADE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div />
                        </div>

                        <DialogFooter className="mt-4 gap-2">
                            {selectedEvent && (
                                <Button type="button" variant="destructive" onClick={handleDelete}>
                                    Excluir
                                </Button>
                            )}
                            <Button type="submit">{selectedEvent ? 'Salvar alterações' : 'Criar evento'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
