/**
 * Contexto de dados administrativos.
 *
 * Mantem estado local, sincronizacao realtime e operacoes Supabase para
 * inventario, movimentacoes e solicitacoes de compra.
 */
'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logging/logger'
import {
  createCentroCusto,
  createSolicitacaoCompra,
  createSolicitanteCompra,
  deleteCentroCusto,
  deleteSolicitacaoCompra,
  deleteSolicitanteCompra,
  listCentrosCusto,
  listSolicitacoesCompra,
  listSolicitantesCompra,
  invalidatePublicSolicitacaoCaches,
  updateCentroCusto,
  updateSolicitacaoCompra,
  updateSolicitanteCompra
} from '@/lib/services/solicitacoes-service'
import { toDateInputValue } from '@/lib/date/date-utils'
import { invalidatePublicCatalogCache } from '@/lib/services/catalogo-service'
import { notifyPush } from '@/lib/services/push-service'
import {
  normalizeMovimentacao,
  normalizeSolicitacao,
  removeSorted,
  sortByCreatedAtDesc,
  sortProdutosByNomeAsc,
  upsertSorted,
  withRetry
} from '@/lib/data/context-utils'

const DataContext = createContext()

/**
 * Provedor dos dados administrativos compartilhados.
 */
export function DataProvider({ children }) {
  const [produtos, setProdutos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [solicitacoesCompra, setSolicitacoesCompra] = useState([])
  const [solicitantesCompra, setSolicitantesCompra] = useState([])
  const [centrosCusto, setCentrosCusto] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const isMounted = useRef(true)
  const activeChannels = useRef([])
  const pendingOperations = useRef(new Map())
  const produtosRef = useRef([])
  const previousLowStockRef = useRef(new Map())
  const hasInitialProductsRef = useRef(false)

  useEffect(() => {
    produtosRef.current = produtos
  }, [produtos])

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  /**
   * Garante usuario autenticado antes de escrever em tabelas internas.
   */
  const requireAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Usuário não autenticado')
    }
    return user
  }, [])

  /**
   * Rebusca uma movimentacao com relacionamento completo apos evento realtime.
   */
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

  /**
   * Rebusca uma solicitacao com relacionamento completo apos evento realtime.
   */
  const refreshSolicitacaoById = useCallback(async (id) => {
    const { data, error: queryError } = await supabase
      .from('solicitacoes_compra')
      .select(`
        *,
        produtos (
          id,
          nome,
          cod
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (queryError || !data) {
      return null
    }

    return normalizeSolicitacao(data, produtosRef.current)
  }, [])

  /**
   * Atualiza dados denormalizados do produto nas movimentacoes ja carregadas.
   */
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

  /**
   * Remove dados de produto em movimentacoes quando o produto deixa de existir.
   */
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

  /**
   * Carrega o estado administrativo inicial em paralelo.
   */
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [
        { data: produtosData, error: produtosError },
        { data: movimentacoesData, error: movimentacoesError },
        solicitacoesResult,
        solicitantesResult,
        centrosCustoResult
      ] = await Promise.all([
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
          .order('created_at', { ascending: false }),
        listSolicitacoesCompra()
          .then((data) => ({ data, error: null }))
          .catch((error) => ({ data: [], error })),
        listSolicitantesCompra()
          .then((data) => ({ data, error: null }))
          .catch((error) => ({ data: [], error })),
        listCentrosCusto()
          .then((data) => ({ data, error: null }))
          .catch((error) => ({ data: [], error }))
      ])
      if (produtosError) throw produtosError
      if (movimentacoesError) throw movimentacoesError
      if (solicitacoesResult.error) {
        logger.warn('Erro ao carregar solicitacoes:', solicitacoesResult.error)
      }
      if (solicitantesResult.error) {
        logger.warn('Erro ao carregar solicitantes:', solicitantesResult.error)
      }
      if (centrosCustoResult.error) {
        logger.warn('Erro ao carregar centros de custo:', centrosCustoResult.error)
      }

      if (isMounted.current) {
        const nextProdutos = sortProdutosByNomeAsc(produtosData || [])
        setProdutos(nextProdutos)
        produtosRef.current = nextProdutos
        previousLowStockRef.current = new Map(nextProdutos.map((produto) => [
          produto.id,
          Number(produto.estoque || 0) <= Number(produto.min || 0)
        ]))
        hasInitialProductsRef.current = true
        setMovimentacoes(
          sortByCreatedAtDesc((movimentacoesData || []).map((item) => normalizeMovimentacao(item, nextProdutos)))
        )
        setSolicitacoesCompra(
          sortByCreatedAtDesc(
            (solicitacoesResult.data || []).map((item) =>
              normalizeSolicitacao(item, nextProdutos)
            )
          )
        )
        setSolicitantesCompra(solicitantesResult.data || [])
        setCentrosCusto(centrosCustoResult.data || [])
        setIsLoaded(true)
      }
    } catch (err) {
      logger.error('Erro ao carregar dados:', err)
      if (isMounted.current) {
        setError('Não foi possível carregar os dados agora.')
      }
      throw err
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [])

  /**
   * Cria produto de inventario vinculado ao usuario autenticado.
   */
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
          categoria: form.categoria?.trim() || null,
          aplicacao: form.aplicacao?.trim() || null,
          medidas: form.medidas?.trim() || null,
          marcas: form.marcas?.trim() || null,
          img_url: form.img_url?.trim() || null,
          max: form.max || 0,
          min: form.min || 0,
          estoque: form.estoque || 0
        })
        .select()
        .single()

      if (insertError) throw insertError
      invalidatePublicCatalogCache()

      setProdutos((prev) => {
        const nextProdutos = upsertSorted(prev, data, sortProdutosByNomeAsc)
        produtosRef.current = nextProdutos
        return nextProdutos
      })

      return data
    }

    return withRetry(operation)
  }

  /**
   * Atualiza produto e propaga nome/codigo para movimentacoes exibidas.
   */
  async function updateProduto(id, updates) {
    if (!id) throw new Error('ID é obrigatório')

    const operation = async () => {
      const { data, error: updateError } = await supabase
        .from('produtos')
        .update({
          ...updates,
          cod: updates.cod?.trim() || updates.cod,
          nome: updates.nome?.trim() || updates.nome,
          cod_barra: updates.cod_barra?.trim() || updates.cod_barra,
          categoria: updates.categoria?.trim?.() || updates.categoria,
          aplicacao: updates.aplicacao?.trim?.() || updates.aplicacao,
          medidas: updates.medidas?.trim?.() || updates.medidas,
          marcas: updates.marcas?.trim?.() || updates.marcas,
          img_url: updates.img_url?.trim?.() || updates.img_url
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      invalidatePublicCatalogCache()

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

  /**
   * Remove produto com rollback do inventario e das movimentacoes locais.
   */
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
      invalidatePublicCatalogCache()
    }

    try {
      await withRetry(operation)
    } catch (deleteError) {
      logger.error('Erro ao deletar produto:', deleteError)
      if (isMounted.current) {
        setProdutos(previousProdutos)
        produtosRef.current = previousProdutos
        setMovimentacoes(previousMovimentacoes)
      }
      throw deleteError
    }
  }

  /**
   * Registra entrada de estoque e atualiza saldo do produto.
   */
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

      const { data: operationData, error: operationError } = await supabase.rpc('registrar_movimentacao_estoque', {
        p_produto_id: id,
        p_tipo: 'entrada',
        p_quantidade: quantidade,
        p_motivo: motivo
      })

      if (operationError) throw operationError

      const movimentacaoData = operationData?.movimentacao
      const produtoAtualizado = operationData?.produto
      if (!movimentacaoData || !produtoAtualizado) throw new Error('Resposta invalida da operacao de estoque.')

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

  /**
   * Registra saida de estoque validando saldo disponivel.
   */
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

      const { data: operationData, error: operationError } = await supabase.rpc('registrar_movimentacao_estoque', {
        p_produto_id: id,
        p_tipo: 'saida',
        p_quantidade: quantidade,
        p_motivo: motivo
      })

      if (operationError) throw operationError

      const movimentacaoData = operationData?.movimentacao
      const produtoAtualizado = operationData?.produto
      if (!movimentacaoData || !produtoAtualizado) throw new Error('Resposta invalida da operacao de estoque.')

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

  /**
   * Atualiza solicitacao de compra e reordena a lista local.
   */
  async function updateSolicitacao(id, updates) {
    const data = await withRetry(() => updateSolicitacaoCompra(id, updates))
    const solicitacaoNormalizada = normalizeSolicitacao(data, produtosRef.current)
    setSolicitacoesCompra((prev) => upsertSorted(prev, solicitacaoNormalizada, sortByCreatedAtDesc))
    return solicitacaoNormalizada
  }

  /**
   * Cria solicitacao administrativa e adiciona na lista local.
   */
  async function addSolicitacao(form) {
    const data = await withRetry(() => createSolicitacaoCompra(form))
    const solicitacaoNormalizada = normalizeSolicitacao(data, produtosRef.current)
    setSolicitacoesCompra((prev) => upsertSorted(prev, solicitacaoNormalizada, sortByCreatedAtDesc))
    return solicitacaoNormalizada
  }

  /**
   * Remove solicitacao com rollback local em caso de erro.
   */
  async function deleteSolicitacao(id) {
    if (!id) throw new Error('ID é obrigatório')

    const previousSolicitacoes = solicitacoesCompra
    setSolicitacoesCompra((prev) => removeSorted(prev, id, sortByCreatedAtDesc))

    try {
      await withRetry(() => deleteSolicitacaoCompra(id))
    } catch (deleteError) {
      logger.error('Erro ao deletar solicitacao:', deleteError)
      if (isMounted.current) {
        setSolicitacoesCompra(previousSolicitacoes)
      }
      throw deleteError
    }
  }

  /**
   * Cria solicitante usado nos fluxos de compra.
   */
  async function addSolicitante(form) {
    const data = await withRetry(() => createSolicitanteCompra(form))
    setSolicitantesCompra((prev) =>
      [...prev, data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    )
    return data
  }

  /**
   * Atualiza solicitante mantendo lista em ordem alfabetica.
   */
  async function updateSolicitante(id, updates) {
    const data = await withRetry(() => updateSolicitanteCompra(id, updates))
    setSolicitantesCompra((prev) =>
      prev.map((item) => (item.id === id ? data : item))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    )
    return data
  }

  /**
   * Remove solicitante da base administrativa.
   */
  async function deleteSolicitante(id) {
    await withRetry(() => deleteSolicitanteCompra(id))
    setSolicitantesCompra((prev) => prev.filter((item) => item.id !== id))
  }

  /**
   * Cria centro de custo usado por solicitantes e compras.
   */
  async function addCentroCusto(form) {
    const data = await withRetry(() => createCentroCusto(form))
    setCentrosCusto((prev) =>
      [...prev, data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    )
    return data
  }

  /**
   * Atualiza centro de custo mantendo lista em ordem alfabetica.
   */
  async function updateCentroCustoItem(id, updates) {
    const data = await withRetry(() => updateCentroCusto(id, updates))
    setCentrosCusto((prev) =>
      prev.map((item) => (item.id === id ? data : item))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    )
    return data
  }

  /**
   * Remove centro de custo da base administrativa.
   */
  async function deleteCentroCustoItem(id) {
    await withRetry(() => deleteCentroCusto(id))
    setCentrosCusto((prev) => prev.filter((item) => item.id !== id))
  }

  useEffect(() => {
    // Fluxo de sincronizacao:
    // 1. Carrega dados iniciais.
    // 2. Recarrega ao voltar para a aba ou ficar online.
    // 3. Assina realtime para manter listas administrativas atualizadas.
    queueMicrotask(() => {
      loadData()
    })


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
            logger.warn('Realtime connection issue, reloading data')
            loadData()
          }
        })

      return channel
    }
    const produtosChannel = createChannel('realtime:produtos', 'produtos', (payload) => {
      invalidatePublicCatalogCache()
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setProdutos((prev) => {
          const nextProdutos = upsertSorted(prev, payload.new, sortProdutosByNomeAsc)
          produtosRef.current = nextProdutos
          return nextProdutos
        })
        syncProdutoInMovimentacoes(payload.new)

        const produto = payload.new
        const wasLowStock = previousLowStockRef.current.get(produto.id) === true
        const isLowStock =
          Number(produto.estoque || 0) <= Number(produto.min || 0)

        if (hasInitialProductsRef.current && isLowStock && !wasLowStock) {
          const audio = new Audio('/sound/new_prod_low.mp3')
          audio.currentTime = 0
          audio.play().catch(() => {})
          notifyPush({ title: 'Estoque baixo', body: produto.nome + ' atingiu o estoque mínimo.', url: '/inventario' }).catch(() => {})
        }

        previousLowStockRef.current.set(produto.id, isLowStock)
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

    const solicitacoesChannel = createChannel('realtime:solicitacoes_compra', 'solicitacoes_compra', async (payload) => {
      invalidatePublicSolicitacaoCaches()
      if (payload.eventType === 'INSERT' && payload.new) {
        notifyPush({ title: 'Nova solicitação de compra', body: payload.new.nome_item || 'Uma nova solicitação foi criada.', url: '/solicitacoes' }).catch(() => {})
      }
      if (payload.eventType === 'DELETE') {
        setSolicitacoesCompra((prev) => removeSorted(prev, payload.old.id, sortByCreatedAtDesc))
        return
      }

      if (!payload.new) {
        return
      }

      const solicitacaoCompleta =
        (await refreshSolicitacaoById(payload.new.id)) ||
        normalizeSolicitacao(payload.new, produtosRef.current)

      setSolicitacoesCompra((prev) => upsertSorted(prev, solicitacaoCompleta, sortByCreatedAtDesc))
    })

    const solicitantesChannel = createChannel('realtime:solicitantes_compra', 'solicitantes_compra', (payload) => {
      invalidatePublicSolicitacaoCaches()
      if (payload.eventType === 'DELETE') {
        setSolicitantesCompra((prev) => prev.filter((item) => item.id !== payload.old.id))
        return
      }

      setSolicitantesCompra((prev) =>
        upsertSorted(prev, payload.new, (items) =>
          [...items].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
        )
      )
    })

    const centrosCustoChannel = createChannel('realtime:centros_custo', 'centros_custo', (payload) => {
      invalidatePublicSolicitacaoCaches()
      if (payload.eventType === 'DELETE') {
        setCentrosCusto((prev) => prev.filter((item) => item.id !== payload.old.id))
        return
      }

      setCentrosCusto((prev) =>
        upsertSorted(prev, payload.new, (items) =>
          [...items].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
        )
      )
    })

    activeChannels.current = [
      produtosChannel,
      movimentacoesChannel,
      solicitacoesChannel,
      solicitantesChannel,
      centrosCustoChannel
    ]

    return () => {
      activeChannels.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      activeChannels.current = []
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [clearProdutoInMovimentacoes, loadData, refreshMovimentacaoById, refreshSolicitacaoById, syncProdutoInMovimentacoes])

  return (
    <DataContext.Provider value={{
      produtos,
      movimentacoes,
      solicitacoesCompra,
      solicitantesCompra,
      centrosCusto,
      isLoaded,
      isLoading,
      error,
      addProduto,
      updateProduto,
      deleteProduto,
      entradaProduto,
      saidaProduto,
      addSolicitacao,
      updateSolicitacao,
      deleteSolicitacao,
      addSolicitante,
      updateSolicitante,
      deleteSolicitante,
      addCentroCusto,
      updateCentroCusto: updateCentroCustoItem,
      deleteCentroCusto: deleteCentroCustoItem,
      loadData,
      clearError: () => setError(null)
    }}>
      {children}
    </DataContext.Provider>
  )
}

/**
 * Hook de acesso aos dados administrativos compartilhados.
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}
