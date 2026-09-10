'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MotionScrollIndicator,
  MotionWindowScrollIndicator
} from '@/components/animations/MotionScrollIndicator'

const SCROLL_SELECTOR = [
  '.motion-scroll-container',
  '.ige-scrollbar',
  '.scrollbar-soft',
  '.sidebar-scroll',
  '.slide-scroll',
  '.admin-main-scroll',
  '.inventory-table-scroll',
  '[data-motion-scroll]'
].join(',')

let nextScrollId = 1
const scrollIds = new WeakMap()

function getScrollId(element) {
  if (!scrollIds.has(element)) {
    scrollIds.set(element, `motion-scroll-${nextScrollId}`)
    nextScrollId += 1
  }

  return scrollIds.get(element)
}

function isScrollable(element) {
  const style = window.getComputedStyle(element)
  const overflowX = style.overflowX
  const overflowY = style.overflowY
  const canScrollX = overflowX === 'auto' || overflowX === 'scroll'
  const canScrollY = overflowY === 'auto' || overflowY === 'scroll'

  return canScrollX || canScrollY
}

function TrackedScrollIndicators({ element }) {
  const targetRef = useMemo(() => ({ current: element }), [element])

  return (
    <>
      <MotionScrollIndicator targetRef={targetRef} orientation="vertical" />
      <MotionScrollIndicator targetRef={targetRef} orientation="horizontal" />
    </>
  )
}

export function MotionScrollRegistry() {
  const [elements, setElements] = useState([])

  useEffect(() => {
    let frame = 0

    const scan = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const nextElements = Array.from(
          document.querySelectorAll(SCROLL_SELECTOR)
        ).filter((element) => element instanceof HTMLElement && isScrollable(element))

        setElements((currentElements) => {
          if (
            currentElements.length === nextElements.length &&
            currentElements.every((element, index) => element === nextElements[index])
          ) {
            return currentElements
          }

          return nextElements
        })
      })
    }

    scan()

    const mutationObserver = new MutationObserver(scan)
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-motion-scroll'],
      childList: true,
      subtree: true
    })

    window.addEventListener('resize', scan)

    return () => {
      cancelAnimationFrame(frame)
      mutationObserver.disconnect()
      window.removeEventListener('resize', scan)
    }
  }, [])

  return (
    <>
      <MotionWindowScrollIndicator />
      {elements.map((element) => (
        <TrackedScrollIndicators key={getScrollId(element)} element={element} />
      ))}
    </>
  )
}
