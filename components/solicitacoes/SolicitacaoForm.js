'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS,
  getSolicitacaoStatusDefaults
} from '@/constants/solicitacoes-config'
import { getTodayDateInputValue } from '@/lib/date/date-utils'

export const defaultSolicitacaoForm = {
  nome_item: '',
  descricao: '',
  quantidade: 1,
  prioridade: 'media',
  previsao_desejada: '',
  centro_custo_id: '',
  centro_custo: '',
  centro_custo_nome: '',
  aplicacoes: '',
  link_referencia: '',
  fornecedor_nome: '',
  fornecedor_contato: '',
  solicitante_id: '',
  solicitante: '',
  solicitante_nome: '',
  status_geral: 'nova',
  valor_unitario: '',
  valor_total: '',
  previsao_entrega: '',
  status_cotacao: 'nao_iniciado',
  status_pedido: 'nao_digitado',
  status_transporte: 'producao_separacao',
  produto_id: ''
}

function Field({ label, children }) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="truncate text-sm font-medium leading-none text-foreground" title={label}>{label}</label>
      {children}
    </div>
  )
}

/**
 * Formulario administrativo de criacao de solicitacoes de compra.
 *
 * Centraliza os campos de compra, acompanhamento e vinculacao com solicitante
 * e centro de custo, preservando defaults iguais aos usados nos detalhes.
 */

function Section({ title, children }) {
  return (
    <section className="grid min-w-0 gap-4 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground" title={title}>{title}</h3>
      {children}
    </section>
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

/**
 * Mantem valor unitario e total sincronizados a partir da quantidade.
 *
 * A regra evita que o usuario precise calcular manualmente quando altera
 * quantidade, valor unitario ou valor total.
 */
function completeMoneyFields(form, changedField) {
  const quantidade = Number(form.quantidade || 0)
  const valorUnitario = parseDecimalValue(form.valor_unitario)
  const valorTotal = parseDecimalValue(form.valor_total)
  const nextForm = { ...form }

  if (quantidade <= 0) return nextForm

  if (changedField === 'valor_unitario') {
    nextForm.valor_total = valorUnitario > 0
      ? formatDecimalInput(quantidade * valorUnitario)
      : ''
    return nextForm
  }

  if (changedField === 'valor_total') {
    nextForm.valor_unitario = valorTotal > 0
      ? formatDecimalInput(valorTotal / quantidade)
      : ''
    return nextForm
  }

  if (changedField === 'quantidade') {
    if (valorUnitario > 0) {
      nextForm.valor_total = formatDecimalInput(quantidade * valorUnitario)
    } else if (valorTotal > 0) {
      nextForm.valor_unitario = formatDecimalInput(valorTotal / quantidade)
    }
    return nextForm
  }

  if (valorUnitario > 0 && !valorTotal) {
    nextForm.valor_total = formatDecimalInput(quantidade * valorUnitario)
  }

  if (valorTotal > 0 && !valorUnitario) {
    nextForm.valor_unitario = formatDecimalInput(valorTotal / quantidade)
  }

  return nextForm
}

/**
 * Renderiza o formulario de solicitacao e aplica regras de preenchimento
 * derivadas, como centro de custo do solicitante e defaults de status.
 */
export function SolicitacaoForm({
  form,
  setForm,
  onSubmit,
  submitLabel = 'Enviar solicitação',
  isSubmitting = false,
  mode = 'public',
  showSections = false,
  sectionLayout = 'stack',
  onCancel,
  produtos = [],
  solicitantes = [],
  centrosCusto = []
}) {
  const isAdmin = mode === 'admin'
  const useTabs = showSections && sectionLayout === 'tabs'
  const [activeTab, setActiveTab] = useState('pedido')

  const updateField = (field, value) => {
    const nextForm = {
      ...form,
      [field]: value,
      ...(field === 'status_geral' ? getSolicitacaoStatusDefaults(value) : {})
    }

    if (field === 'status_geral' && value === 'concluida' && !nextForm.previsao_entrega) {
      nextForm.previsao_entrega = getTodayDateInputValue()
    }

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

    if (['quantidade', 'valor_unitario', 'valor_total'].includes(field)) {
      setForm(completeMoneyFields(nextForm, field))
      return
    }

    setForm(nextForm)
  }

  const solicitanteFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome do solicitante">
        <Select
          value={form.solicitante_id || ''}
          onValueChange={(value) => updateField('solicitante_id', value)}
          required={!useTabs}
        >
          <SelectTrigger className="w-full min-w-0 overflow-hidden">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {solicitantes.map((solicitante) => (
              <SelectItem key={solicitante.id} value={solicitante.id}>
                <span
                  className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                  title={[
                    solicitante.nome,
                    getCentroCustoLabel(getSolicitanteCentroCusto(solicitante, centrosCusto))
                  ].filter(Boolean).join(' - ')}
                >
                  {[
                    solicitante.nome,
                    getCentroCustoLabel(getSolicitanteCentroCusto(solicitante, centrosCusto))
                  ].filter(Boolean).join(' - ')}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Centro de custo">
        <Select
          value={form.centro_custo_id || ''}
          onValueChange={(value) => updateField('centro_custo_id', value)}
          required={!useTabs}
        >
          <SelectTrigger className="w-full min-w-0 overflow-hidden">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {centrosCusto.map((centroCusto) => (
              <SelectItem key={centroCusto.id} value={centroCusto.id}>
                <span
                  className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                  title={[centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')}
                >
                  {[centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )

  const itemFields = (
    <>
      <Field label="Nome do item">
        <Input
          className="min-w-0 truncate"
          value={form.nome_item || ''}
          onChange={(event) => updateField('nome_item', event.target.value)}
          placeholder="Ex.: Rolamento 6203, correia A-42, tinta acrilica"
          required={!useTabs}
        />
      </Field>

      <Field label="Descrição do item">
        <Textarea
          className="min-w-0"
          value={form.descricao}
          onChange={(event) => updateField('descricao', event.target.value)}
          rows={4}
          placeholder="Modelo, medida, marca, referência ou observação técnica"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantidade">
          <Input
            className="min-w-0"
            type="number"
            min={1}
            value={form.quantidade}
            onChange={(event) => updateField('quantidade', event.target.value)}
            required={!useTabs}
          />
        </Field>

        <Field label="Prioridade">
          <Select
            value={form.prioridade}
            onValueChange={(value) => updateField('prioridade', value)}
          >
            <SelectTrigger className="w-full min-w-0 overflow-hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
                  <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Previsão desejada">
          <Input
            className="min-w-0"
            type="date"
            value={form.previsao_desejada || ''}
            onChange={(event) => updateField('previsao_desejada', event.target.value)}
          />
        </Field>
      </div>

      <Field label="Aplicação">
        <Textarea
          className="min-w-0"
          value={form.aplicacoes || ''}
          onChange={(event) => updateField('aplicacoes', event.target.value)}
          rows={3}
          placeholder="Onde será usado, máquina, local, cliente ou observação técnica"
        />
      </Field>

      <Field label="Link de referência ou imagem">
        <Input
          className="min-w-0 truncate"
          type="url"
          value={form.link_referencia || ''}
          onChange={(event) => updateField('link_referencia', event.target.value)}
          placeholder="https://..."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do fornecedor (opcional)">
          <Input
            className="min-w-0 truncate"
            value={form.fornecedor_nome || ''}
            onChange={(event) => updateField('fornecedor_nome', event.target.value)}
            placeholder="Fornecedor sugerido"
          />
        </Field>

        <Field label="Contato do fornecedor (opcional)">
          <Input
            className="min-w-0 truncate"
            value={form.fornecedor_contato || ''}
            onChange={(event) => updateField('fornecedor_contato', event.target.value)}
            placeholder="Telefone, WhatsApp, e-mail ou site"
          />
        </Field>
      </div>
    </>
  )

  const adminFields = isAdmin ? (
    <>
      {isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status geral">
              <Select
                value={form.status_geral}
                onValueChange={(value) => updateField('status_geral', value)}
              >
                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                        {option.label}
                      </span>
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
                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  <SelectItem value="sem_produto">
                    <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title="Sem vinculo">
                      Sem vinculo
                    </span>
                  </SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      <span
                        className="block max-w-[min(34rem,calc(100vw-4rem))] truncate"
                        title={`${produto.cod} - ${produto.nome}`}
                      >
                        {produto.cod} - {produto.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Valor unitário">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  className="min-w-0 truncate pl-9"
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
                  className="min-w-0 truncate pl-9"
                  inputMode="decimal"
                  value={form.valor_total || ''}
                  onChange={(event) => updateField('valor_total', event.target.value)}
                  onBlur={(event) => updateField('valor_total', formatDecimalInput(event.target.value))}
                  placeholder="0,00"
                />
              </div>
            </Field>

            <Field label="Previsão de entrega">
              <Input
                className="min-w-0"
                type="date"
                value={form.previsao_entrega || ''}
                onChange={(event) => updateField('previsao_entrega', event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status da cotação">
              <Select
                value={form.status_cotacao}
                onValueChange={(value) => updateField('status_cotacao', value)}
              >
                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_COTACAO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                        {option.label}
                      </span>
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
                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_PEDIDO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                        {option.label}
                      </span>
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
                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOLICITACAO_STATUS_TRANSPORTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="block max-w-[min(34rem,calc(100vw-4rem))] truncate" title={option.label}>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </>
      )}
    </>
  ) : null

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {useTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
          <TabsList className={`grid h-auto w-full gap-1 ${adminFields ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="pedido" className="px-2 text-xs sm:text-sm">
              Pedido
            </TabsTrigger>
            {adminFields && (
              <TabsTrigger value="controle" className="px-2 text-xs sm:text-sm">
                Controle
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pedido" className="grid gap-4">
            <Section title="Solicitante">{solicitanteFields}</Section>
            <Section title="Item solicitado">{itemFields}</Section>
          </TabsContent>

          {adminFields && (
            <TabsContent value="controle">
              <Section title="Controle interno">{adminFields}</Section>
            </TabsContent>
          )}
        </Tabs>
      ) : showSections ? (
        <>
          <Section title="Solicitante">{solicitanteFields}</Section>
          <Section title="Item solicitado">{itemFields}</Section>
          {adminFields && <Section title="Controle interno">{adminFields}</Section>}
        </>
      ) : (
        <>
          {itemFields}
          {solicitanteFields}
          {adminFields}
        </>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
