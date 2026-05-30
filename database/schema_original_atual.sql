-- Schema original do projeto atual.
-- Use este arquivo para criar o banco do zero no Supabase.

create extension if not exists pgcrypto;

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  titulo text not null,
  descricao text,
  responsavel text,
  status text not null default 'a_fazer',
  prioridade text not null default 'medio',
  data date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lembretes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  titulo text not null,
  conteudo text,
  destinatario text,
  status text not null default 'a_fazer',
  prioridade text not null default 'medio',
  data date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  cod text not null unique,
  nome text not null,
  cod_barra text,
  categoria text,
  aplicacao text,
  medidas text,
  marcas text,
  img_url text,
  estoque numeric not null default 0,
  min numeric not null default 0,
  max numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  produto_id uuid references public.produtos(id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade numeric not null check (quantidade > 0),
  motivo text,
  created_at timestamptz not null default now()
);

create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solicitantes_compra (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  centro_custo_id uuid references public.centros_custo(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solicitacoes_compra (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  user_id uuid references auth.users(id) on delete set null,
  produto_id uuid references public.produtos(id) on delete set null,
  solicitante_id uuid references public.solicitantes_compra(id) on delete set null,
  centro_custo_id uuid references public.centros_custo(id) on delete set null,
  descricao text not null,
  quantidade numeric not null default 1 check (quantidade > 0),
  prioridade text not null default 'media',
  status_geral text not null default 'nova',
  status_cotacao text not null default 'nao_iniciado',
  status_pedido text not null default 'nao_digitado',
  status_transporte text not null default 'producao_separacao',
  valor_unitario numeric,
  valor_total numeric,
  data_solicitacao timestamptz not null default now(),
  previsao_desejada date,
  previsao_entrega date,
  solicitante text not null,
  centro_custo text,
  aplicacoes text,
  link_referencia text,
  visivel_publico smallint not null default 0 check (visivel_publico in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tarefas_created_at_idx on public.tarefas (created_at desc);
create index if not exists lembretes_created_at_idx on public.lembretes (created_at desc);
create index if not exists produtos_nome_idx on public.produtos (nome);
create index if not exists produtos_cod_barra_idx on public.produtos (cod_barra);
create index if not exists movimentacoes_estoque_produto_idx on public.movimentacoes_estoque (produto_id, created_at desc);
create index if not exists solicitantes_compra_nome_idx on public.solicitantes_compra (nome);
create index if not exists solicitantes_compra_centro_custo_idx on public.solicitantes_compra (centro_custo_id);
create index if not exists centros_custo_nome_idx on public.centros_custo (nome);
create index if not exists solicitacoes_compra_status_idx on public.solicitacoes_compra (status_geral);
create index if not exists solicitacoes_compra_prioridade_idx on public.solicitacoes_compra (prioridade);
create index if not exists solicitacoes_compra_created_at_idx on public.solicitacoes_compra (created_at desc);
create index if not exists solicitacoes_compra_visivel_publico_idx
  on public.solicitacoes_compra (visivel_publico, created_at desc);

create sequence if not exists public.solicitacoes_compra_codigo_seq;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create or replace function public.set_solicitacao_compra_codigo()
returns trigger as $$
declare
  solicitante_nome text;
  centro_custo_nome text;
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := lpad(nextval('public.solicitacoes_compra_codigo_seq')::text, 6, '0');
  end if;

  if new.solicitante_id is not null then
    select nome into solicitante_nome
    from public.solicitantes_compra
    where id = new.solicitante_id;

    if solicitante_nome is not null then
      new.solicitante := solicitante_nome;
    end if;
  end if;

  if new.centro_custo_id is not null then
    select coalesce(codigo || ' - ' || nome, nome) into centro_custo_nome
    from public.centros_custo
    where id = new.centro_custo_id;

    if centro_custo_nome is not null then
      new.centro_custo := centro_custo_nome;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tarefas_updated_at on public.tarefas;
create trigger trg_tarefas_updated_at
before update on public.tarefas
for each row execute function public.set_updated_at();

drop trigger if exists trg_lembretes_updated_at on public.lembretes;
create trigger trg_lembretes_updated_at
before update on public.lembretes
for each row execute function public.set_updated_at();

drop trigger if exists trg_produtos_updated_at on public.produtos;
create trigger trg_produtos_updated_at
before update on public.produtos
for each row execute function public.set_updated_at();

drop trigger if exists trg_solicitantes_compra_updated_at on public.solicitantes_compra;
create trigger trg_solicitantes_compra_updated_at
before update on public.solicitantes_compra
for each row execute function public.set_updated_at();

drop trigger if exists trg_centros_custo_updated_at on public.centros_custo;
create trigger trg_centros_custo_updated_at
before update on public.centros_custo
for each row execute function public.set_updated_at();

drop trigger if exists trg_solicitacao_compra_codigo on public.solicitacoes_compra;
create trigger trg_solicitacao_compra_codigo
before insert or update on public.solicitacoes_compra
for each row execute function public.set_solicitacao_compra_codigo();

create or replace function public.criar_solicitacao_compra_publica(
  p_descricao text,
  p_quantidade numeric,
  p_prioridade text,
  p_previsao_desejada date,
  p_centro_custo_id uuid,
  p_aplicacoes text,
  p_link_referencia text,
  p_solicitante_id uuid
)
returns table (
  codigo text,
  status_geral text,
  status_cotacao text,
  status_pedido text,
  status_transporte text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_solicitacao public.solicitacoes_compra%rowtype;
begin
  if nullif(trim(p_descricao), '') is null then
    raise exception 'Descrição do item é obrigatória.';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  if not exists (
    select 1 from public.solicitantes_compra
    where id = p_solicitante_id and ativo = true
  ) then
    raise exception 'Solicitante invalido ou inativo.';
  end if;

  if not exists (
    select 1 from public.centros_custo
    where id = p_centro_custo_id and ativo = true
  ) then
    raise exception 'Centro de custo invalido ou inativo.';
  end if;

  insert into public.solicitacoes_compra (
    descricao,
    quantidade,
    prioridade,
    previsao_desejada,
    centro_custo_id,
    aplicacoes,
    link_referencia,
    solicitante_id,
    status_geral,
    status_cotacao,
    status_pedido,
    status_transporte,
    data_solicitacao
  ) values (
    trim(p_descricao),
    p_quantidade,
    coalesce(nullif(trim(p_prioridade), ''), 'media'),
    p_previsao_desejada,
    p_centro_custo_id,
    nullif(trim(coalesce(p_aplicacoes, '')), ''),
    nullif(trim(coalesce(p_link_referencia, '')), ''),
    p_solicitante_id,
    'nova',
    'nao_iniciado',
    'nao_digitado',
    'producao_separacao',
    now()
  )
  returning * into nova_solicitacao;

  return query
  select
    nova_solicitacao.codigo,
    nova_solicitacao.status_geral,
    nova_solicitacao.status_cotacao,
    nova_solicitacao.status_pedido,
    nova_solicitacao.status_transporte;
end;
$$;

create or replace function public.buscar_solicitacao_compra_publica(p_codigo text)
returns table (
  codigo text,
  descricao text,
  quantidade numeric,
  prioridade text,
  status_geral text,
  status_cotacao text,
  status_pedido text,
  status_transporte text,
  previsao_desejada date,
  previsao_entrega date,
  solicitante text,
  centro_custo text,
  data_solicitacao timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.codigo,
    s.descricao,
    s.quantidade,
    s.prioridade,
    s.status_geral,
    s.status_cotacao,
    s.status_pedido,
    s.status_transporte,
    s.previsao_desejada,
    s.previsao_entrega,
    s.solicitante,
    s.centro_custo,
    s.data_solicitacao,
    s.updated_at
  from public.solicitacoes_compra s
  where upper(trim(s.codigo)) = upper(trim(p_codigo))
    and s.visivel_publico = 1
  limit 1;
$$;

create or replace function public.listar_solicitacoes_compra_publica()
returns table (
  codigo text,
  descricao text,
  quantidade numeric,
  prioridade text,
  status_geral text,
  status_cotacao text,
  status_pedido text,
  status_transporte text,
  previsao_desejada date,
  previsao_entrega date,
  solicitante text,
  centro_custo text,
  data_solicitacao timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.codigo,
    s.descricao,
    s.quantidade,
    s.prioridade,
    s.status_geral,
    s.status_cotacao,
    s.status_pedido,
    s.status_transporte,
    s.previsao_desejada,
    s.previsao_entrega,
    s.solicitante,
    s.centro_custo,
    s.data_solicitacao,
    s.updated_at
  from public.solicitacoes_compra s
  where s.visivel_publico = 1
  order by s.created_at desc
  limit 100;
$$;

create or replace function public.listar_produtos_catalogo_publico()
returns table (
  id uuid,
  cod text,
  nome text,
  cod_barra text,
  categoria text,
  aplicacao text,
  medidas text,
  marcas text,
  img_url text,
  min numeric,
  max numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.cod,
    p.nome,
    p.cod_barra,
    p.categoria,
    p.aplicacao,
    p.medidas,
    p.marcas,
    p.img_url,
    p.min,
    p.max,
    p.created_at
  from public.produtos p
  order by p.nome asc;
$$;

grant execute on function public.criar_solicitacao_compra_publica(text, numeric, text, date, uuid, text, text, uuid)
to anon, authenticated;

grant execute on function public.buscar_solicitacao_compra_publica(text)
to anon, authenticated;

grant execute on function public.listar_solicitacoes_compra_publica()
to anon, authenticated;

grant execute on function public.listar_produtos_catalogo_publico()
to anon, authenticated;

alter table public.tarefas enable row level security;
alter table public.lembretes enable row level security;
alter table public.produtos enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.solicitacoes_compra enable row level security;
alter table public.solicitantes_compra enable row level security;
alter table public.centros_custo enable row level security;

drop policy if exists "Authenticated users can manage tasks" on public.tarefas;
create policy "Authenticated users can manage tasks"
on public.tarefas for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage reminders" on public.lembretes;
create policy "Authenticated users can manage reminders"
on public.lembretes for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage products" on public.produtos;
create policy "Authenticated users can manage products"
on public.produtos for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage stock movements" on public.movimentacoes_estoque;
create policy "Authenticated users can manage stock movements"
on public.movimentacoes_estoque for all to authenticated
using (true) with check (true);

drop policy if exists "Public can read active requesters" on public.solicitantes_compra;
create policy "Public can read active requesters"
on public.solicitantes_compra for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Authenticated users can manage requesters" on public.solicitantes_compra;
create policy "Authenticated users can manage requesters"
on public.solicitantes_compra for all to authenticated
using (true) with check (true);

drop policy if exists "Public can read active cost centers" on public.centros_custo;
create policy "Public can read active cost centers"
on public.centros_custo for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Authenticated users can manage cost centers" on public.centros_custo;
create policy "Authenticated users can manage cost centers"
on public.centros_custo for all to authenticated
using (true) with check (true);

drop policy if exists "Public can create purchase requests" on public.solicitacoes_compra;
create policy "Public can create purchase requests"
on public.solicitacoes_compra for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated users can manage purchase requests" on public.solicitacoes_compra;
create policy "Authenticated users can manage purchase requests"
on public.solicitacoes_compra for all to authenticated
using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.tarefas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.lembretes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.produtos;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.movimentacoes_estoque;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.solicitacoes_compra;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.solicitantes_compra;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.centros_custo;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
