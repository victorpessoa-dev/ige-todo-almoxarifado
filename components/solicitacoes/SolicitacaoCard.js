'use client'

import { Card, CardContent } from '@/components/ui/card'

export function SolicitacaoCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-foreground',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    success: 'text-emerald-700'
  }[tone]

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
