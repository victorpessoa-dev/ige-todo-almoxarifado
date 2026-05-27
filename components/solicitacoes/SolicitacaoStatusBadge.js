'use client'

import { Badge } from '@/components/ui/badge'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  getSolicitacaoOption
} from '@/constants/solicitacoes-config'

export function SolicitacaoStatusBadge({ type = 'status', value }) {
  const options =
    type === 'prioridade'
      ? SOLICITACAO_PRIORIDADE_OPTIONS
      : SOLICITACAO_STATUS_GERAL_OPTIONS
  const option = getSolicitacaoOption(options, value)

  return (
    <Badge variant="outline" className={option.className}>
      {option.label}
    </Badge>
  )
}
