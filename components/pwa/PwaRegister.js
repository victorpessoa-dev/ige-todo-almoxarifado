'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {})

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith('ige-pwa-')).map((key) => caches.delete(key))))
          .catch(() => {})
      }

      return
    }

    const register = () => navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
    return () => { window.removeEventListener('load', register) }
  }, [])
  return null
}
