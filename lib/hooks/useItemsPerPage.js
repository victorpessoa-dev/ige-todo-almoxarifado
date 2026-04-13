'use client'

import { useEffect, useState } from 'react'

export function useItemsPerPage() {
  const [items, setItems] = useState(4)

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth

      if (width < 768) setItems(4)
      else if (width < 1024) setItems(6)
      else setItems(9)
    }

    update()
    window.addEventListener('resize', update)

    return () => window.removeEventListener('resize', update)
  }, [])

  return items
}