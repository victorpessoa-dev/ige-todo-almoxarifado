import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = 'itens',
  onPageChange,
  onPageSizeChange
}) {
  if (totalItems === 0) return null

  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(totalItems, page * pageSize)

  return (
    <nav
      className="flex flex-col gap-3 border-t px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4"
      aria-label={`Paginacao de ${itemLabel}`}
    >
      <span>
        Mostrando {firstItem}-{lastItem} de {totalItems} {itemLabel}
      </span>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-wrap">
        {onPageSizeChange && (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              className="col-span-3 h-9 w-full sm:w-[116px]"
              aria-label={`Itens por pagina de ${itemLabel}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} / pág.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-full sm:w-auto"
          aria-label="Pagina anterior"
        >
          Anterior
        </Button>
        <span className="min-w-16 text-center text-xs font-medium text-foreground">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-full sm:w-auto"
          aria-label="Proxima pagina"
        >
          Próxima
        </Button>
      </div>
    </nav>
  )
}
