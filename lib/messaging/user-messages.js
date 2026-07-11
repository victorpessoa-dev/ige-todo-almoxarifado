/**
 * Traduz erros tecnicos em mensagens seguras para a interface.
 *
 * A lista de padroes permite reaproveitar mensagens de validacao conhecidas,
 * enquanto erros inesperados recebem um fallback generico para nao expor
 * detalhes internos da aplicacao.
 */
const SAFE_MESSAGE_PATTERNS = [
  /titulo/i,
  /codigo/i,
  /nome/i,
  /email/i,
  /senha/i,
  /quantidade/i,
  /estoque insuficiente/i,
  /produto não encontrado/i,
  /adicione pelo menos/i,
  /maximo de/i,
  /muitas analises/i,
  /indisponivel/i,
  /tente novamente/i,
  /permissao/i,
  /camera/i,
  /imagem/i
]

export function getUserMessage(error, fallback = 'Não foi possível concluir esta ação.') {
  const message = error instanceof Error ? error.message : String(error || '')

  if (!message) {
    return fallback
  }

  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed') ||
    message.includes('fetch failed')
  ) {
    return 'Não foi possível concluir agora. Verifique a conexão e tente novamente.'
  }

  if (
    message.includes('Invalid login credentials') ||
    message.includes('Email ou senha incorretos')
  ) {
    return 'Email ou senha incorretos.'
  }

  if (message.includes('Email not confirmed')) {
    return 'Seu acesso ainda não foi liberado. Verifique seu email.'
  }

  if (
    message.includes('Too many requests') ||
    message.includes('rate') ||
    message.includes('quota')
  ) {
    return 'Muitas tentativas no momento. Aguarde um pouco e tente novamente.'
  }

  if (
    message.includes('not authenticated') ||
    message.includes('Não autenticado') ||
    message.includes('sessao') ||
    message.includes('session')
  ) {
    return 'Sua sessão expirou. Entre novamente para continuar.'
  }

  if (
    message.includes('duplicate key') ||
    message.includes('already exists') ||
    message.includes('Código já existente')
  ) {
    return 'Já existe um cadastro com esses dados.'
  }

  if (SAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
    return message
  }

  return fallback
}
