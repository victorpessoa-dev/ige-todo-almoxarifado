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
- Se o sistema passar a ter perfis diferentes, as policies devem ser refinadas por papel antes de liberar novos acessos.
- As funcoes publicas de solicitacao limitam os dados expostos ao publico.
- Criacao publica de solicitacao deve passar pela funcao `criar_solicitacao_compra_publica`; o papel `anon` nao deve ter insert direto em `solicitacoes_compra`.
- O catalogo publico usa funcao dedicada e nao expoe estoque atual.

## Headers

Headers de seguranca ficam em `next.config.mjs`.

A CSP atual preserva compatibilidade com o stack existente e ainda permite `unsafe-inline` e `unsafe-eval`. Para endurecer essa politica, faca uma etapa dedicada com validacao visual, PWA, scanner, calendario, catalogo e rotas de IA.

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
- Foi criado `database/security_audit_queries.sql` para comparar o Supabase real com o schema versionado.

## Superficies publicas revisadas

- `/`: entrada publica que encaminha para o fluxo publico.
- `/login`: autenticacao administrativa.
- `/solicitar`: criacao e acompanhamento publico de solicitacoes.
- `/catalogo-publico`: consulta publica do catalogo sem estoque atual.
- `/api/analyze`: IA para contagem por imagem, com validacao de imagens e rate limit.
- `/api/inventory-scan-assist`: IA para apoio ao scanner, com validacao de imagem, limite de catalogo e rate limit.
- `/api/inventory-turnover-analysis`: IA para analise de giro, com limite de produtos e rate limit.

## O que ainda depende do ambiente Supabase

- Rodar `database/security_audit_queries.sql` no SQL Editor do Supabase e comparar o resultado com `database/schema_original_atual.sql`.
- Confirmar se existem buckets de Storage em producao. O repositorio nao mostra uso direto de Storage.
- Confirmar se todo usuario autenticado deve ser operador/admin interno. Se nao, criar tabela de papeis e trocar policies amplas por policies por papel.
- Reaplicar o SQL revisado no Supabase para remover grants antigos do papel `anon`.

## Media prioridade aplicada

- Foi criado cache em memoria com TTL curto para listas publicas e catalogo, reduzindo consultas repetidas sem mudar a experiencia.
- A lista publica de solicitacoes invalida o cache quando uma nova solicitacao publica e criada.
- Logs de autenticacao, realtime e IA passaram por `lib/logger.js`, reduzindo ruido em producao e sanitizando tokens em mensagens de erro.
- O provedor de IA foi normalizado para ASCII, preservando cache, retry, rotacao de chaves, Gemini, Mistral e fallback.
- Componentes grandes foram mapeados. Nao houve divisao estrutural nesta etapa porque os maiores componentes misturam UI sensivel e regras de negocio; a quebra deve ser feita com testes focados.
- Consultas publicas foram revisadas. A criacao e a listagem publicas usam RPCs dedicadas; o catalogo publico nao expoe estoque atual.

## O que ainda falta da analise

### Media prioridade restante

- Criar uma suite de testes antes de refatorar componentes grandes de inventario, solicitacoes e scanner.
- Extrair gradualmente logicas puras de `ImportExportProdutos`, `BarcodeScannerCard`, `SolicitacaoDetailsDialog` e paginas grandes, mantendo o layout intacto.
- Revisar consultas administrativas que carregam listas completas e avaliar paginacao no banco quando o volume real crescer.
- Validar acessibilidade por teclado nos dialogs, tabelas, filtros, scanner e painel em navegador.

### Baixa prioridade

- Endurecer CSP em uma etapa dedicada, removendo `unsafe-inline` e `unsafe-eval` somente depois de validar calendario, PWA, scanner, catalogo, graficos e rotas de IA.
- Avaliar cache distribuido para rate limit se o sistema rodar em multiplas instancias.
- Revisar bundle e imports pesados para possivel carregamento sob demanda.
- Revisar textos antigos do codigo e padronizar sem acentos se esse continuar sendo o padrao do repositorio.
- Documentar procedimentos operacionais de deploy, backup e restauracao em arquivo separado do README principal.
