'use client'

import { motion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'

export function SolicitacaoCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-foreground',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    success: 'text-emerald-700'
  }[tone]

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <Card>
        <CardContent className="p-4">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground" title={label}>
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
