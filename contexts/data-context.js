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

  useEffect(() => {
    loadData()
  }, [])

  // ================= TAREFAS =================

  async function addTarefa(form) {
<<<<<<< HEAD
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        user_id: user.id,
        titulo: form.titulo,
        descricao: form.descricao || null,
        responsavel: form.responsavel || null,
=======
    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        titulo: form.titulo,
        descricao: form.descricao || null,
>>>>>>> d217098d83d14402d8845d61eecd9800e89e593a
        status: form.status,
        prioridade: form.prioridade
      })
      .select()
      .single()

<<<<<<< HEAD
    if (error) {
      console.error(error)
      return
    }

    setTarefas(prev => [data, ...prev])
=======
    if (!error) {
      setTarefas(prev => [data, ...prev])
    }
>>>>>>> d217098d83d14402d8845d61eecd9800e89e593a
  }

  async function updateTarefa(id, updates) {
    const { data } = await supabase
      .from('tarefas')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (data) {
      setTarefas(prev => prev.map(t => t.id === id ? data : t))
    }
  }

  async function deleteTarefa(id) {
    await supabase.from('tarefas').delete().eq('id', id)
    setTarefas(prev => prev.filter(t => t.id !== id))
  }

  // ================= LEMBRETES =================

  async function addLembrete(form) {
<<<<<<< HEAD
    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('lembretes')
      .insert({
        user_id: user.id,
        titulo: form.titulo,
        conteudo: form.conteudo || null,
        destinatario: form.destinatario || null,
=======
    const { data, error } = await supabase
      .from('lembretes')
      .insert({
        titulo: form.titulo,
        descricao: form.descricao || null,
>>>>>>> d217098d83d14402d8845d61eecd9800e89e593a
        status: form.status,
        prioridade: form.prioridade
      })
      .select()
      .single()

<<<<<<< HEAD
    if (error) {
      console.error(error)
      return
    }

    setLembretes(prev => [data, ...prev])
=======
    if (!error) {
      setLembretes(prev => [data, ...prev])
    }
>>>>>>> d217098d83d14402d8845d61eecd9800e89e593a
  }

  async function updateLembrete(id, updates) {
    const { data } = await supabase
      .from('lembretes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (data) {
      setLembretes(prev => prev.map(l => l.id === id ? data : l))
    }
  }

  async function deleteLembrete(id) {
    await supabase.from('lembretes').delete().eq('id', id)
    setLembretes(prev => prev.filter(l => l.id !== id))
  }

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