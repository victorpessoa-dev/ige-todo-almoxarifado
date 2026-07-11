'use client'

import Link from 'next/link'
import { BookOpen, ExternalLink, Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function CatalogoHeader({ onPrint }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:gap-3 sm:text-2xl md:text-3xl">
          <BookOpen className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
          Catálogo
        </h1>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/catalogo-publico" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Catálogo público
          </Link>
        </Button>
        <Button onClick={onPrint} className="w-full sm:w-auto">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>
    </div>
  )
}
