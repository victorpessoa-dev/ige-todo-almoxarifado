'use client'

import { useCallback, useMemo, useState } from 'react'

export function useResizableColumns(columns) {
  const [widths, setWidths] = useState(() =>
    Object.fromEntries(columns.map((column) => [column.key, column.width]))
  )

  const columnsByKey = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, column])),
    [columns]
  )

  const tableWidth = useMemo(
    () => Object.values(widths).reduce((total, width) => total + width, 0),
    [widths]
  )

  const getColumnStyle = useCallback(
    (key) => ({ width: `${widths[key]}px` }),
    [widths]
  )

  const startResize = useCallback(
    (key, event) => {
      const column = columnsByKey[key]
      if (!column) return

      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startWidth = widths[key]
      const minWidth = column.minWidth || 56
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMouseMove = (moveEvent) => {
        const nextWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX)

        setWidths((current) => ({
          ...current,
          [key]: nextWidth
        }))
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [columnsByKey, widths]
  )

  return {
    getColumnStyle,
    startResize,
    tableWidth
  }
}

export function ColumnResizeHandle({ columnKey, onResizeStart }) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionar coluna"
      className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize select-none touch-none after:absolute after:right-0 after:top-1/2 after:h-5 after:w-px after:-translate-y-1/2 after:bg-border hover:after:bg-primary"
      onMouseDown={(event) => onResizeStart(columnKey, event)}
    />
  )
}
