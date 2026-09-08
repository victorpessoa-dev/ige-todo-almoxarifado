import { PublicFooter } from '@/components/layout/Copyright'
import Image from 'next/image'
import Link from 'next/link'
import { LogIn, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-muted/30 px-4 py-8">
      <section className="my-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <Image
          src="/ige-supergesso.svg"
          alt="IGE Supergesso"
          width={190}
          height={115}
          priority
        />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Sistema de Compras
          </h1>
          <p className="text-sm text-muted-foreground">
            Acesse o formulário público de solicitações ou entre na área administrativa.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/solicitar">
              <Send className="h-4 w-4" />
              Solicitar
            </Link>
          </Button>

          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          </Button>
        </div>
      </section>
      <PublicFooter />
    </main>
  )
}
