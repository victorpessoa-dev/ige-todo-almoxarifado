import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { TableHead } from '@/components/ui/table'

export default function SortableTableHead({
  label,
  columnKey,
  sortConfig,
  onSort,
  className
}) {
  const isActive = sortConfig.key === columnKey

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
      >
        <span>{label}</span>
        {isActive ? (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5" />
        )}
      </button>
    </TableHead>
  )
}
