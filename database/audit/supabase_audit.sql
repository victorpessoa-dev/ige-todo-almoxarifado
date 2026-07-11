-- Auditoria Supabase somente leitura.
-- Status: auditoria aplicada no ambiente real apos hardening.
-- Rode novamente como rotina de verificacao ou depois de qualquer mudanca no banco.

-- Passo 1: RLS deve estar ativo em todas as tabelas operacionais.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'tarefas',
    'lembretes',
    'produtos',
    'movimentacoes_estoque',
    'solicitacoes_compra',
    'solicitantes_compra',
    'centros_custo'
  )
order by tablename;

-- Passo 2: policies efetivas. Use este resultado para confirmar se anonimo
-- acessa somente fluxos publicos e se authenticated continua sendo operador interno.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Passo 3: grants diretos. Este bloco lista a permissao real para anon/authenticated.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Passo 4: grants perigosos. Resultado esperado: zero linhas.
-- Se houver qualquer linha, rode database/audit/supabase_hardening_fix.sql.
select
  'dangerous_table_grant' as check_name,
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and (
    grantee = 'anon'
    and table_name in (
      'tarefas',
      'lembretes',
      'produtos',
      'movimentacoes_estoque',
      'solicitacoes_compra',
      'solicitantes_compra',
      'centros_custo'
    )
    and not (
      table_name in ('solicitantes_compra', 'centros_custo')
      and privilege_type = 'SELECT'
    )
  )
order by table_name, grantee, privilege_type;

-- Passo 4b: grants perigosos em sequencias. Resultado esperado: zero linhas.
select
  'dangerous_sequence_grant' as check_name,
  object_schema,
  object_name,
  grantee,
  privilege_type
from information_schema.usage_privileges
where object_schema = 'public'
  and object_type = 'SEQUENCE'
  and grantee = 'anon'
order by object_name, grantee, privilege_type;

-- Passo 4c: EXECUTE perigoso em funcoes internas. Resultado esperado: zero linhas.
select
  'dangerous_function_grant' as check_name,
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type = 'EXECUTE'
  and routine_name not in (
    'criar_solicitacao_compra_publica',
    'buscar_solicitacao_compra_publica',
    'listar_solicitacoes_compra_publica',
    'listar_produtos_catalogo_publico'
  )
order by routine_name, grantee;

-- Funcoes expostas para anon/authenticated. Funcoes publicas podem existir, mas
-- devem retornar somente dados limitados e validar entrada internamente.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by routine_name, grantee;

-- Security definer exige revisao especial porque executa com privilegio do dono.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  p.proconfig as config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- Indices principais para avaliar consultas recorrentes e gargalos por volume.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- Realtime usado pela area administrativa. Deve conter as tabelas esperadas.
select
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;

-- Storage. O repositorio nao usa buckets diretamente; qualquer bucket real
-- precisa ter leitura/escrita revisada antes de ser considerado seguro.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by name;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
