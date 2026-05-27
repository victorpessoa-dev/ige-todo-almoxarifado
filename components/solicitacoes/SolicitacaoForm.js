'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS
} from '@/constants/solicitacoes-config'

export const defaultSolicitacaoForm = {
  descricao: '',
  quantidade: 1,
  prioridade: 'media',
  previsao_desejada: '',
  centro_custo_id: '',
  centro_custo: '',
  centro_custo_nome: '',
  aplicacoes: '',
  link_referencia: '',
  solicitante_id: '',
  solicitante: '',
  solicitante_nome: '',
  status_geral: 'nova',
  valor_unitario: '',
  valor_total: '',
  previsao_entrega: '',
  pedido: '',
  nota_fiscal: '',
  status_cotacao: 'nao_iniciado',
  status_pedido: 'nao_digitado',
  status_transporte: 'producao_separacao',
  produto_id: ''
}

function Field({ label, children }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function getCentroCustoLabel(centroCusto) {
  if (!centroCusto) return ''
  return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')
}

function getSolicitanteCentroCusto(solicitante, centrosCusto) {
  if (!solicitante?.centro_custo_id) return null

  return (
    centrosCusto.find((item) => item.id === solicitante.centro_custo_id) ||
    solicitante.centros_custo ||
    null
  )
}

function parseDecimalValue(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value

  const cleanValue = String(value).trim().replace(/[^\d,.-]/g, '')
  const normalizedValue = cleanValue.includes(',')
    ? cleanValue.replace(/\./g, '').replace(',', '.')
    : cleanValue
  const number = Number(normalizedValue)

  return Number.isFinite(number) ? number : 0
}

function formatDecimalInput(value) {
  const number = parseDecimalValue(value)
  if (!number) return ''

  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function SolicitacaoForm({
  form,
  setForm,
  onSubmit,
  submitLabel = 'Enviar solicitacao',
  isSubmitting = false,
  mode = 'public',
  produtos = [],
  solicitantes = [],
  centrosCusto = []
}) {
  const isAdmin = mode === 'admin'
  const quantidade = Number(form.quantidade || 0)
  const valorUnitario = parseDecimalValue(form.valor_unitario)
  const computedTotal = quantidade > 0 && valorUnitario > 0
    ? formatDecimalInput(quantidade * valorUnitario)
    : ''

  const updateField = (field, value) => {
    const nextForm = { ...form, [field]: value }

    if (field === 'solicitante_id') {
      const solicitante = solicitantes.find((item) => item.id === value)
      nextForm.solicitante = solicitante?.nome || ''
      nextForm.solicitante_nome = solicitante?.nome || ''

      const centroCusto = getSolicitanteCentroCusto(solicitante, centrosCusto)
      if (centroCusto) {
        const label = getCentroCustoLabel(centroCusto)
        nextForm.centro_custo_id = centroCusto.id
        nextForm.centro_custo = label
        nextForm.centro_custo_nome = label
      }
    }

    if (field === 'centro_custo_id') {
      const centroCusto = centrosCusto.find((item) => item.id === value)
      const label = getCentroCustoLabel(centroCusto)
      nextForm.centro_custo = label
      nextForm.centro_custo_nome = label
    }

    if (field === 'quantidade' || field === 'valor_unitario') {
      const nextQuantidade = Number(
        field === 'quantidade' ? value : nextForm.quantidade || 0
      )
      const nextValorUnitario = parseDecimalValue(
        field === 'valor_unitario' ? value : nextForm.valor_unitario || 0
      )

      nextForm.valor_total =
        nextQuantidade > 0 && nextValorUnitario > 0
          ? formatDecimalInput(nextQuantidade * nextValorUnitario)
          : ''
    }

    setForm(nextForm)
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Descricao do item">
        <Textarea
          value={form.descricao}
          onChange={(event) => updateField('descricao', event.target.value)}
          rows={4}
          placeholder="Informe o item, modelo, medida, marca ou referencia"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantidade">
          <Input
            type="number"
            min={1}
            value={form.quantidade}
            onChange={(event) => updateField('quantidade', event.target.value)}
            required
          />
        </Field>

        <Field label="Prioridade">
          <Select
            value={form.prioridade}
            onValueChange={(value) => updateField('prioridade', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Previsao desejada">
          <Input
            type="date"
            value={form.previsao_desejada || ''}
            onChange={(event) => updateField('previsao_desejada', event.target.value)}
          />
        </Field>

        <Field label="Centro de custo">
          <Select
            value={form.centro_custo_id || ''}
            onValueChange={(value) => updateField('centro_custo_id', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {centrosCusto.map((centroCusto) => (
                <SelectItem key={centroCusto.id} value={centroCusto.id}>
                  {[centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Aplicacoes especificas">
        <Textarea
          value={form.aplicacoes || ''}
          onChange={(event) => updateField('aplicacoes', event.target.value)}
          rows={3}
          placeholder="Onde sera usado, maquina, local, cliente ou observacao tecnica"
        />
      </Field>

      <Field label="Link de referencia ou imagem">
        <Input
          type="url"
          value={form.link_referencia || ''}
          onChange={(event) => updateField('link_referencia', event.target.value)}
          placeholder="https://..."
        />
      </Field>

      <Field label="Nome do solicitante">
        <Select
          value={form.solicitante_id || ''}
          onValueChange={(value) => updateField('solicitante_id', value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {solicitantes.map((solicitante) => (
              <SelectItem key={solicitante.id} value={solicitante.id}>
                {[
                  solicitante.nome,
                  getCentroCustoLabel(getSolicitanteCentroCusto(solicitante, centrosCusto))
                ].filter(Boolean).join(' - ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status geral">
              <Select
                value={form.status_geral}
                onValueChange={(value) => updateField('status_geral', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Produto vinculado">
              <Select
                value={form.produto_id || 'sem_produto'}
                onValueChange={(value) =>
                  updateField('produto_id', value === 'sem_produto' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_produto">Sem vinculo</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.cod} - {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Valor unitario">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  className="pl-9"
                  inputMode="decimal"
                  value={form.valor_unitario || ''}
                  onChange={(event) => updateField('valor_unitario', event.target.value)}
                  onBlur={(event) => updateField('valor_unitario', formatDecimalInput(event.target.value))}
                  placeholder="0,00"
                />
              </div>
            </Field>

            <Field label="Valor total">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  className="pl-9"
                  inputMode="decimal"
                  value={form.valor_total === '' ? computedTotal : form.valor_total}
                  onChange={(event) => updateField('valor_total', event.target.value)}
                  onBlur={(event) => updateField('valor_total', formatDecimalInput(event.target.value))}
                  placeholder="0,00"
                />
              </div>
            </Field>

            <Field label="Previsao de entrega">
              <Input
                type="date"
                value={form.previsao_entrega || ''}
                onChange={(event) => updateField('previsao_entrega', event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pedido">
              <Input
                value={form.pedido || ''}
                onChange={(event) => updateField('pedido', event.target.value)}
              />
            </Field>

            <Field label="Nota fiscal">
              <Input
                value={form.nota_fiscal || ''}
                onChange={(event) => updateField('nota_fiscal', event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status da cotacao">
              <Select
                value={form.status_cotacao}
                onValueChange={(value) => updateField('status_cotacao', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_COTACAO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status do pedido">
              <Select
                value={form.status_pedido}
                onValueChange={(value) => updateField('status_pedido', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_PEDIDO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status do transporte">
              <Select
                value={form.status_transporte}
                onValueChange={(value) => updateField('status_transporte', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_TRANSPORTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : submitLabel}
      </Button>
    </form>
  )
}
