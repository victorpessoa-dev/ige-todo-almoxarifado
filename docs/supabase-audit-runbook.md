# Runbook de auditoria Supabase

Este procedimento fecha a parte da auditoria que depende do ambiente real do Supabase.

## Objetivo

Confirmar se o banco aplicado em producao esta alinhado com o schema versionado em:

- RLS;
- policies;
- grants;
- funcoes publicas;
- funcoes `security definer`;
- indices;
- realtime;
- buckets e policies de Storage.

## Antes de comecar

- Garanta acesso ao SQL Editor do projeto correto no Supabase.
- Confirme que o arquivo local revisado e `database/schema_original_atual.sql`.
- Nao rode alteracoes direto em producao antes de revisar o resultado das consultas de auditoria.

## Passo 1 - Rodar auditoria somente leitura

Antes do SQL Editor, rode a auditoria publica automatizada pelo repositorio:

```bash
npm run audit:supabase:public
```

Esse comando usa apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Ele nao cria, altera ou remove dados. Ele valida a superficie publica exposta via REST, RPC e Storage.

Se esse comando falhar, investigue antes de seguir para a etapa SQL.

## Passo 2 - Rodar auditoria SQL somente leitura

No SQL Editor do Supabase, rode:

```txt
database/audit/supabase_audit.sql
```

Esse arquivo nao altera dados. Ele apenas lista configuracoes aplicadas.

## Passo 3 - Conferir RLS

Status da auditoria atual: confirmado no Supabase real. Todas as tabelas principais apareceram com `rowsecurity = true`.

Todas estas tabelas devem estar com RLS ativo:

- `tarefas`
- `lembretes`
- `produtos`
- `movimentacoes_estoque`
- `solicitacoes_compra`
- `solicitantes_compra`
- `centros_custo`

Se alguma aparecer com RLS desligado, reaplique o bloco de RLS do arquivo:

```txt
database/schema_original_atual.sql
```

## Observacao sobre realtime

Status da auditoria atual: confirmado no Supabase real com todas as tabelas esperadas na publicacao.

O resultado esperado da publicacao `supabase_realtime` inclui:

- `tarefas`
- `lembretes`
- `produtos`
- `movimentacoes_estoque`
- `solicitacoes_compra`
- `solicitantes_compra`
- `centros_custo`

## Passo 4 - Conferir grants perigosos

O papel `anon` nao deve ter:

- `INSERT` direto em `solicitacoes_compra`;
- `UPDATE` em tabelas administrativas;
- `DELETE` em tabelas administrativas;
- `USAGE` ou `SELECT` na sequencia `solicitacoes_compra_codigo_seq`.

Status da auditoria atual: divergencia encontrada no Supabase real. O papel `anon` ainda possui grants diretos amplos em tabelas administrativas e na sequencia `solicitacoes_compra_codigo_seq`.

Para corrigir, rode:

```txt
database/audit/supabase_hardening_fix.sql
```

No arquivo `database/audit/supabase_audit.sql`, as consultas `dangerous_table_grant` e `dangerous_sequence_grant` devem retornar zero linhas.

A consulta `dangerous_function_grant` tambem deve retornar zero linhas. Somente estas RPCs devem continuar expostas para `anon`:

- `criar_solicitacao_compra_publica`
- `buscar_solicitacao_compra_publica`
- `listar_solicitacoes_compra_publica`
- `listar_produtos_catalogo_publico`

## Passo 5 - Conferir criacao publica de solicitacao

A criacao publica deve acontecer somente por:

```txt
criar_solicitacao_compra_publica
```

O `anon` pode executar essa funcao, mas nao deve inserir diretamente na tabela.

## Passo 6 - Conferir leitura publica

O publico pode acessar somente dados limitados por:

- `buscar_solicitacao_compra_publica`
- `listar_solicitacoes_compra_publica`
- `listar_produtos_catalogo_publico`

O catalogo publico nao deve retornar estoque atual.

## Passo 7 - Conferir usuarios autenticados

Hoje o schema trata qualquer usuario autenticado como operador interno.

Isso esta correto somente se todos os usuarios autenticados forem administradores ou operadores confiaveis.

Decisao operacional atual: existe somente uma conta de acesso e qualquer nova conta teria as mesmas permissoes. Isso confirma que o modelo atual de `authenticated` como operador interno esta aceito por enquanto.

Se houver usuarios autenticados com acesso limitado, a proxima etapa deve ser criar controle por papel antes de cadastrar esses usuarios.

## Passo 8 - Conferir Storage

Se a auditoria listar buckets em `storage.buckets`, confirme:

- se o bucket precisa ser publico;
- quais MIME types sao permitidos;
- limite de tamanho;
- policies de leitura;
- policies de escrita;
- se `anon` pode inserir, atualizar ou deletar arquivos.

Status da auditoria atual: confirmado no Supabase real sem buckets retornados.

O repositorio atual nao mostra uso direto de Supabase Storage. Portanto, qualquer bucket criado no futuro deve ser revisado manualmente.

## Passo 9 - Registrar resultado

Registre no historico da auditoria:

- data da verificacao;
- ambiente verificado;
- divergencias encontradas;
- SQL reaplicado, se houver;
- decisoes sobre usuarios autenticados e Storage.

## Criterio de aceite

A auditoria do Supabase pode ser considerada fechada quando:

- RLS estiver ativo nas tabelas principais;
- `anon` nao tiver insert direto em `solicitacoes_compra`;
- as consultas de grants perigosos retornarem zero linhas;
- a consulta de funcoes perigosas retornar zero linhas;
- funcoes publicas retornarem apenas dados limitados;
- Storage tiver permissao revisada ou for confirmado como nao usado;
- a regra de usuario autenticado como operador/admin estiver confirmada pela operacao.
