'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let refreshing = false
    const handleControllerChange = () => { if (refreshing) return; refreshing = true; window.location.reload() }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    const register = () => navigator.serviceWorker.register('/sw.js').then((registration) => registration.update()).catch(() => {})
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
    return () => { window.removeEventListener('load', register); navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange) }
  }, [])
  return null
}