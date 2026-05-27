'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/spinner'
import { getUserMessage } from '@/lib/user-messages'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const isMobile =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 767px)').matches

      router.replace(isMobile ? '/solicitacoes' : '/painel')
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const result = await login(email, password)

    if (result.success) {
      toast.success('Login realizado com sucesso!')
    } else {
      toast.error(
        getUserMessage(result.error, 'Nao foi possivel entrar agora.')
      )
    }
  }

  if (isLoading) {
    return (
      <LoadingState className="min-h-screen bg-background" />
    )
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Image
            src="/ige-supergesso.png"
            alt="Logo"
            width={200}
            height={150}
            className="mx-auto mb-2"
          />
          <CardDescription>Entre com seu email e senha</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="mt-2 w-full">
              Entrar
            </Button>

            <Button type="button" variant="ghost" asChild>
              <a href="/solicitar">Voltar para solicitacoes</a>
            </Button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Acesso Admin
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
