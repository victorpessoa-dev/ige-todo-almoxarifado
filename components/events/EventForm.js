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
import { toDateInputValue } from '@/lib/date-utils'

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

  return (
    <form onSubmit={onSubmit} className="grid gap-4">

      {!typeLocked && (
        <div className="grid gap-2">
          <label className="text-sm font-medium">Tipo</label>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm({ ...form, type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tarefa">Tarefa</SelectItem>
              <SelectItem value="lembrete">Lembrete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* título */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Título</label>
        <Input
          value={form.titulo}
          onChange={(e) =>
            setForm({ ...form, titulo: e.target.value })
          }
          placeholder="Digite o título"
          required
        />
      </div>

      {isTarefa ? (
        <>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={form.descricao}
              onChange={(e) =>
                setForm({ ...form, descricao: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Responsável</label>
            <Input
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
            <label className="text-sm font-medium">Conteúdo</label>
            <Textarea
              value={form.conteudo}
              onChange={(e) =>
                setForm({ ...form, conteudo: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Destinatário</label>
            <Input
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
          <label className="text-sm font-medium">Data</label>
          <Input
            type="date"
            value={toDateInputValue(form.data)}
            onChange={(e) =>
              setForm({ ...form, data: e.target.value || null })
            }
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Prioridade</label>
          <Select
            value={form.prioridade}
            onValueChange={(v) =>
              setForm({ ...form, prioridade: v })
            }
          >
            <SelectTrigger>
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
        <label className="text-sm font-medium">Status</label>
        <Select
          value={form.status}
          onValueChange={(v) =>
            setForm({ ...form, status: v })
          }
        >
          <SelectTrigger>
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
          {isEditing ? 'Salvar alterações' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
