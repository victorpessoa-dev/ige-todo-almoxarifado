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

      <div className="grid grid-cols-3 gap-4">
        <Input type="number" placeholder="Estoque" {...register('estoque', { valueAsNumber: true })} />
        <Input type="number" placeholder="Min" {...register('min', { valueAsNumber: true })} />
        <Input type="number" placeholder="Máx" {...register('max', { valueAsNumber: true })} />
      </div>

      <Button type="submit">
        {buttonText}
      </Button>
    </form>
  )
}