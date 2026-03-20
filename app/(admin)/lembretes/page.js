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
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, StickyNote, Calendar } from 'lucide-react'

// Funcao para agrupar itens por data
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

export default function LembretesPage() {
  const { lembretes, addLembrete, updateLembrete, deleteLembrete, isLoaded } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [editingLembrete, setEditingLembrete] = useState(null)
  const [showConcluidos, setShowConcluidos] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    destinatario: '',
    status: 'a_fazer',
    prioridade: 'medio'
  })

  const lembretesPendentes = lembretes.filter(l => l.status !== 'concluido')
  const lembretesConcluidos = lembretes.filter(l => l.status === 'concluido')

  const lembretesPendentesGrouped = groupByDate(lembretesPendentes)
  const lembretesConcluidosGrouped = groupByDate(lembretesConcluidos)

  const resetForm = () => {
    setForm({ titulo: '', conteudo: '', destinatario: '', status: 'a_fazer', prioridade: 'medio' })
    setEditingLembrete(null)
  }

  const handleOpenChange = (open) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleEdit = (lembrete) => {
    setEditingLembrete(lembrete)
    setForm({
      titulo: lembrete.titulo,
      conteudo: lembrete.conteudo,
      destinatario: lembrete.destinatario,
      status: lembrete.status,
      prioridade: lembrete.prioridade || 'medio'
    })
    setIsOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) {
      toast.error('O titulo e obrigatorio!')
      return
    }

    if (editingLembrete) {
      updateLembrete(editingLembrete.id, form)
      toast.success('Lembrete atualizado com sucesso!')
    } else {
      addLembrete(form)
      toast.success('Lembrete criado com sucesso!')
    }
    handleOpenChange(false)
  }

  const handleDelete = (id) => {
    deleteLembrete(id)
    toast.success('Lembrete removido!')
  }

  const handleStatusChange = (id, newStatus) => {
    updateLembrete(id, { status: newStatus })
    if (newStatus === 'concluido') {
      toast.success('Lembrete concluido!')
    } else {
      toast.success('Status atualizado!')
    }
  }

  const handleConcluir = (id) => {
    updateLembrete(id, { status: 'concluido' })
    toast.success('Lembrete concluido!')
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

  const LembreteCard = ({ lembrete, isConcluido = false }) => {
    const prioridadeInfo = getPrioridadeInfo(lembrete.prioridade)
    const statusInfo = getStatusInfo(lembrete.status)

    return (
      <Card className={`transition-all ${isConcluido ? 'opacity-70 bg-muted/30' : `hover:shadow-lg ${prioridadeInfo.shadow}`}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => isConcluido ? handleStatusChange(lembrete.id, 'a_fazer') : handleConcluir(lembrete.id)}
                className="mt-1 hover:scale-110 transition-transform"
                title={isConcluido ? 'Reabrir lembrete' : 'Marcar como concluido'}
              >
                {getStatusIcon(lembrete.status)}
              </button>
              <div className="flex-1">
                <h3 className={`font-semibold text-foreground ${isConcluido ? 'line-through text-muted-foreground' : ''}`}>
                  {lembrete.titulo}
                </h3>
                {lembrete.conteudo && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{lembrete.conteudo}</p>
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
                  {lembrete.destinatario && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      Para: {lembrete.destinatario}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isConcluido && (
                <Select
                  value={lembrete.status}
                  onValueChange={(value) => handleStatusChange(lembrete.id, value)}
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(lembrete)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(lembrete.id)}>
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
        {items.map((lembrete) => (
          <LembreteCard key={lembrete.id} lembrete={lembrete} isConcluido={isConcluido} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lembretes</h1>
          <p className="text-muted-foreground">Gerencie seus lembretes e notas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lembrete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLembrete ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Titulo</label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Digite o titulo do lembrete"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Conteudo</label>
                <Textarea
                  value={form.conteudo}
                  onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                  placeholder="Digite o conteudo do lembrete"
                  rows={4}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Destinatario</label>
                <Input
                  value={form.destinatario}
                  onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                  placeholder="Para quem e esse lembrete?"
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
                {editingLembrete ? 'Salvar Alteracoes' : 'Criar Lembrete'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lembretes Pendentes */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="h-5 w-5" />
          Pendentes ({lembretesPendentes.length})
        </h2>
        {lembretesPendentesGrouped.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhum lembrete pendente</p>
              <p className="text-sm text-muted-foreground">Clique em "Novo Lembrete" para comecar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {lembretesPendentesGrouped.map(([dateLabel, items]) => (
              <DateGroup key={dateLabel} dateLabel={dateLabel} items={items} />
            ))}
          </div>
        )}
      </div>

      {/* Lembretes Concluidos */}
      {lembretesConcluidos.length > 0 && (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setShowConcluidos(!showConcluidos)}
            className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors w-fit"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Concluidos ({lembretesConcluidos.length})
            {showConcluidos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showConcluidos && (
            <div className="flex flex-col gap-6">
              {lembretesConcluidosGrouped.map(([dateLabel, items]) => (
                <DateGroup key={dateLabel} dateLabel={dateLabel} items={items} isConcluido />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
