'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function MovementFormFields({ register, handleSubmit, onSubmit, tipo }) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="quantidade">Quantidade</Label>
        <Input
          id="quantidade"
          type="number"
          {...register('quantidade', { required: true, valueAsNumber: true, min: 1 })}
        />
      </div>
      <Button type="submit">Confirmar {tipo === 'entrada' ? 'Entrada' : 'Saída'}</Button>
    </form>
  )
}
