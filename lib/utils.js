import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utilitarios compartilhados da interface.
 *
 * Mantem helpers pequenos e genericos fora dos componentes para evitar
 * duplicacao entre telas.
 */

/**
 * Combina classes condicionais e resolve conflitos do Tailwind.
 *
 * @param {...unknown} inputs Classes aceitas pelo clsx.
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Divide uma lista em grupos de tamanho fixo.
 *
 * Usado por impressoes e layouts paginados que precisam controlar a quantidade
 * de itens por pagina sem alterar a ordem original.
 *
 * @param {Array} array Lista de origem.
 * @param {number} size Tamanho de cada grupo.
 * @returns {Array[]}
 */
export function chunkArray(array, size) {
  const result = []

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }

  return result
}
