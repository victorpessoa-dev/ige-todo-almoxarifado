const DEFAULT_NOTIFICATION_SOUND = '/sound/new_notifcation.mp3'
let notificationAudio = null

export function playNotificationSound(src = DEFAULT_NOTIFICATION_SOUND) {
  if (typeof window === 'undefined') return

  try {
    if (!notificationAudio || notificationAudio.src !== new URL(src, window.location.origin).href) {
      notificationAudio = new Audio(src)
      notificationAudio.preload = 'auto'
      notificationAudio.volume = 0.8
    }

    notificationAudio.currentTime = 0
    notificationAudio.play().catch(() => {})
  } catch {}
}