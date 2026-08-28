'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CalendarDays, Check, ClipboardCheck, Clock3, ListPlus, PackagePlus, Play, Plus, Save, Trash2, X } from 'lucide-react'
import { useData } from '@/contexts/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { LoadingState } from '@/components/ui/spinner'
import { PushNotificationToggle } from '@/components/push/PushNotificationToggle'
import {
  addPendenciasToSolicitacao,
  concluirRevisao,
  createSolicitacaoFromPendencias,
  deleteRotinaRevisao,
  listPendenciasReposicao,
  listRevisoesAbertas,
  listRotinasRevisao,
  processarRotinasRevisao,
  replaceChecklistItems,
  saveRotinaRevisao,
  updateReviewItem
} from '@/lib/services/revisoes-service'
import { getUserMessage } from '@/lib/messaging/user-messages'
import { sortReviewItems } from '@/lib/revisoes/priority'

const initialForm = {
  nome: '', tipo: 'produtos', categoria: '', categorias: [], horario: '09:00', frequencia: 'diaria', intervalo_dias: 1,
  dias_bloqueados: [0], foco: 'inteligente', repetir_notificacao_minutos: 10, janela_revisao: 480, ativo: true
}
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatDate(value) {
  return value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'
}

function getRoutineCategories(routine) {
  const categories = Array.isArray(routine?.categorias) ? routine.categorias : []
  return [...new Set((categories.length ? categories : [routine?.categoria]).map((category) => String(category || '').trim()).filter(Boolean))]
}

export default function RevisoesPage() {
  const { produtos, solicitacoesCompra, solicitantesCompra, centrosCusto, isLoaded } = useData()
  const [rotinas, setRotinas] = useState([])
  const [revisoes, setRevisoes] = useState([])
  const [pendencias, setPendencias] = useState([])
  const [form, setForm] = useState(initialForm)
  const [checklist, setChecklist] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false)
  const [routineToDelete, setRoutineToDelete] = useState(null)
  const [selectedReview, setSelectedReview] = useState(null)
  const [selectedRoutineProducts, setSelectedRoutineProducts] = useState(null)
  const [selectedPendencias, setSelectedPendencias] = useState([])
  const [targetSolicitacao, setTargetSolicitacao] = useState('nova')
  const [newList, setNewList] = useState({ nome_lista: '', solicitante_id: '', centro_custo_id: '', prioridade: 'alta' })
  const [loading, setLoading] = useState(true)
  const categories = useMemo(() => [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort(), [produtos])

  const getRoutineProducts = (routine) => {
    if (routine.tipo !== 'produtos') return []
    const selectedCategories = new Set(getRoutineCategories(routine).map((category) => category.toLocaleLowerCase('pt-BR')))
    return produtos.filter((product) => selectedCategories.has(String(product.categoria || '').trim().toLocaleLowerCase('pt-BR')))
  }

  const isLowStock = (product) => Number(product.estoque || 0) <= Number(product.min || 0)

  const reload = async () => {
    setLoading(true)
    try {
      await processarRotinasRevisao()
      const [nextRotinas, nextRevisoes, nextPendencias] = await Promise.all([listRotinasRevisao(), listRevisoesAbertas(), listPendenciasReposicao()])
      setRotinas(nextRotinas)
      setRevisoes(nextRevisoes)
      setPendencias(nextPendencias)
      setSelectedReview((current) => {
        const reviewId = new URLSearchParams(window.location.search).get('revisao') || current?.id
        return reviewId ? nextRevisoes.find((item) => item.id === reviewId) || null : null
      })
    } catch (error) {
      toast.error(getUserMessage(error, 'Não foi possível carregar as revisões.'))
    } finally { setLoading(false) }
  }

  useEffect(() => { if (isLoaded) reload() }, [isLoaded])

  const summary = useMemo(() => ({
    pendentes: revisoes.filter((r) => r.status === 'pendente').length,
    andamento: revisoes.filter((r) => r.status === 'em_andamento').length,
    atrasadas: revisoes.filter((r) => r.status === 'atrasada').length,
    emFalta: pendencias.filter((i) => i.status === 'em_falta').length,
    reposicao: pendencias.length
  }), [revisoes, pendencias])

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const toggleBlockedDay = (day) => updateForm('dias_bloqueados', form.dias_bloqueados.includes(day) ? form.dias_bloqueados.filter((item) => item !== day) : [...form.dias_bloqueados, day])
  const toggleCategory = (category) => updateForm('categorias', form.categorias.includes(category) ? form.categorias.filter((item) => item !== category) : [...form.categorias, category])

  const resetForm = () => { setForm(initialForm); setChecklist([]); setEditingId(null) }
  const submitRoutine = async (event) => {
    event.preventDefault()
    try {
      const routine = await saveRotinaRevisao(form, editingId)
      if (form.tipo === 'checklist') await replaceChecklistItems(routine.id, checklist)
      const cachedRoutine = { ...routine, itens_checklist_revisao: form.tipo === 'checklist' ? checklist : routine.itens_checklist_revisao || [] }
      setRotinas((current) => (editingId ? current.map((item) => item.id === routine.id ? cachedRoutine : item) : [...current, cachedRoutine]).sort((a, b) => new Date(a.proxima_execucao) - new Date(b.proxima_execucao)))
      toast.success(editingId ? 'Rotina atualizada.' : 'Rotina criada.')
      resetForm(); setRoutineDialogOpen(false)
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível salvar a rotina.')) }
  }
  const editRoutine = (routine) => {
    setEditingId(routine.id)
    setForm({ ...initialForm, ...routine, categorias: getRoutineCategories(routine), dias_bloqueados: routine.dias_bloqueados || [] })
    setChecklist((routine.itens_checklist_revisao || []).sort((a, b) => a.ordem - b.ordem))
    setRoutineDialogOpen(true)
  }
  const removeRoutine = async () => {
    if (!routineToDelete) return
    try {
      await deleteRotinaRevisao(routineToDelete.id)
      setRotinas((current) => current.filter((item) => item.id !== routineToDelete.id))
      setRoutineToDelete(null)
      toast.success('Rotina excluída.')
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível excluir a rotina.')) }
  }
  const treatItem = async (item, status) => {
    try {
      await updateReviewItem(item.id, status, item.observacao)
      const updateReview = (review) => review.id !== item.revisao_id ? review : { ...review, status: 'em_andamento', revisoes_estoque_itens: review.revisoes_estoque_itens.map((current) => current.id === item.id ? { ...current, status } : current) }
      setSelectedReview((review) => review ? updateReview(review) : review)
      setRevisoes((current) => current.map(updateReview))
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível registrar o item.')) }
  }
  const finishReview = async (review) => {
    try {
      await concluirRevisao(review.id)
      setRevisoes((current) => current.filter((item) => item.id !== review.id))
      setSelectedReview(null)
      toast.success('Revisão concluída. Pendências de reposição foram mantidas.')
    } catch (error) { toast.error(getUserMessage(error, 'Trate todos os itens antes de concluir.')) }
  }
  const togglePending = (id) => setSelectedPendencias((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const movePendencias = async () => {
    const selected = pendencias.filter((item) => selectedPendencias.includes(item.id))
    if (!selected.length) return toast.error('Selecione os itens para reposição.')
    try {
      if (targetSolicitacao === 'nova') {
        await createSolicitacaoFromPendencias(newList, selected)
      } else {
        await addPendenciasToSolicitacao(targetSolicitacao, selected)
      }
      setPendencias((current) => current.filter((item) => !selectedPendencias.includes(item.id)))
      setSelectedPendencias([])
      toast.success('Itens adicionados à solicitação.')
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível adicionar os itens.')) }
  }

  if (!isLoaded || loading) return <LoadingState className="min-h-[60vh]" />

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><h1 className="flex items-center gap-3 text-2xl font-bold"><ClipboardCheck className="text-primary" /> Revisões</h1><p className="mt-1 text-sm text-muted-foreground">Rotinas de conferência, pendências e reposição sem alterar o estoque.</p></div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end"><PushNotificationToggle /><Button variant="outline" onClick={() => window.location.assign('/calendario')}><CalendarDays className="h-4 w-4" /> Calendário</Button><Button variant="outline" onClick={reload}><Clock3 className="h-4 w-4" /> Atualizar</Button></div></header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[['Pendentes', summary.pendentes, 'border-t-amber-500'], ['Em andamento', summary.andamento, 'border-t-primary'], ['Atrasadas', summary.atrasadas, 'border-t-destructive'], ['Em falta', summary.emFalta, 'border-t-destructive'], ['Aguardando reposição', summary.reposicao, 'border-t-emerald-500']].map(([label, value, tone]) => <Card key={label} className={'border-t-4 ' + tone}><CardContent className="p-4"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{value}</p></CardContent></Card>)}
    </div>

    <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Rotinas e revisões</h2><p className="text-sm text-muted-foreground">Crie rotinas e execute as conferências que já estão programadas.</p></div><Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}><DialogTrigger asChild><Button className="w-full sm:w-auto" onClick={() => { resetForm(); setRoutineDialogOpen(true) }}><Plus className="h-4 w-4" /> Criar rotina</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{editingId ? 'Editar rotina' : 'Nova rotina de revisão'}</DialogTitle></DialogHeader><Card className="border-0 shadow-none"><CardContent className="px-0">
      <form onSubmit={submitRoutine} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => updateForm('nome', e.target.value)} placeholder="Ex.: Revisar Correias" required /></div>
        <div className="space-y-2"><Label>Tipo</Label><Select value={form.tipo} onValueChange={(value) => updateForm('tipo', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produtos">Produtos por categoria</SelectItem><SelectItem value="checklist">Checklist manual</SelectItem></SelectContent></Select></div>
        {form.tipo === 'produtos' && <div className="space-y-2 md:col-span-2"><div className="flex items-center justify-between gap-3"><Label>Categorias</Label><span className="text-xs text-muted-foreground">{form.categorias.length} selecionada{form.categorias.length === 1 ? '' : 's'}</span></div><div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">{categories.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p> : categories.map((category) => <Button key={category} type="button" size="sm" variant={form.categorias.includes(category) ? 'default' : 'outline'} onClick={() => toggleCategory(category)}>{category}</Button>)}</div><p className="text-xs text-muted-foreground">Selecione uma ou mais categorias para incluir todos os produtos correspondentes na revisão.</p></div>}
        <div className="space-y-2"><Label>Horário</Label><Input type="time" value={form.horario} onChange={(e) => updateForm('horario', e.target.value)} /></div>
        <div className="space-y-2"><Label>Frequência</Label><Select value={form.frequencia} onValueChange={(value) => updateForm('frequencia', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="diaria">Diária</SelectItem><SelectItem value="intervalo_dias">A cada X dias</SelectItem><SelectItem value="semanal">Semanal</SelectItem></SelectContent></Select></div>
        {form.frequencia === 'intervalo_dias' && <div className="space-y-2"><Label>Intervalo em dias</Label><Input type="number" min="1" value={form.intervalo_dias} onChange={(e) => updateForm('intervalo_dias', e.target.value)} /></div>}
        <div className="space-y-2"><Label>Foco</Label><Select value={form.foco} onValueChange={(value) => updateForm('foco', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inteligente">Inteligente (recomendado)</SelectItem><SelectItem value="estoque_baixo">Estoque baixo</SelectItem><SelectItem value="pendencias">Pendências</SelectItem><SelectItem value="completa">Completa</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Repetir notificação (minutos)</Label><Input type="number" min="5" value={form.repetir_notificacao_minutos} onChange={(e) => updateForm('repetir_notificacao_minutos', e.target.value)} /></div>
        <div className="space-y-2"><Label>Janela de revisão (minutos)</Label><Input type="number" min="30" value={form.janela_revisao} onChange={(e) => updateForm('janela_revisao', e.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Dias bloqueados</Label><div className="flex flex-wrap gap-2">{weekDays.map((day, index) => <Button key={day} type="button" variant={form.dias_bloqueados.includes(index) ? 'default' : 'outline'} size="sm" onClick={() => toggleBlockedDay(index)}>{day}</Button>)}</div></div>
        <div className="flex items-center gap-3"><Switch checked={form.ativo} onCheckedChange={(value) => updateForm('ativo', value)} /><Label>Rotina ativa</Label></div>
        {form.tipo === 'checklist' && <div className="space-y-3 md:col-span-2"><div className="flex items-center justify-between"><Label>Itens do checklist</Label><Button type="button" size="sm" variant="outline" onClick={() => setChecklist((items) => [...items, { nome: '', descricao: '', ativo: true }])}><Plus className="h-4 w-4" /> Adicionar item</Button></div>{checklist.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"><Input value={item.nome} placeholder="Nome" onChange={(e) => setChecklist((items) => items.map((current, i) => i === index ? { ...current, nome: e.target.value } : current))} /><Input value={item.descricao || ''} placeholder="Descrição opcional" onChange={(e) => setChecklist((items) => items.map((current, i) => i === index ? { ...current, descricao: e.target.value } : current))} /><Button type="button" variant="ghost" size="icon" onClick={() => setChecklist((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2"><Button type="submit"><Save className="h-4 w-4" /> {editingId ? 'Salvar alterações' : 'Criar rotina'}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}</div>
      </form>
    </CardContent></Card></DialogContent></Dialog></div>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Rotinas configuradas</CardTitle><p className="text-sm text-muted-foreground">Defina o que deve ser conferido e quando.</p></CardHeader><CardContent className="space-y-3">{rotinas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma rotina criada.</p> : rotinas.map((routine) => { const routineProducts = getRoutineProducts(routine); const lowStockProducts = routineProducts.filter(isLowStock); return <div key={routine.id} className="rounded-xl border p-4 transition-colors hover:bg-muted/40"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{routine.nome}</p><p className="text-sm text-muted-foreground">{routine.tipo === 'produtos' ? `${routine.categoria} · ${routineProducts.length} produtos${lowStockProducts.length ? ` · ${lowStockProducts.length} com estoque baixo` : ''}` : `${routine.itens_checklist_revisao?.length || 0} itens`} · {routine.horario?.slice(0, 5)} · próxima: {formatDate(routine.proxima_execucao)}</p></div><div className="flex shrink-0 flex-wrap justify-end gap-1">{routine.tipo === 'produtos' && <Button size="sm" variant="outline" onClick={() => setSelectedRoutineProducts({ routine, products: routineProducts })}>Ver itens</Button>}<Button size="sm" variant="outline" onClick={() => editRoutine(routine)}>Editar</Button><Button size="icon" variant="ghost" onClick={() => setRoutineToDelete(routine)}><Trash2 className="h-4 w-4" /></Button></div></div></div> })}</CardContent></Card>
      <Card className="border-primary/30"><CardHeader className="border-b bg-primary/5"><CardTitle>Revisões para realizar</CardTitle><p className="text-sm text-muted-foreground">Comece por pendências e retome o que ficou em andamento.</p></CardHeader><CardContent className="space-y-3">{revisoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma revisão pendente.</p> : revisoes.map((review) => { const items = review.revisoes_estoque_itens || []; const done = items.filter((item) => item.status !== 'pendente').length; return <div key={review.id} className="rounded-xl border p-4 transition-colors hover:bg-muted/40"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{review.rotinas_revisao?.nome}</p><p className="text-sm text-muted-foreground">{review.status} · {done}/{items.length} tratados · {formatDate(review.agendada_para)}</p></div><Button className="w-full shrink-0 sm:w-auto" size="sm" onClick={() => setSelectedReview(review)}><Play className="h-4 w-4" /> {review.status === 'em_andamento' ? 'Continuar' : 'Revisar'}</Button></div></div>})}</CardContent></Card></section>

    {selectedReview && <Card className="border-primary/40"><CardHeader><div className="flex items-center justify-between"><CardTitle>Revisar {selectedReview.rotinas_revisao?.nome}</CardTitle><Button variant="ghost" size="icon" onClick={() => setSelectedReview(null)}><X className="h-4 w-4" /></Button></div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Todos os itens precisam receber um resultado para concluir. O estoque não é alterado.</p>{sortReviewItems(selectedReview.revisoes_estoque_itens || []).map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-semibold">{item.nome_snapshot}</p>{item.produtos && <p className="text-sm text-muted-foreground">Estoque: {item.produtos.estoque} · mínimo: {item.produtos.min}</p>}<p className="mt-1 text-xs uppercase text-muted-foreground">{item.status}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => treatItem(item, 'ok')}><Check className="h-4 w-4" /> OK</Button><Button size="sm" variant="outline" onClick={() => treatItem(item, 'repor')}><PackagePlus className="h-4 w-4" /> Repor</Button><Button size="sm" variant="destructive" onClick={() => treatItem(item, 'em_falta')}><AlertTriangle className="h-4 w-4" /> Em falta</Button></div></div><Textarea className="mt-3" placeholder="Observação opcional" value={item.observacao || ''} onChange={(e) => setSelectedReview((review) => ({ ...review, revisoes_estoque_itens: review.revisoes_estoque_itens.map((current) => current.id === item.id ? { ...current, observacao: e.target.value } : current) }))} /></div>)}<div className="flex border-t pt-4 sm:justify-end"><Button className="w-full sm:w-auto" onClick={() => finishReview(selectedReview)}>Concluir revisão</Button></div></CardContent></Card>}

    <AlertDialog open={Boolean(routineToDelete)} onOpenChange={(open) => !open && setRoutineToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir rotina?</AlertDialogTitle><AlertDialogDescription>Esta ação excluirá a rotina “{routineToDelete?.nome}” e as revisões abertas associadas. Não é possível desfazer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={removeRoutine}>Excluir rotina</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <Dialog open={Boolean(selectedRoutineProducts)} onOpenChange={(open) => !open && setSelectedRoutineProducts(null)}><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Itens de {selectedRoutineProducts?.routine.nome}</DialogTitle></DialogHeader>{selectedRoutineProducts?.products.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto encontrado nesta categoria.</p> : <div className="space-y-2">{selectedRoutineProducts?.products.map((product) => { const lowStock = isLowStock(product); return <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{product.nome}</p><p className="text-sm text-muted-foreground">Código: {product.cod || '-'} · Estoque: {product.estoque} · Mínimo: {product.min}</p></div>{lowStock && <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Estoque baixo</span>}</div> })}</div>}</DialogContent></Dialog>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ListPlus className="h-5 w-5" /> Aguardando reposição</CardTitle></CardHeader><CardContent className="space-y-4">{pendencias.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item aguardando inclusão em solicitação.</p> : <><div className="space-y-2">{pendencias.map((item) => <label key={item.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3"><span><input className="mr-3" type="checkbox" checked={selectedPendencias.includes(item.id)} onChange={() => togglePending(item.id)} />{item.nome_snapshot} <span className={item.status === 'em_falta' ? 'font-semibold text-destructive' : 'text-muted-foreground'}>— {item.status === 'em_falta' ? 'EM FALTA' : 'REPOR'}</span></span><span className="text-xs text-muted-foreground">{item.revisoes_estoque?.rotinas_revisao?.nome}</span></label>)}</div><div className="grid gap-3 rounded-xl bg-muted/30 p-3 md:grid-cols-2"><div className="space-y-2"><Label>Destino</Label><Select value={targetSolicitacao} onValueChange={setTargetSolicitacao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nova">Criar nova solicitação</SelectItem>{solicitacoesCompra.map((request) => <SelectItem key={request.id} value={request.id}>{request.codigo || request.nome_item}</SelectItem>)}</SelectContent></Select></div>{targetSolicitacao === 'nova' && <><div className="space-y-2"><Label>Nome da nova solicitação</Label><Input value={newList.nome_lista} onChange={(e) => setNewList((current) => ({ ...current, nome_lista: e.target.value }))} placeholder="Compra Oficina" /></div><div className="space-y-2"><Label>Solicitante</Label><Select value={newList.solicitante_id || undefined} onValueChange={(value) => setNewList((current) => ({ ...current, solicitante_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{solicitantesCompra.map((person) => <SelectItem key={person.id} value={person.id}>{person.nome}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Centro de custo</Label><Select value={newList.centro_custo_id || undefined} onValueChange={(value) => setNewList((current) => ({ ...current, centro_custo_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{centrosCusto.map((center) => <SelectItem key={center.id} value={center.id}>{center.nome}</SelectItem>)}</SelectContent></Select></div></>}<div className="flex items-end md:justify-end"><Button className="w-full md:w-auto" onClick={movePendencias}>Adicionar à solicitação</Button></div></div></>}</CardContent></Card>
  </div>
}

