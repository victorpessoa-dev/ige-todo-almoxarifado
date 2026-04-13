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

    const barcode = String(cod)
    setValue('cod_barra', barcode)

    setValue && setValue('cod_barra', barcode)
  }, [cod, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      
      <div>
        <Label htmlFor="cod">Código</Label>
        <Input id="cod" {...register('cod', { required: true })} />
      </div>

      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register('nome', { required: true })} />
      </div>

      <div>
        <Label htmlFor="cod_barra">Código de Barras</Label>
        <Input
          id="cod_barra"
          {...register('cod_barra', { required: true })}
          readOnly
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="max">Máximo</Label>
          <Input id="max" type="number" {...register('max', { required: true, valueAsNumber: true })} />
        </div>
        <div>
          <Label htmlFor="min">Mínimo</Label>
          <Input id="min" type="number" {...register('min', { required: true, valueAsNumber: true })} />
        </div>
        <div>
          <Label htmlFor="estoque">Estoque</Label>
          <Input id="estoque" type="number" {...register('estoque', { required: true, valueAsNumber: true })} />
        </div>
      </div>

      <Button type="submit">{buttonText}</Button>
    </form>
  )
}