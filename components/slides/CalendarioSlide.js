'use client'
import { useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { CalendarDays } from 'lucide-react'
const PAST='#64748b'; const AUTO='#2563eb'; const MANUAL='#7c3aed'
export function CalendarioSlide({ revisoes = [] }) {
  const events = useMemo(() => revisoes.filter((r) => r.agendada_para).map((r) => { const color = new Date(r.agendada_para).getTime() < Date.now() ? PAST : (r.rotinas_revisao?.tipo === 'checklist' ? MANUAL : AUTO); return { id: r.id, title: r.rotinas_revisao?.nome || 'Revisão de estoque', start: r.agendada_para, backgroundColor: color, borderColor: color, textColor: '#fff' } }), [revisoes])
  return <div className="flex h-full min-h-0 flex-col p-6"><div className="mb-4 flex items-center justify-center gap-3"><CalendarDays className="h-10 w-10 text-primary" /><h2 className="text-4xl font-bold">Calendário de revisões</h2></div><div className="mb-4 flex justify-center gap-4 text-sm text-muted-foreground"><span>● Passadas</span><span className="text-blue-600">● Automáticas</span><span className="text-violet-600">● Manuais</span></div><div className="min-h-[600px] flex-1 pointer-events-none"><FullCalendar plugins={[dayGridPlugin]} initialView="dayGridMonth" locale={ptBrLocale} headerToolbar={false} events={events} height="100%" dayMaxEvents={3} eventDisplay="block" displayEventTime={false} /></div></div>
}