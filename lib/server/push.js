import webpush from 'web-push'

function configured() {
  return Boolean(
    (process.env.VAPID_PUBLIC_KEY || process.env.WEB_PUSH_VAPID_PUBLIC_KEY) &&
    (process.env.VAPID_PRIVATE_KEY || process.env.WEB_PUSH_VAPID_PRIVATE_KEY) &&
    (process.env.VAPID_SUBJECT || process.env.WEB_PUSH_SUBJECT)
  )
}

if (configured()) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || process.env.WEB_PUSH_SUBJECT,
    process.env.VAPID_PUBLIC_KEY || process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY || process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  )
}

export function getVapidPublicKey() {
  return (process.env.VAPID_PUBLIC_KEY || process.env.WEB_PUSH_VAPID_PUBLIC_KEY) || null
}

export async function sendPush(subscription, notification) {
  if (!configured()) return { sent: 0, configured: false }

  await webpush.sendNotification(subscription, JSON.stringify(notification))
  return { sent: 1, configured: true }
}