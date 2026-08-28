'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { clearStoredPushSubscription, storePushSubscription } from '@/lib/services/push-service'

function decodeVapidKey(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const raw = window.atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js')
}

export function PushNotificationToggle() {
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    const syncSubscription = async () => {
      if (!supported()) { if (active) setState('unavailable'); return }
      if (Notification.permission === 'denied') { if (active) setState('denied'); return }

      try {
        const registration = await getServiceWorkerRegistration()
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) storePushSubscription(subscription.toJSON())
        else clearStoredPushSubscription()
        if (active) setState(subscription ? 'enabled' : 'idle')
      } catch {
        if (active) setState('idle')
      }
    }

    syncSubscription()
    return () => { active = false }
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const keyResponse = await fetch('/api/push')
      const { publicKey, enabled } = await keyResponse.json()
      if (!enabled || !publicKey) throw new Error('Web Push não está configurado no servidor.')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'idle'); return }

      const registration = await getServiceWorkerRegistration()
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(publicKey)
        })
      }

      storePushSubscription(subscription.toJSON())
      setState('enabled')
      toast.success('Notificações ativadas neste dispositivo.')
    } catch (error) {
      toast.error(error.message || 'Não foi possível ativar notificações.')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = registration && await registration.pushManager.getSubscription()
      if (subscription) await subscription.unsubscribe()
      clearStoredPushSubscription()
      setState('idle')
      toast.success('Notificações desativadas neste dispositivo.')
    } catch {
      toast.error('Não foi possível desativar notificações.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return null
  if (state === 'unavailable') return <p className="text-sm text-muted-foreground">Notificações não são suportadas neste navegador.</p>
  if (state === 'denied') return <p className="text-sm text-muted-foreground">Permissão negada. Altere a permissão nas configurações do navegador.</p>

  return <Button type="button" variant={state === 'enabled' ? 'outline' : 'default'} onClick={state === 'enabled' ? disable : enable} disabled={busy}>{state === 'enabled' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}{state === 'enabled' ? 'Desativar notificações' : 'Ativar notificações'}</Button>
}