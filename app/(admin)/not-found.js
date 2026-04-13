import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            {/* Ilustração */}
            <div className="mb-8">
              <div className="relative">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
                  <Search className="h-16 w-16 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-2xl">?</span>
                </div>
              </div>
            </div>

            {/* Texto */}
            <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Página não encontrada</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Ops! A página que você está procurando não existe ou foi movida.
              Vamos te ajudar a voltar para um lugar seguro.
            </p>

            {/* Botões */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/admin">
                  <Home className="h-4 w-4 mr-2" />
                  Ir para o Início
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
            </div>

            {/* Links úteis */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Páginas disponíveis:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/painel">Painel</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/tarefas">Tarefas</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/lembretes">Lembretes</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/calendario">Calendário</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/inventario">Inventário</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}