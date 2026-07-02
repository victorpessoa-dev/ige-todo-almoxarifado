# Auditoria tecnica

Este documento registra as decisoes tecnicas aplicadas durante a auditoria incremental do projeto.

## Ambiente e versionamento

- O gerenciador oficial do projeto e `npm`.
- `package-lock.json` e o lockfile unico do projeto.
- `.env` e `.env.local` nao devem ser versionados.
- `.env.local` pode existir localmente para desenvolvimento, mas fica fora do Git.

## Dados administrativos

- O `DataProvider` fica restrito a area administrativa autenticada.
- Paginas publicas nao devem carregar estado global administrativo nem assinar canais realtime internos.
- O realtime administrativo continua centralizado no `DataProvider`.

## APIs de IA

As rotas abaixo usam chaves do servidor e possuem rate limit em memoria por IP:

- `/api/analyze`
- `/api/inventory-scan-assist`
- `/api/inventory-turnover-analysis`

O rate limit reduz abuso e consumo acidental de quota. Em ambiente serverless com multiplas instancias, esse controle e local por instancia. Para uso critico, trocar por Redis, Upstash, banco ou recurso equivalente.

## Supabase

- As policies atuais tratam qualquer usuario autenticado como operador/admin interno.
- Decisao operacional atual: existe somente uma conta de acesso e qualquer nova conta teria as mesmas permissoes. Portanto, o modelo de `authenticated` como operador/admin interno esta aceito por enquanto.
- Se o sistema passar a ter perfis diferentes, as policies devem ser refinadas por papel antes de liberar novos acessos.
- As funcoes publicas de solicitacao limitam os dados expostos ao publico.
- Criacao publica de solicitacao deve passar pela funcao `criar_solicitacao_compra_publica`; o papel `anon` nao deve ter insert direto em `solicitacoes_compra`.
- O catalogo publico usa funcao dedicada e nao expoe estoque atual.

## Headers

Headers de seguranca ficam em `next.config.mjs`.

A CSP remove `unsafe-eval` em producao, preserva `unsafe-inline` por compatibilidade com Next e estilos runtime, e declara fontes explicitas para workers, manifest, imagens, midia e conexoes Supabase.

Remover `unsafe-inline` exige uma etapa futura com nonce ou hashes e validacao visual completa.

## Pendencias recomendadas

- Avaliar RLS por papeis se houver usuarios autenticados que nao sejam administradores.
- Considerar rate limit distribuido para producao com multiplas instancias.
- Adicionar testes focados em services criticos e normalizadores.

## Alta prioridade aplicada

- `database/schema_original_atual.sql` foi revisado na parte de RLS, grants, funcoes publicas, triggers e indices versionados.
- O insert direto anonimo em `solicitacoes_compra` foi removido. Publico cria solicitacao somente pela RPC validada.
- A sequencia de codigo de solicitacao deixou de ser concedida ao papel `anon`.
- Trechos SQL com encoding quebrado foram normalizados para texto ASCII.
- Nao ha arquivo `.env` ou `.env.local` rastreado no Git. O `.gitignore` cobre esses arquivos.
- `pnpm-lock.yaml` esta marcado para remocao; `package-lock.json` permanece como lockfile oficial.
- Foi criado `database/audit/supabase_audit.sql` para comparar o Supabase real com o schema versionado.
- Foi criado `docs/supabase-audit-runbook.md` para orientar a execucao e validacao da auditoria no ambiente real.
- Foi criado e executado `npm run audit:supabase:public`. A auditoria publica real passou usando a anon key local.
- Auditoria SQL foi iniciada no Supabase real. O RLS foi confirmado como ativo em todas as tabelas principais.
- A publicacao `supabase_realtime` foi confirmada com todas as tabelas esperadas: `tarefas`, `lembretes`, `produtos`, `movimentacoes_estoque`, `solicitacoes_compra`, `solicitantes_compra` e `centros_custo`.
- Os SQLs auxiliares foram consolidados em `database/audit/supabase_audit.sql` para manter a pasta `database` focada em schema e auditoria.
- A auditoria real encontrou grants amplos para `anon` e funcoes internas com `EXECUTE` publico. Foi criado `database/audit/supabase_hardening_fix.sql` para revogar o excesso e manter apenas as RPCs publicas esperadas.
- Storage foi confirmado sem buckets retornados no ambiente real.
- O hardening Supabase foi aplicado no ambiente real e a auditoria passou.

## Superficies publicas revisadas

- `/`: entrada publica que encaminha para o fluxo publico.
- `/login`: autenticacao administrativa.
- `/solicitar`: criacao e acompanhamento publico de solicitacoes.
- `/catalogo-publico`: consulta publica do catalogo sem estoque atual.
- `/api/analyze`: IA para contagem por imagem, com validacao de imagens e rate limit.
- `/api/inventory-scan-assist`: IA para apoio ao scanner, com validacao de imagem, limite de catalogo e rate limit.
- `/api/inventory-turnover-analysis`: IA para analise de giro, com limite de produtos e rate limit.

## O que ainda depende do ambiente Supabase

- Confirmar se todo usuario autenticado deve ser operador/admin interno. Se nao, criar tabela de papeis e trocar policies amplas por policies por papel.
- Repetir periodicamente `database/audit/supabase_audit.sql` para confirmar que `dangerous_table_grant`, `dangerous_sequence_grant` e `dangerous_function_grant` seguem retornando zero linhas.

## Media prioridade aplicada

- Foi criado cache em memoria com TTL curto para listas publicas e catalogo, reduzindo consultas repetidas sem mudar a experiencia.
- A lista publica de solicitacoes invalida o cache quando uma nova solicitacao publica e criada.
- Logs de autenticacao, realtime e IA passaram por `lib/logging/logger.js`, reduzindo ruido em producao e sanitizando tokens em mensagens de erro.
- O provedor de IA foi normalizado para ASCII, preservando cache, retry, rotacao de chaves, Gemini, Mistral e fallback.
- Componentes grandes foram mapeados. Nao houve divisao estrutural nesta etapa porque os maiores componentes misturam UI sensivel e regras de negocio; a quebra deve ser feita com testes focados.
- Consultas publicas foram revisadas. A criacao e a listagem publicas usam RPCs dedicadas; o catalogo publico nao expoe estoque atual.
- Filtros de data de solicitacoes foram extraidos para `lib/solicitacoes/filters.js`, reduzindo duplicacao entre area publica e area administrativa.
- Login recebeu associacao explicita de `label` com os campos de email e senha.
- O logo visual do sistema passou a usar `public/ige-supergesso.svg`.
- Manifest, metadata e service worker passaram a usar `public/ige-supergesso.svg` como modelo de icone/logo.
- Foi criada uma suite inicial de contratos em `tests/audit/audit-contracts.test.mjs`, executada por `npm test`, sem adicionar dependencias.
- Scripts e testes de auditoria foram agrupados por uso em `scripts/audit/` e `tests/audit/`.
- Arquivos de dominio foram organizados por responsabilidade em `lib/services/`, `lib/solicitacoes/`, `lib/catalogo/`, `lib/export/`, `lib/date/`, `lib/cache/`, `lib/logging/`, `lib/messaging/` e `lib/supabase/`.
- Componentes estruturais foram agrupados em `components/layout/` e providers em `components/providers/`.
- Paginacao, cabecalhos ordenaveis e redimensionadores de colunas receberam ajustes sutis de semantica/foco.
- Foi criado `docs/browser-validation-checklist.md` para validacao manual de fluxos, teclado, responsividade, PWA e scanner.
- Foi criado `npm run audit:app:smoke` para validar rotas publicas e headers principais contra uma URL em execucao.
- O sumario do catalogo publico e interno deixou de usar links clicaveis; as paginas continuam visiveis apenas como referencia textual.
- A media prioridade do repositorio fica concluida nesta etapa. Refactors maiores de componentes devem ser feitos em ciclos menores e acompanhados por testes especificos.

## O que ainda falta da analise

### Dependencias externas ou manuais

- Executar o checklist manual em `docs/browser-validation-checklist.md` no navegador com usuario real e camera quando disponivel.
- Reavaliar paginacao administrativa quando houver volume real de dados em producao.
- Conferir periodicamente no SQL interno se `dangerous_table_grant`, `dangerous_sequence_grant` e `dangerous_function_grant` seguem retornando zero linhas.

### Baixa prioridade

- Remover `unsafe-inline` da CSP somente depois de implementar nonce/hashes e validar calendario, PWA, scanner, catalogo, graficos e rotas de IA.
- Avaliar cache distribuido para rate limit se o sistema rodar em multiplas instancias.
- Revisar bundle e imports pesados para possivel carregamento sob demanda.
- Revisar textos antigos do codigo e padronizar sem acentos se esse continuar sendo o padrao do repositorio.
- Documentar procedimentos operacionais de deploy, backup e restauracao em arquivo separado do README principal.
