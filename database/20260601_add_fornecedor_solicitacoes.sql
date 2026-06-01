-- Incremento: fornecedor opcional nas solicitacoes de compra e acesso publico anonimo.
-- Execute este arquivo em bancos que ja existem.

alter table public.solicitacoes_compra
  add column if not exists fornecedor_nome text,
  add column if not exists fornecedor_contato text;

drop function if exists public.criar_solicitacao_compra_publica(
  text,
  numeric,
  text,
  date,
  uuid,
  text,
  text,
  uuid
);

create or replace function public.criar_solicitacao_compra_publica(
  p_descricao text,
  p_quantidade numeric,
  p_prioridade text,
  p_previsao_desejada date,
  p_centro_custo_id uuid,
  p_aplicacoes text,
  p_link_referencia text,
  p_fornecedor_nome text,
  p_fornecedor_contato text,
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
    raise exception 'Descricao do item e obrigatoria.';
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
    fornecedor_nome,
    fornecedor_contato,
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
    nullif(trim(coalesce(p_fornecedor_nome, '')), ''),
    nullif(trim(coalesce(p_fornecedor_contato, '')), ''),
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

grant usage on schema public to anon, authenticated;

grant execute on function public.criar_solicitacao_compra_publica(
  text,
  numeric,
  text,
  date,
  uuid,
  text,
  text,
  text,
  text,
  uuid
)
to anon, authenticated;

grant execute on function public.buscar_solicitacao_compra_publica(text)
to anon, authenticated;

grant execute on function public.listar_solicitacoes_compra_publica()
to anon, authenticated;

grant select on public.solicitantes_compra to anon, authenticated;
grant select on public.centros_custo to anon, authenticated;
grant insert on public.solicitacoes_compra to anon, authenticated;
grant usage, select on sequence public.solicitacoes_compra_codigo_seq to anon, authenticated;

alter table public.solicitacoes_compra enable row level security;
alter table public.solicitantes_compra enable row level security;
alter table public.centros_custo enable row level security;

drop policy if exists "Public can read active requesters" on public.solicitantes_compra;
create policy "Public can read active requesters"
on public.solicitantes_compra for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Public can read active cost centers" on public.centros_custo;
create policy "Public can read active cost centers"
on public.centros_custo for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Public can create purchase requests" on public.solicitacoes_compra;
create policy "Public can create purchase requests"
on public.solicitacoes_compra for insert
to anon, authenticated
with check (true);

notify pgrst, 'reload schema';
