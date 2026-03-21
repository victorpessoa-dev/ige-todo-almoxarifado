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
        prioridade: form.prioridade
      })

    if (error) console.error(error)
  }

  async function updateTarefa(id, updates) {
    const { error } = await supabase
      .from('tarefas')
      .update(updates)
      .eq('id', id)

    if (error) console.error(error)
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
        prioridade: form.prioridade
      })

    if (error) console.error(error)
  }

  async function updateLembrete(id, updates) {
    const { error } = await supabase
      .from('lembretes')
      .update(updates)
      .eq('id', id)

    if (error) console.error(error)
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

    const interval = setInterval(() => {
      loadData()
    }, 12000)

    return () => clearInterval(interval)
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

      isLoaded
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}