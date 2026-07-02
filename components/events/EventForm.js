'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PRIORIDADE_OPTIONS, STATUS_OPTIONS } from '@/constants/task-config'
import { toDateInputValue } from '@/lib/date/date-utils'

export default function EventForm({
  form,
  setForm,
  onSubmit,
  typeLocked = null, // 'tarefa' | 'lembrete' | null
  isEditing = false,
  onDelete
}) {
  const isTarefa = (typeLocked || form.type) === 'tarefa'
  const isLembrete = (typeLocked || form.type) === 'lembrete'
  const fieldPrefix = typeLocked || form.type || 'evento'

  return (
    <form onSubmit={onSubmit} className="grid gap-4">

      {!typeLocked && (
        <div className="grid gap-2">
          <label id={`${fieldPrefix}-tipo-label`} className="text-sm font-medium">Tipo</label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm({ ...form, type: value })
            }
          >
            <SelectTrigger aria-labelledby={`${fieldPrefix}-tipo-label`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tarefa">Tarefa</SelectItem>
              <SelectItem value="lembrete">Lembrete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor={`${fieldPrefix}-titulo`} className="text-sm font-medium">Titulo</label>
        <Input
          id={`${fieldPrefix}-titulo`}
          value={form.titulo}
          onChange={(e) =>
            setForm({ ...form, titulo: e.target.value })
          }
          placeholder="Digite o titulo"
          required
        />
      </div>

      {isTarefa ? (
        <>
          <div className="grid gap-2">
            <label htmlFor={`${fieldPrefix}-descricao`} className="text-sm font-medium">Descricao</label>
            <Textarea
              id={`${fieldPrefix}-descricao`}
              value={form.descricao}
              onChange={(e) =>
                setForm({ ...form, descricao: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor={`${fieldPrefix}-responsavel`} className="text-sm font-medium">Responsavel</label>
            <Input
              id={`${fieldPrefix}-responsavel`}
              value={form.responsavel}
              onChange={(e) =>
                setForm({ ...form, responsavel: e.target.value })
              }
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-2">
            <label htmlFor={`${fieldPrefix}-conteudo`} className="text-sm font-medium">Conteudo</label>
            <Textarea
              id={`${fieldPrefix}-conteudo`}
              value={form.conteudo}
              onChange={(e) =>
                setForm({ ...form, conteudo: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor={`${fieldPrefix}-destinatario`} className="text-sm font-medium">Destinatario</label>
            <Input
              id={`${fieldPrefix}-destinatario`}
              value={form.destinatario}
              onChange={(e) =>
                setForm({ ...form, destinatario: e.target.value })
              }
            />
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor={`${fieldPrefix}-data`} className="text-sm font-medium">Data</label>
          <Input
            id={`${fieldPrefix}-data`}
            type="date"
            value={toDateInputValue(form.data)}
            onChange={(e) =>
              setForm({ ...form, data: e.target.value || null })
            }
          />
        </div>

        <div className="grid gap-2">
          <label id={`${fieldPrefix}-prioridade-label`} className="text-sm font-medium">Prioridade</label>
          <Select
            value={form.prioridade}
            onValueChange={(v) =>
              setForm({ ...form, prioridade: v })
            }
          >
            <SelectTrigger aria-labelledby={`${fieldPrefix}-prioridade-label`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <label id={`${fieldPrefix}-status-label`} className="text-sm font-medium">Status</label>
        <Select
          value={form.status}
          onValueChange={(v) =>
            setForm({ ...form, status: v })
          }
        >
          <SelectTrigger aria-labelledby={`${fieldPrefix}-status-label`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        {isEditing && onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Excluir
          </Button>
        )}

        <Button type="submit">
          {isEditing ? 'Salvar alteracoes' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
