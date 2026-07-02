'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getUserMessage } from '@/lib/user-messages'
import { logger } from '@/lib/logger'

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

        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (error) {
          logger.error('Erro ao obter sessao:', error)
          if (!cancelled && isMounted.current) {
            setAuthError('Não foi possível validar seu acesso agora.')
          }
          return
        }

        if (!cancelled && isMounted.current) {
          setUser(session?.user ?? null)
        }
      } catch (error) {
        logger.error('Erro inesperado ao inicializar sessao:', error)
        if (!cancelled && isMounted.current) {
          setAuthError('Não foi possível validar seu acesso agora.')
        }
      } finally {
        if (!cancelled && isMounted.current) {
          setIsLoading(false)
        }
      }
    }

    initializeSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && isMounted.current) {
        setUser(session?.user ?? null)
        setAuthError(null)
        logger.info('Auth event:', event)
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
      return { success: false, error: 'Informe email e senha para entrar.' }
    }

    try {
      setAuthError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        logger.error('Erro no login:', error)

        const errorMessage = getUserMessage(
          error,
          'Não foi possível entrar agora. Tente novamente.'
        )

        setAuthError(errorMessage)
        return { success: false, error: errorMessage }
      }

      if (data?.user) {
        return { success: true, user: data.user }
      }

      return {
        success: false,
        error: 'Não foi possível entrar agora. Tente novamente.'
      }
    } catch (error) {
      logger.error('Erro inesperado no login:', error)
      const errorMessage = getUserMessage(
        error,
        'Não foi possível entrar agora. Tente novamente.'
      )
      setAuthError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        logger.error('Erro ao fazer logout:', error)
        setUser(null)
        return { success: false, error: 'Não foi possível sair agora.' }
      }

      setUser(null)
      setAuthError(null)
      return { success: true }
    } catch (error) {
      logger.error('Erro inesperado no logout:', error)
      setUser(null)
      setAuthError(null)
      return { success: false, error: 'Não foi possível sair agora.' }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error) {
        logger.error('Erro ao atualizar sessao:', error)
        return {
          success: false,
          error: 'Não foi possível atualizar seu acesso agora.'
        }
      }

      if (session?.user) {
        setUser(session.user)
        return { success: true, user: session.user }
      }

      return { success: false, error: 'Sua sessão não está mais disponível.' }
    } catch (error) {
      logger.error('Erro inesperado ao atualizar sessao:', error)
      return {
        success: false,
        error: 'Não foi possível atualizar seu acesso agora.'
      }
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
