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
  assert.match(packageJson.scripts.test, /node --test tests\/unit/)
  assert.match(packageJson.scripts.test, /node tests\/audit\/audit-contracts\.test\.mjs/)
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

async function testAiRoutesRequireAuthenticatedUser() {
  const apiAuth = await readText('lib/server/api-auth.js')
  const authenticatedFetch = await readText('lib/api/authenticated-fetch.js')
  const routes = await Promise.all([
    readText('app/(admin)/api/analyze/route.js'),
    readText('app/(admin)/api/inventory-scan-assist/route.js'),
    readText('app/(admin)/api/inventory-turnover-analysis/route.js')
  ])
  const callers = await Promise.all([
    readText('app/(admin)/contagem/page.js'),
    readText('components/inventory/BarcodeScannerCard.js'),
    readText('app/(admin)/analise-giro/page.js')
  ])

  assert.match(apiAuth, /client\.auth\.getUser\(token\)/)
  assert.match(apiAuth, /status:\s*401/)
  assert.match(authenticatedFetch, /Authorization/)
  assert.match(authenticatedFetch, /session\.access_token/)

  for (const route of routes) {
    assert.match(route, /requireApiAuth\(req\)/)
    assert.match(route, /if \(auth.response\) return auth.response/)
  }

  for (const caller of callers) {
    assert.match(caller, /authenticatedFetch\(/)
  }
}

async function testAiRateLimitIsDistributedAndUserScoped() {
  const rateLimit = await readText('lib/server/rate-limit.js')
  const schema = await readText('database/schema_original_atual.sql')

  assert.match(rateLimit, /rpc\('check_api_rate_limit'/)
  assert.doesNotMatch(rateLimit, /new Map\(/)
  assert.doesNotMatch(rateLimit, /buckets\.get\(/)
  assert.match(schema, /current_user_id uuid := auth\.uid\(\)/)
  assert.match(schema, /on conflict \(bucket_key\) do update/)
  assert.match(schema, /create or replace function public\.check_api_rate_limit/)
  assert.match(schema, /revoke all privileges on public\.api_rate_limits from public, anon, authenticated/)
  assert.match(schema, /grant execute on function public\.check_api_rate_limit\(text\) to authenticated/)
}

async function testReviewPageUsesCachedUpdatesAndConfirmation() {
  const page = await readText('app/(admin)/revisoes/page.js')
  const reviewApi = await readText('app/(admin)/api/revisoes/route.js')

  assert.match(page, /AlertDialog/)
  assert.doesNotMatch(page, /window\.confirm/)
  assert.match(page, /setRotinas\(\(current\)/)
  assert.match(page, /setRevisoes\(\(current\)/)
  assert.match(page, /setPendencias\(\(current\)/)
  assert.match(page, /toggleCategory/)
  assert.match(reviewApi, /getReviewCategories\(routine\)/)
  assert.match(reviewApi, /\.in\('categoria', categories\)/)
}

await testManifestUsesSvgLogo()
await testPublicPurchaseRequestsDoNotGrantAnonInsert()
await testPublicListServicesUseMemoryCache()
await testSolicitacaoDateFilterLogicIsShared()
await testCatalogSummaryDoesNotRenderLinks()
await testAuditFilesStayOrganizedByUse()
await testDomainFilesStayOrganizedByUse()
await testAiRoutesRequireAuthenticatedUser()
await testAiRateLimitIsDistributedAndUserScoped()
await testReviewPageUsesCachedUpdatesAndConfirmation()



async function testNotificationSoundsRespectInitialSnapshot() {
  const adminLayout = await readText('app/(admin)/layout.js')
  const dataContext = await readText('contexts/data-context.js')
  const audioPlayer = await readText('components/notifications/AudioPlayer.js')

  assert.ok(adminLayout.includes('notificationBaselineReadyRef'))
  assert.ok(adminLayout.includes('isLoaded'))
  assert.ok(adminLayout.includes('new_notifcation.mp3'))
  assert.ok(!adminLayout.includes('new_notification.mp3'))

  assert.ok(dataContext.includes('hasInitialProductsRef'))
  assert.ok(dataContext.includes('previousLowStockRef'))
  assert.ok(dataContext.includes('Number(produto.estoque || 0) <= Number(produto.min || 0)'))
  assert.ok(dataContext.includes('new_prod_low.mp3'))

  assert.ok(audioPlayer.includes("soundId = 'new_notifcation'"))
}
async function testOverdueRequestsOverrideSituationLabel() {
  const config = await readText('constants/solicitacoes-config.js')

  assert.match(config, /export function getSolicitacaoSituacao\(solicitacao = \{\}\)/)
  assert.match(
    config,
    /getSolicitacaoSituacao[\s\S]*?if \(isSolicitacaoAtrasada\(solicitacao\)\)[\s\S]*?getSolicitacaoPrazoSituacao\(solicitacao\)/
  )
}

async function testCiDoesNotDependOnVercel() {
  const workflow = await readText('.github/workflows/ci-cd.yml')

  assert.match(workflow, /npm run audit:app:smoke/)
  assert.doesNotMatch(workflow, /Deploy to Vercel|vercel (pull|build|deploy)/i)
}

async function testAtomicStockMovementFunctionIsPresent() {
  const schema = await readText('database/schema_original_atual.sql')

  assert.match(schema, /create or replace function public\.registrar_movimentacao_estoque/)
  assert.match(schema, /for update/)
  assert.match(schema, /insert into public\.movimentacoes_estoque/)
  assert.match(schema, /update public\.produtos set estoque/)
}

await testNotificationSoundsRespectInitialSnapshot()
await testOverdueRequestsOverrideSituationLabel()
await testCiDoesNotDependOnVercel()
await testAtomicStockMovementFunctionIsPresent()

console.log('audit contracts passed')
