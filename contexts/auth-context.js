'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const isMounted = useRef(true)
  const authSubscription = useRef(null)

  useEffect(() => {
    return () => {
      isMounted.current = false
      if (authSubscription.current) {
        authSubscription.current.subscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const initializeSession = async () => {
      try {
        setAuthError(null)

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Erro ao obter sessão:', error)
          if (!cancelled && isMounted.current) {
            setAuthError(error.message)
          }
          return
        }

        if (!cancelled && isMounted.current) {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Erro inesperado ao inicializar sessão:', error)
        if (!cancelled && isMounted.current) {
          setAuthError(error.message)
        }
      } finally {
        if (!cancelled && isMounted.current) {
          setIsLoading(false)
        }
      }
    }

    initializeSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && isMounted.current) {
        setUser(session?.user ?? null)
        setAuthError(null)

        if (process.env.NODE_ENV === 'development') {
          console.log('Auth event:', event)
        }

        if (event === 'TOKEN_REFRESHED') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Token refreshed successfully')
          }
        }
      }
    })

    authSubscription.current = { subscription }

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    if (!email?.trim() || !password) {
      return { success: false, error: 'Email e senha são obrigatórios' }
    }

    try {
      setAuthError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        console.error('Erro no login:', error)

        let errorMessage = 'Erro ao fazer login'
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não verificado. Verifique sua caixa de entrada.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde.'
        } else {
          errorMessage = error.message
        }

        setAuthError(errorMessage)
        return { success: false, error: errorMessage }
      }

      if (data?.user) {
        return { success: true, user: data.user }
      }

      return { success: false, error: 'Login falhou sem erro específico' }
    } catch (error) {
      console.error('Erro inesperado no login:', error)
      const errorMessage = error.message || 'Erro inesperado ao fazer login'
      setAuthError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Erro ao fazer logout:', error)
        setUser(null)
        return { success: false, error: error.message }
      }

      setUser(null)
      setAuthError(null)
      return { success: true }
    } catch (error) {
      console.error('Erro inesperado no logout:', error)
      setUser(null)
      setAuthError(null)
      return { success: false, error: error.message }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Erro ao refresh sessão:', error)
        return { success: false, error: error.message }
      }

      if (session?.user) {
        setUser(session.user)
        return { success: true, user: session.user }
      }

      return { success: false, error: 'Sessão não encontrada' }
    } catch (error) {
      console.error('Erro inesperado ao refresh sessão:', error)
      return { success: false, error: error.message }
    }
  }, [])

  const contextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error: authError,
    login,
    logout,
    refreshSession,
    clearError: () => setAuthError(null)
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
