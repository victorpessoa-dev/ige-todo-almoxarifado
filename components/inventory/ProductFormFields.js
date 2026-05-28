'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProductFormFields({
  register,
  handleSubmit,
  onSubmit,
  buttonText,
  watch,
  setValue
}) {
  const cod = watch ? watch('cod') : ''

  useEffect(() => {
    if (!cod) return

    setValue('cod_barra', String(cod))
  }, [cod, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Código</Label>
        <Input {...register('cod', { required: true })} />
      </div>

      <div>
        <Label>Nome</Label>
        <Input {...register('nome', { required: true })} />
      </div>

      <div>
        <Label>Código de Barras</Label>
        <Input {...register('cod_barra')} readOnly />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Estoque</Label>
          <Input
            type="number"
            min={0}
            {...register('estoque', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Min</Label>
          <Input
            type="number"
            min={0}
            {...register('min', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Max</Label>
          <Input
            type="number"
            min={0}
            {...register('max', { valueAsNumber: true })}
          />
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        {buttonText}
      </Button>
    </form>
  )
}
