'use client'

import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

export function CheckboxFilter({
  label,
  allLabel,
  options,
  value,
  onChange,
  className = ''
}) {
  const selectedValues = Array.isArray(value) ? value : []
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label)

  const buttonLabel =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selecionados`

  const toggleOption = (optionValue, checked) => {
    onChange(
      checked
        ? [...selectedValues, optionValue]
        : selectedValues.filter((item) => item !== optionValue)
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`h-10 w-full justify-between bg-background px-3 font-normal ${className}`}
          aria-label={`Filtrar por ${label}`}
        >
          <span className="truncate">{buttonLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-2"
      >
        <div className="max-h-72 space-y-1 overflow-y-auto">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
            <Checkbox
              checked={selectedValues.length === 0}
              onCheckedChange={() => onChange([])}
            />
            <span>{allLabel}</span>
          </label>

          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) =>
                  toggleOption(option.value, checked === true)
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
