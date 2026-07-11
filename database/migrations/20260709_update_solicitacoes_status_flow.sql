-- Atualiza o fluxo de status das solicitacoes de compra.
-- A tabela passa a manter somente status_geral como fonte de verdade.

do $$
declare
  constraint_name text;
  has_status_cotacao boolean;
  has_status_pedido boolean;
  has_status_transporte boolean;
  update_sql text;
begin
  alter table public.solicitacoes_compra
    add column if not exists status_geral text not null default 'nova';

  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.solicitacoes_compra'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~ 'status_(geral|cotacao|pedido|transporte)'
  loop
    execute format(
      'alter table public.solicitacoes_compra drop constraint if exists %I',
      constraint_name
    );
  end loop;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitacoes_compra'
      and column_name = 'status_cotacao'
  ) into has_status_cotacao;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitacoes_compra'
      and column_name = 'status_pedido'
  ) into has_status_pedido;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'solicitacoes_compra'
      and column_name = 'status_transporte'
  ) into has_status_transporte;

  update_sql := 'update public.solicitacoes_compra set status_geral = case ' ||
    'when status_geral in (''cancelada'')';

  if has_status_cotacao then
    update_sql := update_sql || ' or status_cotacao in (''cancelada'')';
  end if;

  if has_status_pedido then
    update_sql := update_sql || ' or status_pedido in (''pedido_cancelado'')';
  end if;

  if has_status_transporte then
    update_sql := update_sql || ' or status_transporte in (''cancelada'')';
  end if;

  update_sql := update_sql || ' then ''cancelada'' ' ||
    'when status_geral in (''concluida'', ''entregue'') then ''concluida'' ';

  if has_status_transporte then
    update_sql := update_sql ||
      'when status_transporte in (''disponivel_retirada'') then ''disponivel_retirada'' ' ||
      'when status_geral in (''em_transporte'') or status_transporte in (''transporte'') then ''transporte'' ';
  else
    update_sql := update_sql ||
      'when status_geral in (''em_transporte'') then ''transporte'' ';
  end if;

  if has_status_pedido then
    update_sql := update_sql ||
      'when status_pedido in (''aguardando_pagamento'') then ''aguardando_pagamento'' ';
  end if;

  update_sql := update_sql ||
    'when status_geral in (''aprovacao'') then ''aguardando_aprovacao'' ';

  if has_status_pedido then
    update_sql := update_sql ||
      'when status_geral in (''preparando_pedido'') or status_pedido in (''preparando_pedido'') then ''preparando_pedido'' ';
  else
    update_sql := update_sql ||
      'when status_geral in (''preparando_pedido'') then ''preparando_pedido'' ';
  end if;

  update_sql := update_sql ||
    'when status_geral in (''em_cotacao'') then ''em_cotacao'' ';

  if has_status_cotacao then
    update_sql := update_sql ||
      'when status_cotacao in (''cotando'', ''cotacao_em_analise'', ''cotacao_finalizada'', ''cotacao_aprovada'') then ''em_cotacao'' ';
  end if;

  update_sql := update_sql ||
    'when status_geral in (''nova'', ''aguardando_aprovacao'', ''aguardando_pagamento'', ''transporte'', ''disponivel_retirada'') then status_geral ' ||
    'else ''nova'' end';

  execute update_sql;

  alter table public.solicitacoes_compra
    alter column status_geral set default 'nova',
    alter column status_geral set not null,
    drop column if exists status_cotacao,
    drop column if exists status_pedido,
    drop column if exists status_transporte;

  alter table public.solicitacoes_compra
    add constraint solicitacoes_compra_status_geral_check
    check (status_geral in (
      'nova',
      'em_cotacao',
      'aguardando_aprovacao',
      'aguardando_pagamento',
      'preparando_pedido',
      'transporte',
      'disponivel_retirada',
      'concluida',
      'cancelada'
    ));
end;
$$;

drop function if exists public.criar_solicitacao_compra_publica(text, numeric, text, date, uuid, text, text, text, text, uuid);
drop function if exists public.criar_solicitacao_compra_publica(text, text, numeric, text, date, uuid, text, text, text, text, uuid);
drop function if exists public.buscar_solicitacao_compra_publica(text);
drop function if exists public.listar_solicitacoes_compra_publica();

create or replace function public.criar_solicitacao_compra_publica(
  p_nome_item text,
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
  status_geral text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_solicitacao public.solicitacoes_compra%rowtype;
begin
  if nullif(trim(coalesce(p_nome_item, '')), '') is null then
    raise exception 'Nome do item e obrigatorio.';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  if p_quantidade > 999999 then
    raise exception 'Quantidade acima do limite permitido.';
  end if;

  if coalesce(nullif(trim(p_prioridade), ''), 'media') not in ('baixa', 'media', 'alta', 'urgente') then
    raise exception 'Prioridade invalida.';
  end if;

  if length(trim(coalesce(p_nome_item, ''))) > 160 then
    raise exception 'Nome do item acima do limite de 160 caracteres.';
  end if;

  if length(trim(coalesce(p_descricao, ''))) > 500 then
    raise exception 'Descricao acima do limite de 500 caracteres.';
  end if;

  if length(trim(coalesce(p_aplicacoes, ''))) > 1000 then
    raise exception 'Aplicacoes acima do limite de 1000 caracteres.';
  end if;

  if length(trim(coalesce(p_link_referencia, ''))) > 500 then
    raise exception 'Link acima do limite de 500 caracteres.';
  end if;

  if length(trim(coalesce(p_fornecedor_nome, ''))) > 160 then
    raise exception 'Nome do fornecedor acima do limite de 160 caracteres.';
  end if;

  if length(trim(coalesce(p_fornecedor_contato, ''))) > 200 then
    raise exception 'Contato do fornecedor acima do limite de 200 caracteres.';
  end if;

  if nullif(trim(coalesce(p_link_referencia, '')), '') is not null
    and trim(p_link_referencia) !~* '^https?://'
  then
    raise exception 'Link de referencia invalido.';
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
    nome_item,
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
    status_geral
  ) values (
    trim(p_nome_item),
    nullif(trim(coalesce(p_descricao, '')), ''),
    p_quantidade,
    coalesce(nullif(trim(p_prioridade), ''), 'media'),
    p_previsao_desejada,
    p_centro_custo_id,
    nullif(trim(coalesce(p_aplicacoes, '')), ''),
    nullif(trim(coalesce(p_link_referencia, '')), ''),
    nullif(trim(coalesce(p_fornecedor_nome, '')), ''),
    nullif(trim(coalesce(p_fornecedor_contato, '')), ''),
    p_solicitante_id,
    'nova'
  )
  returning * into nova_solicitacao;

  return query
  select
    nova_solicitacao.codigo,
    nova_solicitacao.status_geral;
end;
$$;

create or replace function public.buscar_solicitacao_compra_publica(p_codigo text)
returns table (
  codigo text,
  nome_item text,
  descricao text,
  quantidade numeric,
  prioridade text,
  status_geral text,
  previsao_desejada date,
  previsao_entrega date,
  solicitante text,
  centro_custo text,
  aplicacoes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.codigo,
    s.nome_item,
    s.descricao,
    s.quantidade,
    s.prioridade,
    s.status_geral,
    s.previsao_desejada,
    s.previsao_entrega,
    sc.nome as solicitante,
    coalesce(cc.codigo || ' - ' || cc.nome, cc.nome) as centro_custo,
    s.aplicacoes,
    s.created_at,
    s.updated_at
  from public.solicitacoes_compra s
  left join public.solicitantes_compra sc on sc.id = s.solicitante_id
  left join public.centros_custo cc on cc.id = s.centro_custo_id
  where upper(trim(s.codigo)) = upper(trim(p_codigo))
    and s.visivel_publico = 1
  limit 1;
$$;

create or replace function public.listar_solicitacoes_compra_publica()
returns table (
  codigo text,
  nome_item text,
  descricao text,
  quantidade numeric,
  prioridade text,
  status_geral text,
  previsao_desejada date,
  previsao_entrega date,
  solicitante text,
  centro_custo text,
  aplicacoes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.codigo,
    s.nome_item,
    s.descricao,
    s.quantidade,
    s.prioridade,
    s.status_geral,
    s.previsao_desejada,
    s.previsao_entrega,
    sc.nome as solicitante,
    coalesce(cc.codigo || ' - ' || cc.nome, cc.nome) as centro_custo,
    s.aplicacoes,
    s.created_at,
    s.updated_at
  from public.solicitacoes_compra s
  left join public.solicitantes_compra sc on sc.id = s.solicitante_id
  left join public.centros_custo cc on cc.id = s.centro_custo_id
  where s.visivel_publico = 1
  order by s.created_at desc
  limit 100;
$$;

grant execute on function public.criar_solicitacao_compra_publica(text, text, numeric, text, date, uuid, text, text, text, text, uuid)
to anon, authenticated;
grant execute on function public.buscar_solicitacao_compra_publica(text)
to anon, authenticated;
grant execute on function public.listar_solicitacoes_compra_publica()
to anon, authenticated;

notify pgrst, 'reload schema';
