-- Consultas de auditoria para rodar no SQL Editor do Supabase.
-- Este arquivo nao altera dados. Ele apenas lista configuracoes de seguranca.

-- RLS por tabela publica usada pelo sistema.
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

-- Policies aplicadas.
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

-- Grants diretos em tabelas.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Grants em sequencias.
select
  object_schema,
  object_name,
  grantee,
  privilege_type
from information_schema.usage_privileges
where object_schema = 'public'
  and object_type = 'SEQUENCE'
  and grantee in ('anon', 'authenticated')
order by object_name, grantee, privilege_type;

-- Funcoes expostas para anon/authenticated.
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by routine_name, grantee;

-- Funcoes security definer no schema publico.
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

-- Indices principais.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- Publicacao realtime.
select
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;

-- Buckets de Storage, se existirem.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by name;

-- Policies de Storage, se existirem.
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
