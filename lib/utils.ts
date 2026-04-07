import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useState, useEffect, type RefObject } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useAutoScroll(
  ref: RefObject<HTMLElement | null>,
  onEnd?: () => void,
  active?: boolean
) {
  useEffect(() => {
    if (!active) return

    const el = ref.current
    if (!el) return

    let isRunning = true
    let timeout: ReturnType<typeof setTimeout> | null = null

    const sleep = (ms: number) => {
      return new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, ms)
      })
    }

    const scrollStep = async () => {
      // ✅ NOVO: espera antes de começar
      await sleep(2000) // ⏳ tempo inicial (ajuste aqui)

      if (!isRunning) return

      // Se não tem scroll
      if (el.scrollHeight <= el.clientHeight) {
        await sleep(8000)
        if (!isRunning) return
        onEnd?.()
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
          onEnd?.()
          return
        }
      }
    }

    scrollStep()

    return () => {
      isRunning = false
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [onEnd, active, ref])
}

export function useItemsPerPage() {
  const [items, setItems] = useState(4);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const width = window.innerWidth;

      if (width < 768) {
        setItems(4);
      } else if (width < 1024) {
        setItems(6);
      } else {
        setItems(9);
      }
    };

    update();
    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  return items;
}

export function chunkArray(array: any[], size: number) {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}
