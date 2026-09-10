'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'

export function MotionScrollIndicator({ targetRef, orientation = 'vertical' }) {
  const shouldReduceMotion = useReducedMotion()
  const [viewport, setViewport] = useState(null)
  const { scrollYProgress, scrollXProgress } = useScroll({
    container: targetRef
  })
  const progress = useSpring(
    orientation === 'horizontal' ? scrollXProgress : scrollYProgress,
    shouldReduceMotion
      ? { stiffness: 1000, damping: 100 }
      : { stiffness: 260, damping: 30, mass: 0.2 }
  )
  const isHorizontal = orientation === 'horizontal'

  useEffect(() => {
    const element = targetRef?.current
    if (!element) return undefined

    let frame = null
    const update = () => {
      const rect = element.getBoundingClientRect()
      const hasOverflow = isHorizontal
        ? element.scrollWidth > element.clientWidth + 1
        : element.scrollHeight > element.clientHeight + 1

      if (!hasOverflow) {
        setViewport(null)
        return
      }

      const nextViewport = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: window.innerWidth - rect.right,
        bottom: window.innerHeight - rect.bottom
      }
      setViewport((current) => current && Object.keys(nextViewport).every((key) => current[key] === nextViewport[key]) ? current : nextViewport)
    }

    const scheduleUpdate = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => { frame = null; update() })
    }
    update()
    const resizeObserver = new ResizeObserver(scheduleUpdate)
    const observeChildren = () => {
      resizeObserver.disconnect()
      resizeObserver.observe(element)
      Array.from(element.children).forEach((child) => resizeObserver.observe(child))
    }
    observeChildren()

    const mutationObserver = new MutationObserver(() => {
      observeChildren()
      scheduleUpdate()
    })
    mutationObserver.observe(element, { childList: true, subtree: true })


    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true })

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      resizeObserver.disconnect()

      mutationObserver.disconnect()

      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [isHorizontal, targetRef])

  if (!viewport || typeof document === 'undefined') return null

  const style = isHorizontal
    ? {
        position: 'fixed',
        left: viewport.left + 8,
        bottom: viewport.bottom + 4,
        width: Math.max(0, viewport.width - 16),
        height: 4
      }
    : {
        position: 'fixed',
        left: viewport.left + viewport.width - 12,
        top: viewport.top + 8,
        width: 4,
        height: Math.max(0, viewport.height - 16)
      }

  return createPortal(
    <span
      aria-hidden="true"
      className="motion-scroll-indicator pointer-events-none z-40 overflow-hidden rounded-full bg-foreground/10"
      style={style}
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-primary"
        style={
          isHorizontal
            ? { scaleX: progress, transformOrigin: 'left center' }
            : { scaleY: progress, transformOrigin: 'center top' }
        }
      />
    </span>,
    document.body
  )
}

export function MotionWindowScrollIndicator() {
  const shouldReduceMotion = useReducedMotion()
  const [hasOverflow, setHasOverflow] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(
    scrollYProgress,
    shouldReduceMotion
      ? { stiffness: 1000, damping: 100 }
      : { stiffness: 260, damping: 30, mass: 0.2 }
  )

  useEffect(() => {
    const update = () => {
      const page = document.documentElement
      setHasOverflow(page.scrollHeight > window.innerHeight + 1)
    }

    update()
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(document.documentElement)
    resizeObserver.observe(document.body)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [])

  if (!hasOverflow || typeof document === 'undefined') return null

  return createPortal(
    <span
      aria-hidden="true"
      className="motion-scroll-indicator pointer-events-none fixed top-2 right-2 z-[100] h-[calc(100dvh-1rem)] w-1 overflow-hidden rounded-full bg-foreground/10"
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-primary"
        style={{ scaleY: progress, transformOrigin: 'center top' }}
      />
    </span>,
    document.body
  )
}
