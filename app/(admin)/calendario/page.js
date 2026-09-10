"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { toast } from "@/lib/notifications/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listRevisoesCalendario } from "@/lib/services/revisoes-service";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">
      Carregando calendário...
    </div>
  ),
});

const PAST_COLOR = "#64748b";
const FUTURE_COLOR = "#2563eb";
const MANUAL_COLOR = "#7c3aed";

function dayKey(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDay(value) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function getReviewTitle(review) {
  return review.rotinas_revisao?.nome || "Revisão de estoque";
}

function getReviewItemCount(review) {
  return review.revisoes_estoque_itens?.length || 0;
}

function useCompactCalendar() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setIsCompact(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return isCompact;
}

export default function CalendarPage() {
  const router = useRouter();
  const [revisoes, setRevisoes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const isCompactCalendar = useCompactCalendar();

  useEffect(() => {
    let active = true;

    listRevisoesCalendario()
      .then((data) => {
        if (active) setRevisoes(data);
      })
      .catch((error) => {
        toast.error(
          error?.message || "Não foi possível carregar o calendário.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(
    () =>
      revisoes
        .filter((revisao) => revisao.agendada_para)
        .map((revisao) => {
          const isPast = new Date(revisao.agendada_para).getTime() < now;
          const isManual = revisao.rotinas_revisao?.tipo === "checklist";
          const color = isPast
            ? PAST_COLOR
            : isManual
              ? MANUAL_COLOR
              : FUTURE_COLOR;

          return {
            id: revisao.id,
            title: getReviewTitle(revisao),
            start: revisao.agendada_para,
            backgroundColor: color,
            borderColor: color,
            textColor: "#fff",
            extendedProps: {
              total: getReviewItemCount(revisao),
              status: revisao.status,
              tipo: revisao.rotinas_revisao?.tipo,
            },
          };
        }),
    [revisoes, now],
  );

  const selectedReviews = useMemo(() => {
    if (!selectedDate) return [];
    return revisoes.filter(
      (revisao) =>
        revisao.agendada_para && dayKey(revisao.agendada_para) === selectedDate,
    );
  }, [revisoes, selectedDate]);

  const todayReviews = useMemo(() => {
    const today = dayKey(new Date().toISOString());
    return revisoes.filter(
      (revisao) =>
        revisao.agendada_para && dayKey(revisao.agendada_para) === today,
    );
  }, [revisoes]);

  const openReview = (reviewId) => router.push("/revisoes?revisao=" + reviewId);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 pb-6">
      <header className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">
            Calendário
          </h1>
          <p className="text-sm text-muted-foreground">Revisões programadas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            Automáticas
          </Badge>
          <Badge
            variant="outline"
            className="border-violet-200 bg-violet-50 text-violet-700"
          >
            Manuais
          </Badge>
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700"
          >
            Passadas
          </Badge>
        </div>
      </header>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="review-calendar min-h-[32rem] overflow-hidden rounded-lg border bg-card shadow-sm sm:min-h-[38rem] md:min-h-[42rem] xl:h-[calc(100dvh-12rem)] xl:min-h-[38rem]">
          <FullCalendar
            key={isCompactCalendar ? "compact" : "wide"}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isCompactCalendar ? "timeGridDay" : "dayGridMonth"}
            locale={ptBrLocale}
            headerToolbar={
              isCompactCalendar
                ? {
                    left: "prev,next",
                    center: "title",
                    right: "today timeGridDay,dayGridMonth",
                  }
                : {
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }
            }
            buttonText={{
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
            }}
            allDayText="Dia todo"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            nowIndicator
            expandRows
            events={events}
            dayMaxEvents={isCompactCalendar ? 2 : 3}
            eventMaxStack={isCompactCalendar ? 2 : 3}
            moreLinkClick="popover"
            displayEventTime={!isCompactCalendar}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              meridiem: false,
            }}
            eventClassNames={({ event }) =>
              event.start && event.start.getTime() < now
                ? ["review-calendar__event--past"]
                : ["review-calendar__event--upcoming"]
            }
            eventContent={({ event, timeText }) => (
              <div className="review-calendar__event" title={event.title}>
                {timeText && (
                  <span className="review-calendar__event-time font-bold">
                    {timeText}
                  </span>
                )}
                <span className="review-calendar__event-title font-semibold">
                  {event.title}
                </span>
                <span className="review-calendar__event-count">
                  {event.extendedProps.total}
                </span>
              </div>
            )}
            dateClick={({ dateStr }) => {
              setSelectedDate(dateStr);
              setDialogOpen(true);
            }}
            eventClick={({ event }) => openReview(event.id)}
            height="100%"
            windowResizeDelay={120}
          />
        </section>

        <aside className="ige-scrollbar motion-scroll-container min-w-0 rounded-lg border bg-card p-4 shadow-sm xl:max-h-[calc(100dvh-12rem)] xl:overflow-y-auto">
          <div className="mb-4">
            <h2 className="font-semibold">Hoje</h2>
            <p className="text-sm text-muted-foreground">
              {todayReviews.length} revisão(ões)
            </p>
          </div>

          <div className="grid gap-2">
            {todayReviews.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Nenhuma revisão para hoje.
              </p>
            ) : (
              todayReviews.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  className="w-full min-w-0 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
                  onClick={() => openReview(review.id)}
                >
                  <span
                    className="block truncate font-medium"
                    title={getReviewTitle(review)}
                  >
                    {getReviewTitle(review)}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {getReviewItemCount(review)} itens · {review.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? "Revisões de " + formatDay(selectedDate)
                : "Revisões"}
            </DialogTitle>
            <DialogDescription>
              Selecione uma revisão para abrir e marcar seus itens.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {selectedReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não há revisões agendadas para este dia.
              </p>
            ) : (
              selectedReviews.map((review) => (
                <div
                  key={review.id}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate font-medium"
                      title={getReviewTitle(review)}
                    >
                      {getReviewTitle(review)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getReviewItemCount(review)} itens · {review.status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => openReview(review.id)}
                  >
                    Marcar revisão
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
