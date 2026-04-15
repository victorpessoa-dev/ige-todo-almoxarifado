'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

const DataContext = createContext()

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetry(operation, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === retries - 1) throw error
      await delay(RETRY_DELAY * Math.pow(2, attempt))
    }
  }
}

function sortByCreatedAtDesc(items = []) {
  return [...items].sort((a, b) => {
    const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bDate - aDate
  })
}

function sortProdutosByNomeAsc(items = []) {
  return [...items].sort((a, b) =>
    (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' })
  )
}

function upsertSorted(items = [], nextItem, sortFn) {
  const nextItems = items.filter((item) => item.id !== nextItem.id)
  nextItems.push(nextItem)
  return sortFn(nextItems)
}

function removeSorted(items = [], id, sortFn) {
  return sortFn(items.filter((item) => item.id !== id))
}

function normalizeMovimentacao(movimentacao, produtosBase = []) {
  if (!movimentacao) return movimentacao

  const produtoRelacionado =
    movimentacao.produtos ||
    produtosBase.find((produto) => produto.id === movimentacao.produto_id) ||
    null

  return {
    ...movimentacao,
    produtos: produtoRelacionado
      ? {
          nome: produtoRelacionado.nome ?? null,
          cod: produtoRelacionado.cod ?? null
        }
      : null
  }
}

export function DataProvider({ children }) {
  const [tarefas, setTarefas] = useState([])
  const [lembretes, setLembretes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const isMounted = useRef(true)
  const activeChannels = useRef([])
  const pendingOperations = useRef(new Map())
  const produtosRef = useRef([])

  useEffect(() => {
    produtosRef.current = produtos
  }, [produtos])

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const requireAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    return user
  }, [])

  const refreshMovimentacaoById = useCallback(async (id) => {
    const { data, error: queryError } = await supabase
      .from('movimentacoes_estoque')
      .select(`
        *,
        produtos (
          nome,
          cod
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (queryError || !data) {
      return null
    }

    return normalizeMovimentacao(data, produtosRef.current)
  }, [])

  const syncProdutoInMovimentacoes = useCallback((produto) => {
    setMovimentacoes((prev) =>
      sortByCreatedAtDesc(
        prev.map((movimentacao) =>
          movimentacao.produto_id === produto.id
            ? normalizeMovimentacao(
                {
                  ...movimentacao,
                  produtos: {
                    nome: produto.nome,
                    cod: produto.cod
                  }
                },
                [produto]
              )
            : movimentacao
        )
      )
    )
  }, [])

  const clearProdutoInMovimentacoes = useCallback((produtoId) => {
    setMovimentacoes((prev) =>
      sortByCreatedAtDesc(
        prev.map((movimentacao) =>
          movimentacao.produto_id === produtoId
            ? {
                ...movimentacao,
                produtos: null
              }
            : movimentacao
        )
      )
    )
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [
        { data: tarefasData, error: tarefasError },
        { data: lembretesData, error: lembretesError },
        { data: produtosData, error: produtosError },
        { data: movimentacoesData, error: movimentacoesError }
      ] = await Promise.all([
        supabase
          .from('tarefas')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('lembretes')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true }),
        supabase
          .from('movimentacoes_estoque')
          .select(`
            *,
            produtos (
              nome,
              cod
            )
          `)
          .order('created_at', { ascending: false })
      ])

      if (tarefasError) throw tarefasError
      if (lembretesError) throw lembretesError
      if (produtosError) throw produtosError
      if (movimentacoesError) throw movimentacoesError

      if (isMounted.current) {
        const nextProdutos = sortProdutosByNomeAsc(produtosData || [])
        setTarefas(sortByCreatedAtDesc(tarefasData || []))
        setLembretes(sortByCreatedAtDesc(lembretesData || []))
        setProdutos(nextProdutos)
        produtosRef.current = nextProdutos
        setMovimentacoes(
          sortByCreatedAtDesc((movimentacoesData || []).map((item) => normalizeMovimentacao(item, nextProdutos)))
        )
        setIsLoaded(true)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      if (isMounted.current) {
        setError(err.message)
      }
      throw err
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [])

  async function addTarefa(form) {
    if (!form?.titulo?.trim()) {
      throw new Error('Título é obrigatório')
    }

    const user = await requireAuth()

    const operation = async () => {
      const { data, error: insertError } = await supabase
        .from('tarefas')
        .insert({
          user_id: user.id,
          titulo: form.titulo.trim(),
          descricao: form.descricao?.trim() || null,
          responsavel: form.responsavel?.trim() || null,
          status: form.status || 'a_fazer',
          prioridade: form.prioridade || 'medio',
          data: form.data || null
        })
        .select()
        .single()

      if (insertError) throw insertError
      setTarefas((prev) => upsertSorted(prev, data, sortByCreatedAtDesc))
      return data
    }

    return withRetry(operation)
  }

  async function updateTarefa(id, updates) {
    if (!id) throw new Error('ID é obrigatório')

    const operation = async () => {
      const { data, error: updateError } = await supabase
        .from('tarefas')
        .update({
          ...updates,
          titulo: updates.titulo?.trim() || updates.titulo,
          descricao: updates.descricao?.trim() || updates.descricao,
          responsavel: updates.responsavel?.trim() || updates.responsavel
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      setTarefas((prev) => upsertSorted(prev, data, sortByCreatedAtDesc))
      return data
    }

    return withRetry(operation)
  }

  async function deleteTarefa(id) {
    if (!id) throw new Error('ID é obrigatório')

    const previousTarefas = tarefas
    setTarefas((prev) => removeSorted(prev, id, sortByCreatedAtDesc))

    const operation = async () => {
      const { error: deleteError } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    }

    try {
      await withRetry(operation)
    } catch (deleteError) {
      console.error('Erro ao deletar tarefa:', deleteError)
      if (isMounted.current) {
        setTarefas(previousTarefas)
      }
      throw deleteError
    }
  }

  async function addLembrete(form) {
    if (!form?.titulo?.trim()) {
      throw new Error('Título é obrigatório')
    }

    const user = await requireAuth()

    const operation = async () => {
      const { data, error: insertError } = await supabase
        .from('lembretes')
        .insert({
          user_id: user.id,
          titulo: form.titulo.trim(),
          conteudo: form.conteudo?.trim() || null,
          destinatario: form.destinatario?.trim() || null,
          status: form.status || 'a_fazer',
          prioridade: form.prioridade || 'medio',
          data: form.data || null
        })
        .select()
        .single()

      if (insertError) throw insertError
      setLembretes((prev) => upsertSorted(prev, data, sortByCreatedAtDesc))
      return data
    }

    return withRetry(operation)
  }

  async function updateLembrete(id, updates) {
    if (!id) throw new Error('ID é obrigatório')

    const operation = async () => {
      const { data, error: updateError } = await supabase
        .from('lembretes')
        .update({
          ...updates,
          titulo: updates.titulo?.trim() || updates.titulo,
          conteudo: updates.conteudo?.trim() || updates.conteudo,
          destinatario: updates.destinatario?.trim() || updates.destinatario
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      setLembretes((prev) => upsertSorted(prev, data, sortByCreatedAtDesc))
      return data
    }

    return withRetry(operation)
  }

  async function deleteLembrete(id) {
    if (!id) throw new Error('ID é obrigatório')

    const previousLembretes = lembretes
    setLembretes((prev) => removeSorted(prev, id, sortByCreatedAtDesc))

    const operation = async () => {
      const { error: deleteError } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    }

    try {
      await withRetry(operation)
    } catch (deleteError) {
      console.error('Erro ao deletar lembrete:', deleteError)
      if (isMounted.current) {
        setLembretes(previousLembretes)
      }
      throw deleteError
    }
  }

  async function addProduto(form) {
    if (!form?.cod?.trim()) {
      throw new Error('Código é obrigatório')
    }
    if (!form?.nome?.trim()) {
      throw new Error('Nome é obrigatório')
    }

    const user = await requireAuth()

    const operation = async () => {
      const { data, error: insertError } = await supabase
        .from('produtos')
        .insert({
          user_id: user.id,
          cod: form.cod.trim(),
          nome: form.nome.trim(),
          cod_barra: form.cod_barra?.trim() || form.cod.trim(),
          max: form.max || 0,
          min: form.min || 0,
          estoque: form.estoque || 0
        })
        .select()
        .single()

      if (insertError) throw insertError

      setProdutos((prev) => {
        const nextProdutos = upsertSorted(prev, data, sortProdutosByNomeAsc)
        produtosRef.current = nextProdutos
        return nextProdutos
      })

      return data
    }

    return withRetry(operation)
  }

  async function updateProduto(id, updates) {
    if (!id) throw new Error('ID é obrigatório')

    const operation = async () => {
      const { data, error: updateError } = await supabase
        .from('produtos')
        .update({
          ...updates,
          cod: updates.cod?.trim() || updates.cod,
          nome: updates.nome?.trim() || updates.nome,
          cod_barra: updates.cod_barra?.trim() || updates.cod_barra
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setProdutos((prev) => {
        const nextProdutos = upsertSorted(prev, data, sortProdutosByNomeAsc)
        produtosRef.current = nextProdutos
        return nextProdutos
      })
      syncProdutoInMovimentacoes(data)

      return data
    }

    return withRetry(operation)
  }

  async function deleteProduto(id) {
    if (!id) throw new Error('ID é obrigatório')

    const previousProdutos = produtos
    const previousMovimentacoes = movimentacoes

    setProdutos((prev) => {
      const nextProdutos = removeSorted(prev, id, sortProdutosByNomeAsc)
      produtosRef.current = nextProdutos
      return nextProdutos
    })
    clearProdutoInMovimentacoes(id)

    const operation = async () => {
      const { error: deleteError } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    }

    try {
      await withRetry(operation)
    } catch (deleteError) {
      console.error('Erro ao deletar produto:', deleteError)
      if (isMounted.current) {
        setProdutos(previousProdutos)
        produtosRef.current = previousProdutos
        setMovimentacoes(previousMovimentacoes)
      }
      throw deleteError
    }
  }

  async function entradaProduto(id, quantidade, motivo = 'Entrada manual') {
    if (!id) throw new Error('ID do produto é obrigatório')
    if (!quantidade || quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero')
    }

    if (pendingOperations.current.has(id)) {
      throw new Error('Operação já em andamento para este produto')
    }

    try {
      pendingOperations.current.set(id, true)

      const produto = produtosRef.current.find((p) => p.id === id)
      if (!produto) {
        throw new Error('Produto não encontrado')
      }

      const user = await requireAuth()

      const { data: movimentacaoData, error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          user_id: user.id,
          produto_id: id,
          tipo: 'entrada',
          quantidade,
          motivo
        })
        .select(`
          *,
          produtos (
            nome,
            cod
          )
        `)
        .single()

      if (movError) throw movError

      const novoEstoque = produto.estoque + quantidade

      const { data: produtoAtualizado, error: updateError } = await supabase
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const movimentacaoNormalizada = normalizeMovimentacao(movimentacaoData, [produtoAtualizado])

      setMovimentacoes((prev) => upsertSorted(prev, movimentacaoNormalizada, sortByCreatedAtDesc))
      setProdutos((prev) => {
        const nextProdutos = upsertSorted(prev, produtoAtualizado, sortProdutosByNomeAsc)
        produtosRef.current = nextProdutos
        return nextProdutos
      })
      syncProdutoInMovimentacoes(produtoAtualizado)

      return { movimentacao: movimentacaoNormalizada, produto: produtoAtualizado }
    } finally {
      pendingOperations.current.delete(id)
    }
  }

  async function saidaProduto(id, quantidade, motivo = 'Saída manual') {
    if (!id) throw new Error('ID do produto é obrigatório')
    if (!quantidade || quantidade <= 0) {
      throw new Error('Quantidade deve ser maior que zero')
    }

    if (pendingOperations.current.has(id)) {
      throw new Error('Operação já em andamento para este produto')
    }

    try {
      pendingOperations.current.set(id, true)

      const produto = produtosRef.current.find((p) => p.id === id)
      if (!produto) {
        throw new Error('Produto não encontrado')
      }

      if (produto.estoque < quantidade) {
        throw new Error(`Estoque insuficiente. Disponível: ${produto.estoque}, Solicitado: ${quantidade}`)
      }

      const user = await requireAuth()

      const { data: movimentacaoData, error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          user_id: user.id,
          produto_id: id,
          tipo: 'saida',
          quantidade,
          motivo
        })
        .select(`
          *,
          produtos (
            nome,
            cod
          )
        `)
        .single()

      if (movError) throw movError

      const novoEstoque = produto.estoque - quantidade

      const { data: produtoAtualizado, error: updateError } = await supabase
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const movimentacaoNormalizada = normalizeMovimentacao(movimentacaoData, [produtoAtualizado])

      setMovimentacoes((prev) => upsertSorted(prev, movimentacaoNormalizada, sortByCreatedAtDesc))
      setProdutos((prev) => {
        const nextProdutos = upsertSorted(prev, produtoAtualizado, sortProdutosByNomeAsc)
        produtosRef.current = nextProdutos
        return nextProdutos
      })
      syncProdutoInMovimentacoes(produtoAtualizado)

      return { movimentacao: movimentacaoNormalizada, produto: produtoAtualizado }
    } finally {
      pendingOperations.current.delete(id)
    }
  }

  useEffect(() => {
    loadData()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }

    const handleOnline = () => {
      loadData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    const createChannel = (name, table, handler) => {
      const channel = supabase
        .channel(name)
        .on('postgres_changes', { event: '*', schema: 'public', table }, handler)
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.log('Realtime connection issue, reloading data...')
            loadData()
          }
        })

      return channel
    }

    const tarefasChannel = createChannel('realtime:tarefas', 'tarefas', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setTarefas((prev) => upsertSorted(prev, payload.new, sortByCreatedAtDesc))
      } else if (payload.eventType === 'DELETE') {
        setTarefas((prev) => removeSorted(prev, payload.old.id, sortByCreatedAtDesc))
      }
    })

    const lembretesChannel = createChannel('realtime:lembretes', 'lembretes', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setLembretes((prev) => upsertSorted(prev, payload.new, sortByCreatedAtDesc))
      } else if (payload.eventType === 'DELETE') {
        setLembretes((prev) => removeSorted(prev, payload.old.id, sortByCreatedAtDesc))
      }
    })

    const produtosChannel = createChannel('realtime:produtos', 'produtos', (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setProdutos((prev) => {
          const nextProdutos = upsertSorted(prev, payload.new, sortProdutosByNomeAsc)
          produtosRef.current = nextProdutos
          return nextProdutos
        })
        syncProdutoInMovimentacoes(payload.new)
      } else if (payload.eventType === 'DELETE') {
        setProdutos((prev) => {
          const nextProdutos = removeSorted(prev, payload.old.id, sortProdutosByNomeAsc)
          produtosRef.current = nextProdutos
          return nextProdutos
        })
        clearProdutoInMovimentacoes(payload.old.id)
      }
    })

    const movimentacoesChannel = createChannel('realtime:movimentacoes', 'movimentacoes_estoque', async (payload) => {
      if (payload.eventType === 'DELETE') {
        setMovimentacoes((prev) => removeSorted(prev, payload.old.id, sortByCreatedAtDesc))
        return
      }

      if (!payload.new) {
        return
      }

      const movimentacaoCompleta =
        (await refreshMovimentacaoById(payload.new.id)) ||
        normalizeMovimentacao(payload.new, produtosRef.current)

      setMovimentacoes((prev) => upsertSorted(prev, movimentacaoCompleta, sortByCreatedAtDesc))
    })

    activeChannels.current = [tarefasChannel, lembretesChannel, produtosChannel, movimentacoesChannel]

    return () => {
      activeChannels.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      activeChannels.current = []
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [clearProdutoInMovimentacoes, loadData, refreshMovimentacaoById, syncProdutoInMovimentacoes])

  return (
    <DataContext.Provider value={{
      tarefas,
      lembretes,
      produtos,
      movimentacoes,
      isLoaded,
      isLoading,
      error,
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
      clearError: () => setError(null)
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}