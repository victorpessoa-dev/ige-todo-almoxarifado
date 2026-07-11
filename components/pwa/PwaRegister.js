'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let refreshing = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update()
        })
        .catch(() => {
          // PWA support is progressive; the app keeps working if registration fails.
        })
    })
  }, [])

  return null
}
