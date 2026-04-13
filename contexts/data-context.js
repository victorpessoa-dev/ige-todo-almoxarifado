'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [tarefas, setTarefas] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  async function loadData() {
    const { data: tarefasData } = await supabase
      .from('tarefas')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: lembretesData } = await supabase
      .from('lembretes')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: produtosData } = await supabase
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true })

    const { data: movimentacoesData } = await supabase
      .from('movimentacoes_estoque')
      .select(`
        *,
        produtos (
          nome,
          cod
        )
      `)
      .order('created_at', { ascending: false })

    setTarefas(tarefasData || [])
    setLembretes(lembretesData || [])
    setProdutos(produtosData || [])
    setMovimentacoes(movimentacoesData || [])
    setIsLoaded(true)
  }

  async function addTarefa(form) {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('tarefas')
      .insert({
        user_id: user.id,
        titulo: form.titulo,
        descricao: form.descricao || null,
        responsavel: form.responsavel || null,
        status: form.status,
        prioridade: form.prioridade,
        data: form.data || null
      })

    if (error) console.error(error)
  }

  async function updateTarefa(id, updates) {
    const { error } = await supabase
      .from('tarefas')
      .update(updates)
      .eq('id', id)

    if (error && Object.keys(error).length > 0) console.error(error)
  }

  async function deleteTarefa(id) {
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', id)

    if (error) console.error(error)
  }


  async function addLembrete(form) {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('lembretes')
      .insert({
        user_id: user.id,
        titulo: form.titulo,
        conteudo: form.conteudo || null,
        destinatario: form.destinatario || null,
        status: form.status,
        prioridade: form.prioridade,
        data: form.data || null
      })

    if (error) console.error(error)
  }

  async function updateLembrete(id, updates) {
    const { error } = await supabase
      .from('lembretes')
      .update(updates)
      .eq('id', id)

    if (error && Object.keys(error).length > 0) console.error(error)
  }

  async function deleteLembrete(id) {
    const { error } = await supabase
      .from('lembretes')
      .delete()
      .eq('id', id)

    if (error) console.error(error)
  }

  async function addProduto(form) {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('produtos')
      .insert({
        user_id: user.id,
        cod: form.cod,
        nome: form.nome,
        cod_barra: form.cod_barra,
        max: form.max,
        min: form.min,
        estoque: form.estoque
      })

    if (error) console.error(error)
  }

  async function updateProduto(id, updates) {
    const { error } = await supabase
      .from('produtos')
      .update(updates)
      .eq('id', id)

    if (error && Object.keys(error).length > 0) console.error(error)
  }

  async function deleteProduto(id) {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)

    if (error) console.error(error)
  }

  async function entradaProduto(id, quantidade, motivo = 'Entrada manual') {
    const produto = produtos.find(p => p.id === id)
    if (produto) {
      // Registrar movimentação
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('movimentacoes_estoque')
        .insert({
          user_id: user.id,
          produto_id: id,
          tipo: 'entrada',
          quantidade: quantidade,
          motivo: motivo
        })

      // Atualizar estoque
      await updateProduto(id, { estoque: produto.estoque + quantidade })
    }
  }

  async function saidaProduto(id, quantidade, motivo = 'Saída manual') {
    const produto = produtos.find(p => p.id === id)
    if (produto && produto.estoque >= quantidade) {
      // Registrar movimentação
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('movimentacoes_estoque')
        .insert({
          user_id: user.id,
          produto_id: id,
          tipo: 'saida',
          quantidade: quantidade,
          motivo: motivo
        })

      // Atualizar estoque
      await updateProduto(id, { estoque: produto.estoque - quantidade })
    }
  }
  useEffect(() => {
    loadData()

    const tarefasChannel = supabase
      .channel('public:tarefas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, payload => {
        if (payload.eventType === 'INSERT') {
          setTarefas((prev) => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setTarefas((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)))
        } else if (payload.eventType === 'DELETE') {
          setTarefas((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      })
      .subscribe()

    const lembretesChannel = supabase
      .channel('public:lembretes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lembretes' }, payload => {
        if (payload.eventType === 'INSERT') {
          setLembretes((prev) => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setLembretes((prev) => prev.map((l) => (l.id === payload.new.id ? payload.new : l)))
        } else if (payload.eventType === 'DELETE') {
          setLembretes((prev) => prev.filter((l) => l.id !== payload.old.id))
        }
      })
      .subscribe()

    const produtosChannel = supabase
      .channel('public:produtos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, payload => {
        if (payload.eventType === 'INSERT') {
          setProdutos((prev) => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setProdutos((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p)))
        } else if (payload.eventType === 'DELETE') {
          setProdutos((prev) => prev.filter((p) => p.id !== payload.old.id))
        }
      })
      .subscribe()

    const movimentacoesChannel = supabase
      .channel('public:movimentacoes_estoque')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes_estoque' }, payload => {
        if (payload.eventType === 'INSERT') {
          setMovimentacoes((prev) => [payload.new, ...prev])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(tarefasChannel)
      supabase.removeChannel(lembretesChannel)
      supabase.removeChannel(produtosChannel)
      supabase.removeChannel(movimentacoesChannel)
    }
  }, [])

  return (
    <DataContext.Provider value={{
      tarefas,
      lembretes,
      produtos,
      movimentacoes,

      addTarefa,
      updateTarefa,
      deleteTarefa,

      addLembrete,
      updateLembrete,
      deleteLembrete,

      addProduto,
      updateProduto,
      deleteProduto,
      entradaProduto,
      saidaProduto,

      loadData,
      isLoaded
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}