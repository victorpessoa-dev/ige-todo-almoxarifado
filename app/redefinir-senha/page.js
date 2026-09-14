'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'

import { PublicFooter } from '@/components/layout/Copyright'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/spinner'
import { toast } from '@/lib/notifications/toast'
import { supabase } from '@/lib/supabase/client'
import { getUserMessage } from '@/lib/messaging/user-messages'

const MIN_PASSWORD_LENGTH = 6

function getRecoveryErrorMessage() {
  if (typeof window === 'undefined') return null

  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const error =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error_description') ||
    hashParams.get('error')

  return error ? decodeURIComponent(error.replace(/\+/g, ' ')) : null
}

export default function ResetPasswordPage() {
  const [isValidatingLink, setIsValidatingLink] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [linkError, setLinkError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const validateRecoveryLink = async () => {
      try {
        const recoveryError = getRecoveryErrorMessage()
        if (recoveryError) {
          setLinkError(getUserMessage(recoveryError, 'O link de redefinicao nao e valido ou expirou.'))
          return
        }

        const searchParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const code = searchParams.get('code')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error

          window.history.replaceState(null, '', window.location.pathname)
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          if (error) throw error

          window.history.replaceState(null, '', window.location.pathname)
        }

        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        if (error) throw error

        if (!session?.user) {
          setLinkError('O link de redefinicao nao e valido ou expirou. Solicite um novo link pelo Supabase.')
        }
      } catch (error) {
        if (/invalid refresh token|refresh token not found/i.test(error?.message || '')) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        }
        setLinkError(
          getUserMessage(
            error,
            'Nao foi possivel validar o link de redefinicao. Solicite um novo link e tente novamente.'
          )
        )
      } finally {
        if (!cancelled) {
          setIsValidatingLink(false)
        }
      }
    }

    validateRecoveryLink()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas informadas nao conferem.')
      return
    }

    try {
      setIsSubmitting(true)

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setIsPasswordUpdated(true)
      toast.success('Senha redefinida com sucesso!')
    } catch (error) {
      toast.error(
        getUserMessage(
          error,
          'Nao foi possivel redefinir a senha agora. Tente novamente.'
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isValidatingLink) {
    return <LoadingState className="min-h-screen bg-background" />
  }

  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 bg-gradient-to-br from-background to-muted p-4">
      <Card className="my-auto w-full max-w-md">
        <CardHeader className="text-center">
          <Image
            src="/ige-supergesso.svg"
            alt="Logo"
            width={200}
            height={150}
            className="mx-auto mb-2"
          />
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Crie uma nova senha para continuar acessando o almoxarifado.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {linkError ? (
            <div className="flex flex-col gap-4">
              <Alert variant="destructive">
                <KeyRound />
                <AlertTitle>Link indisponivel</AlertTitle>
                <AlertDescription>{linkError}</AlertDescription>
              </Alert>

              <Button type="button" variant="outline" onClick={() => router.replace('/login')}>
                Voltar para login
              </Button>
            </div>
          ) : isPasswordUpdated ? (
            <div className="flex flex-col gap-4">
              <Alert>
                <ShieldCheck />
                <AlertTitle>Senha atualizada</AlertTitle>
                <AlertDescription>
                  Sua senha foi redefinida. Entre novamente usando a nova senha.
                </AlertDescription>
              </Alert>

              <Button type="button" onClick={() => router.replace('/login')}>
                Ir para login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="reset-password" className="text-sm font-medium">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a nova senha"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-10 pr-10"
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="reset-password-confirmation" className="text-sm font-medium">
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-password-confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="pl-10 pr-10"
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>

              <Button type="button" variant="ghost" onClick={() => router.replace('/login')}>
                Voltar para login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <PublicFooter />
    </div>
  )
}
