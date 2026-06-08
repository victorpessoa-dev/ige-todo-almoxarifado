'use client'

import { useEffect } from 'react'

export function useAutoScroll(ref, onEnd, active) {
  useEffect(() => {
    if (!active) return

    const el = ref.current
    if (!el) return

    let isRunning = true
    let timeout = null
    let lastManualScrollAt = 0

    const pauseAutoScroll = () => {
      lastManualScrollAt = Date.now()
    }

    const sleep = (ms) =>
      new Promise((resolve) => {
        timeout = setTimeout(resolve, ms)
      })

    const scrollStep = async () => {
      await sleep(2000)

      if (!isRunning) return

      if (el.scrollHeight <= el.clientHeight) {
        await sleep(8000)
        if (!isRunning) return
        onEnd && onEnd()
        return
      }

      while (isRunning) {
        if (Date.now() - lastManualScrollAt < 5000) {
          await sleep(1000)
          continue
        }

        el.scrollBy({
          top: 200,
          behavior: 'smooth'
        })

        await sleep(3000)
        if (!isRunning) return

        const reachedEnd =
          el.scrollTop + el.clientHeight >= el.scrollHeight - 5

        if (reachedEnd) {
          await sleep(2000)
          if (!isRunning) return
          onEnd && onEnd()
          return
        }
      }
    }

    el.addEventListener('wheel', pauseAutoScroll, { passive: true })
    el.addEventListener('touchstart', pauseAutoScroll, { passive: true })
    el.addEventListener('pointerdown', pauseAutoScroll, { passive: true })

    scrollStep()

    return () => {
      isRunning = false
      if (timeout) clearTimeout(timeout)
      el.removeEventListener('wheel', pauseAutoScroll)
      el.removeEventListener('touchstart', pauseAutoScroll)
      el.removeEventListener('pointerdown', pauseAutoScroll)
    }
  }, [onEnd, active, ref])
}
