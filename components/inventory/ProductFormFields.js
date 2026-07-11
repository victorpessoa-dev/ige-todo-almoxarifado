'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Input {...register('categoria')} />
        </div>

        <div className="space-y-2">
          <Label>Medidas</Label>
          <Input {...register('medidas')} />
        </div>
      </div>

      <div>
        <Label>Aplicação</Label>
        <Textarea {...register('aplicacao')} rows={3} />
      </div>

      <div>
        <Label>Marcas disponíveis</Label>
        <Input
          placeholder="Ex.: Condor, Tigre; Atlas / Vonder"
          {...register('marcas')}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Para mais de uma marca, separe por vírgula, ponto e vírgula ou barra. Ex.: Condor, Tigre; Atlas / Vonder.
        </p>
      </div>

      <div>
        <Label>Link da imagem técnica</Label>
        <Input
          type="url"
          placeholder="https://..."
          {...register('img_url')}
        />
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
