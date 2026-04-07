'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [tarefas, setTarefas] = useState([])
  const [lembretes, setLembretes] = useState([])
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

    setTarefas(tarefasData || [])
    setLembretes(lembretesData || [])
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

    return () => {
      supabase.removeChannel(tarefasChannel)
      supabase.removeChannel(lembretesChannel)
    }
  }, [])

  return (
    <DataContext.Provider value={{
      tarefas,
      lembretes,

      addTarefa,
      updateTarefa,
      deleteTarefa,

      addLembrete,
      updateLembrete,
      deleteLembrete,

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