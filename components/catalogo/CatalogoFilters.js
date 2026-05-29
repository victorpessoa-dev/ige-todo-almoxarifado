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
    <div className="grid gap-2 md:grid-cols-[1fr_190px_190px_auto] lg:grid-cols-[1fr_240px_240px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por produto, código, aplicação, medida ou marca"
          className="pl-9"
        />
      </div>

      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as categorias</SelectItem>
          {categoryOptions.map((categoria) => (
            <SelectItem key={categoria} value={categoria}>
              {categoria}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedBrand} onValueChange={onBrandChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as marcas</SelectItem>
          {brandOptions.map((marca) => (
            <SelectItem key={marca} value={marca}>
              {marca}
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
