'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { toast } from 'sonner'
import { Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const { login, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // ✅ Redirecionamento seguro
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/painel') // replace = mais profissional que push
    }
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const success = await login(email, password)

    if (success) {
      toast.success('Login realizado com sucesso!')
    } else {
      toast.error('Email ou senha inválidos!')
    }
  }

  // ✅ Loading controlado corretamente
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  // ✅ Evita render antes do redirect
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Image src="/ige-supergesso.png" alt="Logo" width={150} height={150} className="mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold">Acesso Admin</CardTitle>
          <CardDescription>Entre com seu email e senha</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2">
              Entrar
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-2">
              Use seu usuário do Supabase
            </p>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}