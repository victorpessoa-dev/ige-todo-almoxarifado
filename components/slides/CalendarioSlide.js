"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { CalendarDays } from "lucide-react";

const PAST = "#64748b";
const AUTO = "#2563eb";
const MANUAL = "#7c3aed";
const SLIDE_DURATION_MS = 15000;

export function CalendarioSlide({ revisoes = [], active, onEnd }) {
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;

    const timeout = window.setTimeout(() => {
      onEnd?.();
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [active, onEnd]);

  const events = useMemo(
    () =>
      revisoes
        .filter((revisao) => revisao.agendada_para)
        .map((revisao) => {
          const isPast = new Date(revisao.agendada_para).getTime() < now;
          const isManual = revisao.rotinas_revisao?.tipo === "checklist";
          const color = isPast ? PAST : isManual ? MANUAL : AUTO;

          return {
            id: revisao.id,
            title: revisao.rotinas_revisao?.nome || "Revisão de estoque",
            start: revisao.agendada_para,
            backgroundColor: color,
            borderColor: color,
            textColor: "#fff",
          };
        }),
    [revisoes, now],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6 md:p-8">
      <div className="mb-3 flex shrink-0 items-center justify-center gap-2 text-center sm:mb-4 sm:gap-3">
        <CalendarDays className="h-8 w-8 shrink-0 text-primary sm:h-10 sm:w-10" />
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
          Calendário de revisões
        </h2>
      </div>

      <div className="mb-3 flex shrink-0 flex-wrap justify-center gap-2 text-xs text-muted-foreground sm:mb-4 sm:gap-4 sm:text-sm">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          Passadas
        </span>
        <span className="inline-flex items-center gap-1 text-blue-600">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Automáticas
        </span>
        <span className="inline-flex items-center gap-1 text-violet-600">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
          Manuais
        </span>
      </div>

      <div className="review-calendar review-calendar--slide min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="h-full min-h-0 pointer-events-none">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            headerToolbar={false}
            events={events}
            height="100%"
            dayMaxEvents={2}
            eventDisplay="block"
            displayEventTime={false}
          />
        </div>
      </div>
    </div>
  );
}
