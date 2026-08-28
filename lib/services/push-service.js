import { authenticatedFetch } from '@/lib/api/authenticated-fetch'

const PUSH_SUBSCRIPTION_KEY = 'ige-web-push-subscription'

export function getStoredPushSubscription() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(window.localStorage.getItem(PUSH_SUBSCRIPTION_KEY) || 'null') } catch { return null }
}

export function storePushSubscription(subscription) {
  if (typeof window !== 'undefined') window.localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription))
}

export function clearStoredPushSubscription() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(PUSH_SUBSCRIPTION_KEY)
}

export async function notifyPush(notification) {
  const subscription = getStoredPushSubscription()
  if (!subscription) return { ok: true, skipped: true }

  const response = await authenticatedFetch('/api/push/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...notification, subscription })
  })

  if (!response.ok) throw new Error('Falha ao enviar Web Push.')
  return response.json()
}