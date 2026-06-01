import { RotateCcw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export default function CatalogoFilters({
  search,
  selectedCategory,
  selectedBrand,
  categoryOptions,
  brandOptions,
  onSearchChange,
  onCategoryChange,
  onBrandChange,
  onClear
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:grid-cols-[minmax(0,1fr)_240px_240px_auto]">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por produto, código, aplicação, medida ou marca"
          className="min-w-0 truncate pl-9"
        />
      </div>

      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full min-w-0 overflow-hidden">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          <SelectItem value="todas">
            <span className="block max-w-[min(28rem,calc(100vw-4rem))] truncate" title="Todas as categorias">
              Todas as categorias
            </span>
          </SelectItem>
          {categoryOptions.map((categoria) => (
            <SelectItem key={categoria} value={categoria}>
              <span className="block max-w-[min(28rem,calc(100vw-4rem))] truncate" title={categoria}>
                {categoria}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedBrand} onValueChange={onBrandChange}>
        <SelectTrigger className="w-full min-w-0 overflow-hidden">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          <SelectItem value="todas">
            <span className="block max-w-[min(28rem,calc(100vw-4rem))] truncate" title="Todas as marcas">
              Todas as marcas
            </span>
          </SelectItem>
          {brandOptions.map((marca) => (
            <SelectItem key={marca} value={marca}>
              <span className="block max-w-[min(28rem,calc(100vw-4rem))] truncate" title={marca}>
                {marca}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" onClick={onClear} className="w-full md:w-auto">
        <RotateCcw className="mr-2 h-4 w-4" />
        Limpar
      </Button>
    </div>
  )
}
