import { RotateCcw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CheckboxFilter } from '@/components/ui/checkbox-filter'
import { Input } from '@/components/ui/input'

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

      <CheckboxFilter
        label="categoria"
        allLabel="Todas as categorias"
        options={categoryOptions.map((categoria) => ({
          value: categoria,
          label: categoria
        }))}
        value={selectedCategory}
        onChange={onCategoryChange}
      />

      <CheckboxFilter
        label="marca"
        allLabel="Todas as marcas"
        options={brandOptions.map((marca) => ({
          value: marca,
          label: marca
        }))}
        value={selectedBrand}
        onChange={onBrandChange}
      />

      <Button type="button" variant="outline" onClick={onClear} className="w-full md:w-auto">
        <RotateCcw className="mr-2 h-4 w-4" />
        Limpar
      </Button>
    </div>
  )
}
