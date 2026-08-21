import { readFile } from 'node:fs/promises'

export async function importSourceModule(relativePath, replacements = {}) {
  let source = await readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

  for (const [pattern, replacement] of Object.entries(replacements)) {
    source = source.replaceAll(pattern, replacement)
  }

  const encoded = Buffer.from(source).toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

export async function sourceModuleUrl(relativePath) {
  const source = await readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8')
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}
