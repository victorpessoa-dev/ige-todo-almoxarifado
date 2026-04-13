'use client'

import { useEffect } from 'react'

export function useAutoScroll(ref, onEnd, active) {
  useEffect(() => {
    if (!active) return

    const el = ref.current
    if (!el) return

    let isRunning = true
    let timeout = null

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

    scrollStep()

    return () => {
      isRunning = false
      if (timeout) clearTimeout(timeout)
    }
  }, [onEnd, active, ref])
}