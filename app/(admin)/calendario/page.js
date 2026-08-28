'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listRevisoesCalendario } from '@/lib/services/revisoes-service'

const PAST_COLOR = '#64748b'
const FUTURE_COLOR = '#2563eb'

function dayKey(value) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatDay(value) {
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  })
}

export default function CalendarPage() {
  const router = useRouter()
  const [revisoes, setRevisoes] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    listRevisoesCalendario()
      .then((data) => active && setRevisoes(data))
      .catch((error) => toast.error(error?.message || 'Não foi possível carregar o calendário.'))
    return () => { active = false }
  }, [])

  const events = useMemo(() => revisoes
    .filter((revisao) => revisao.agendada_para)
    .map((revisao) => {
      const isPast = new Date(revisao.agendada_para).getTime() < now
      const color = isPast ? PAST_COLOR : FUTURE_COLOR
      const rotina = revisao.rotinas_revisao?.nome || 'Revisão de estoque'
      const total = revisao.revisoes_estoque_itens?.length || 0
      return { id: revisao.id, title: rotina + ' · ' + total + ' itens', start: revisao.agendada_para, backgroundColor: color, borderColor: color, textColor: '#fff' }
    }), [revisoes, now])

  const selectedReviews = useMemo(() => {
    if (!selectedDate) return []
    return revisoes.filter((revisao) => revisao.agendada_para && dayKey(revisao.agendada_para) === selectedDate)
  }, [revisoes, selectedDate])

  const openReview = (reviewId) => router.push('/revisoes?revisao=' + reviewId)

  return (
    <div className="mx-auto min-h-full w-full max-w-7xl pb-6">
      <div className="review-calendar min-h-[calc(100dvh-7rem)] overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
          buttonText={{ today: 'Hoje' }}
          events={events}
          dayMaxEvents={3}
          displayEventTime={false}
          eventClassNames={({ event }) => event.start && event.start.getTime() < now ? ['review-calendar__event--past'] : ['review-calendar__event--upcoming']}
          dateClick={({ dateStr }) => { setSelectedDate(dateStr); setDialogOpen(true) }}
          eventClick={({ event }) => openReview(event.id)}
          height="auto"
        />
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDate ? 'Revisões de ' + formatDay(selectedDate) : 'Revisões'}</DialogTitle>
            <DialogDescription>Selecione uma revisão para abrir e marcar seus itens.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedReviews.length === 0 ? <p className="text-sm text-muted-foreground">Não há revisões agendadas para este dia.</p> : selectedReviews.map((review) => (
              <div key={review.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div><p className="font-medium">{review.rotinas_revisao?.nome || 'Revisão de estoque'}</p><p className="text-sm text-muted-foreground">{review.revisoes_estoque_itens?.length || 0} itens · {review.status}</p></div>
                <Button size="sm" onClick={() => openReview(review.id)}>Marcar revisão</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}