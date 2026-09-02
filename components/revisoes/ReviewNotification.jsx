'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { adiarRevisao, listRevisoesAbertas, registrarNotificacaoRevisao } from '@/lib/services/revisoes-service'
import { notifyPush } from '@/lib/services/push-service'
import { playNotificationSound } from '@/lib/notifications/sound'

export function ReviewNotification() {
  const router = useRouter()
  const showing = useRef(new Set())

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const reviews = await listRevisoesAbertas()
        const now = Date.now()
        for (const review of reviews) {
          const notifyAt = new Date(review.adiada_ate || review.notificar_em || review.agendada_para).getTime()
          if (!active || notifyAt > now || showing.current.has(review.id)) continue
          showing.current.add(review.id)
          const repeat = review.rotinas_revisao?.repetir_notificacao_minutos || 10
          await registrarNotificacaoRevisao(review.id, repeat)
          notifyPush({
            title: 'RevisÃ£o de estoque disponÃ­vel',
            body: `${review.rotinas_revisao?.nome || 'Rotina'} possui ${(review.revisoes_estoque_itens || []).length} itens aguardando revisÃ£o.`,
            url: `/revisoes?revisao=${review.id}`
          }).catch(() => {})
          playNotificationSound()
          toast.info('RevisÃ£o de estoque disponÃ­vel', {
            id: `review-${review.id}`,
            description: `${review.rotinas_revisao?.nome || 'Rotina'} possui ${(review.revisoes_estoque_itens || []).length} itens aguardando revisÃ£o.`,
            duration: Infinity,
            action: { label: 'Revisar', onClick: () => router.push('/revisoes') },
            cancel: { label: 'Adiar 10 min', onClick: () => adiarRevisao(review.id, 10) },
            onDismiss: () => { showing.current.delete(review.id) }
          })
        }
      } catch {}
    }
    check()
    const timer = window.setInterval(check, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [router])

  return null
}