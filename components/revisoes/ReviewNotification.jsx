"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/notifications/toast";
import { useRouter } from "next/navigation";
import {
  adiarRevisao,
  listRevisoesAbertas,
  registrarNotificacaoRevisao,
} from "@/lib/services/revisoes-service";
import { notifyPush } from "@/lib/services/push-service";
import { playNotificationSound } from "@/lib/notifications/sound";

export function ReviewNotification() {
  const router = useRouter();
  const showing = useRef(new Set());

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const reviews = await listRevisoesAbertas();
        const now = Date.now();
        for (const review of reviews) {
          const notifyAt = new Date(
            review.adiada_ate || review.notificar_em || review.agendada_para,
          ).getTime();
          if (!active || notifyAt > now || showing.current.has(review.id)) {
            continue;
          }

          showing.current.add(review.id);
          const repeat =
            review.rotinas_revisao?.repetir_notificacao_minutos || 10;
          await registrarNotificacaoRevisao(review.id, repeat);

          const description = `${review.rotinas_revisao?.nome || "Rotina"} possui ${(review.revisoes_estoque_itens || []).length} itens aguardando revisão.`;
          notifyPush({
            title: "Revisão de estoque disponível",
            body: description,
            url: `/revisoes?revisao=${review.id}`,
          }).catch(() => {});
          playNotificationSound();

          let notificationToast;
          notificationToast = toast.warning("Revisão de estoque disponível", {
            description,
            duration: Infinity,
            action: (
              <div className="col-span-full grid min-w-0 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="min-h-9 min-w-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => {
                    notificationToast?.dismiss();
                    router.push("/revisoes");
                  }}
                >
                  Revisar
                </button>
                <button
                  type="button"
                  className="min-h-9 min-w-0 rounded-md border border-border bg-background/70 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                  onClick={() => {
                    notificationToast?.dismiss();
                    adiarRevisao(review.id, 10);
                  }}
                >
                  Adiar 10 min
                </button>
              </div>
            ),
            onDismiss: () => {
              showing.current.delete(review.id);
            },
          });
        }
      } catch {}
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
