import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readText(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

async function testManifestUsesSvgLogo() {
  const manifest = JSON.parse(await readText('public/manifest.json'))
  const layout = await readText('app/layout.js')
  const serviceWorker = await readText('public/sw.js')

  assert.deepEqual(manifest.icons, [
    {
      src: '/ige-supergesso.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable'
    }
  ])
  assert.match(layout, /\/ige-supergesso\.svg/)
  assert.match(serviceWorker, /\/ige-supergesso\.svg/)
  assert.doesNotMatch(serviceWorker, /\/icons\/icon-(192|512)\.png/)
}

async function testPublicPurchaseRequestsDoNotGrantAnonInsert() {
  const schema = await readText('database/schema_original_atual.sql')
  const auditSql = await readText('database/audit/supabase_audit.sql')
  const hardeningSql = await readText('database/audit/supabase_hardening_fix.sql')

  // This contract protects the public request flow: anon uses RPC, never direct table insert.
  assert.match(schema, /revoke all privileges on all tables in schema public from anon;/)
  assert.doesNotMatch(
    schema,
    /grant insert on public\.solicitacoes_compra to anon/i
  )
  assert.doesNotMatch(
    schema,
    /on public\.solicitacoes_compra for insert\s+to anon/i
  )
  assert.match(auditSql, /dangerous_table_grant/)
  assert.match(auditSql, /dangerous_sequence_grant/)
  assert.match(auditSql, /dangerous_function_grant/)
  assert.match(hardeningSql, /revoke all privileges on all tables in schema public from anon;/)
  assert.match(hardeningSql, /revoke execute on all functions in schema public from anon;/)
  assert.match(hardeningSql, /grant execute on function public\.criar_solicitacao_compra_publica/)
}

async function testPublicListServicesUseMemoryCache() {
  const solicitacoesService = await readText('lib/services/solicitacoes-service.js')
  const catalogoService = await readText('lib/services/catalogo-service.js')

  assert.match(solicitacoesService, /getMemoryCache\(PUBLIC_SOLICITACOES_CACHE_KEY\)/)
  assert.match(solicitacoesService, /deleteMemoryCache\(PUBLIC_SOLICITACOES_CACHE_KEY\)/)
  assert.match(catalogoService, /getMemoryCache\(PUBLIC_CATALOG_CACHE_KEY\)/)
}

async function testSolicitacaoDateFilterLogicIsShared() {
  const filters = await readText('lib/solicitacoes/filters.js')
  const publicPage = await readText('app/solicitar/page.js')
  const adminPage = await readText('app/(admin)/solicitacoes/page.js')

  assert.match(filters, /export function matchesSolicitacaoDateFilters/)
  assert.match(filters, /export function getSolicitacaoFilterYears/)
  assert.match(publicPage, /matchesSolicitacaoDateFilters/)
  assert.match(adminPage, /matchesSolicitacaoDateFilters/)
}

async function testCatalogSummaryDoesNotRenderLinks() {
  const catalogHtml = await readText('lib/catalogo/catalogo-html.js')

  assert.match(catalogHtml, /<div class="summary-row">/)
  assert.doesNotMatch(catalogHtml, /<a class="summary-row"/)
  assert.doesNotMatch(catalogHtml, /href: `#categoria-/)
}

async function testAuditFilesStayOrganizedByUse() {
  const packageJson = JSON.parse(await readText('package.json'))
  const runbook = await readText('docs/supabase-audit-runbook.md')
  const technicalAudit = await readText('docs/technical-audit.md')

  // Audit assets should stay grouped by purpose instead of returning to root folders.
  assert.equal(packageJson.scripts.test, 'node tests/audit/audit-contracts.test.mjs')
  assert.equal(packageJson.scripts['audit:supabase:public'], 'node scripts/audit/supabase-public-audit.mjs')
  assert.match(runbook, /database\/audit\/supabase_audit\.sql/)
  assert.doesNotMatch(`${runbook}\n${technicalAudit}`, /database\/(security_audit_queries|rls_check|realtime_publication_fix)\.sql/)
}

async function testDomainFilesStayOrganizedByUse() {
  const technicalAudit = await readText('docs/technical-audit.md')

  // Domain helpers should stay grouped by responsibility instead of returning to lib root.
  assert.match(technicalAudit, /lib\/services\//)
  assert.match(technicalAudit, /lib\/solicitacoes\//)
  assert.match(technicalAudit, /components\/layout\//)
}

await testManifestUsesSvgLogo()
await testPublicPurchaseRequestsDoNotGrantAnonInsert()
await testPublicListServicesUseMemoryCache()
await testSolicitacaoDateFilterLogicIsShared()
await testCatalogSummaryDoesNotRenderLinks()
await testAuditFilesStayOrganizedByUse()
await testDomainFilesStayOrganizedByUse()

console.log('audit contracts passed')
