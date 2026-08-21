'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center h-full p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="border-dashed border-2">
          <CardContent className="py-10 text-center">

            {/* Ícone */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center"
            >
              <Search className="w-10 h-10 text-muted-foreground" />
            </motion.div>

            {/* Texto */}
            <h1 className="text-5xl font-bold mb-2">404</h1>
            <p className="text-lg font-medium mb-2">
              Página não encontrada
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              O conteúdo que você tentou acessar não existe ou foi removido.
            </p>

            {/* Ações */}
            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href="/painel">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao painel
                </Link>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back()
                  } else {
                    router.push('/painel')
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}