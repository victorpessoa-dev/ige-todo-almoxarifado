/**
 * Contexto de autenticacao.
 *
 * Centraliza sessao Supabase, login, logout e mensagens de erro seguras para
 * a interface administrativa.
 */
'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getUserMessage } from '@/lib/messaging/user-messages'
import { logger } from '@/lib/logging/logger'

const AuthContext = createContext(undefined)

function isInvalidRefreshTokenError(error) {
  return /invalid refresh token|refresh token not found/i.test(error?.message || '')
}

/**
 * Provedor de sessao administrativa.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const isMounted = useRef(true)
  const authSubscription = useRef(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (authSubscription.current) {
        authSubscription.current.subscription.unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    /**
     * Carrega a sessao inicial sem atualizar estado apos desmontagem.
     */
    const initializeSession = async () => {
      try {
        setAuthError(null)

        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (error) {
          logger.error('Erro ao obter sessao:', error)
          if (isInvalidRefreshTokenError(error)) {
            await supabase.auth.signOut({ scope: 'local' })
          }
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
        if (isInvalidRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        }
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

  /**
   * Autentica usuario interno pelo Supabase Auth.
   */
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

  const requestPasswordReset = useCallback(async (email) => {
    if (!email?.trim()) {
      return { success: false, error: 'Informe seu email para redefinir a senha.' }
    }

    try {
      const redirectTo = `${window.location.origin}/redefinir-senha`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo
      })

      if (error) throw error
      return { success: true }
    } catch (error) {
      logger.error('Erro ao solicitar redefinicao de senha:', error)
      return {
        success: false,
        error: getUserMessage(error, 'Nao foi possivel enviar o link de redefinicao.')
      }
    }
  }, [])

  /**
   * Encerra sessao e limpa estado local mesmo quando o Supabase falha.
   */
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

  /**
   * Revalida a sessao atual antes de operacoes sensiveis.
   */
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
    requestPasswordReset,
    clearError: () => setAuthError(null)
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook de acesso ao contexto de autenticacao.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
