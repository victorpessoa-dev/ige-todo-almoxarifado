-- Endurece rotinas de revisao de estoque contra duplicidade, adiamento infinito e falta de auditoria.

alter table public.revisoes_estoque
  add column if not exists adiada_count integer not null default 0;

alter table public.revisoes_estoque_itens
  add column if not exists quantidade_contada numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.revisoes_estoque'::regclass
      and conname = 'revisoes_estoque_adiada_count_check'
  ) then
    alter table public.revisoes_estoque
      add constraint revisoes_estoque_adiada_count_check check (adiada_count >= 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.revisoes_estoque_itens'::regclass
      and conname = 'revisoes_estoque_itens_quantidade_contada_check'
  ) then
    alter table public.revisoes_estoque_itens
      add constraint revisoes_estoque_itens_quantidade_contada_check
      check (quantidade_contada is null or quantidade_contada >= 0);
  end if;
end;
$$;

do $$
declare
  v_status_check text;
begin
  select pg_get_constraintdef(oid) into v_status_check
  from pg_constraint
  where conrelid = 'public.revisoes_estoque_itens'::regclass
    and conname = 'revisoes_estoque_itens_status_check';

  if v_status_check is null then
    alter table public.revisoes_estoque_itens
      add constraint revisoes_estoque_itens_status_check
      check (status in ('pendente', 'ok', 'repor', 'em_falta', 'nao_verificado'));
  elsif v_status_check not like '%nao_verificado%' then
    alter table public.revisoes_estoque_itens
      drop constraint revisoes_estoque_itens_status_check;

    alter table public.revisoes_estoque_itens
      add constraint revisoes_estoque_itens_status_check
      check (status in ('pendente', 'ok', 'repor', 'em_falta', 'nao_verificado'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'revisoes_estoque_rotina_aberta_unica'
  ) then
    create unique index revisoes_estoque_rotina_aberta_unica
      on public.revisoes_estoque (rotina_id)
      where status in ('pendente', 'em_andamento', 'atrasada');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'revisoes_estoque_itens_produto_reposicao_aberta_unica'
  ) then
    create unique index revisoes_estoque_itens_produto_reposicao_aberta_unica
      on public.revisoes_estoque_itens (produto_id)
      where produto_id is not null
        and status in ('repor', 'em_falta')
        and solicitacao_item_id is null;
  end if;
end;
$$;

create table if not exists public.revisoes_estoque_itens_historico (
  id uuid primary key default gen_random_uuid(),
  revisao_item_id uuid not null references public.revisoes_estoque_itens(id) on delete cascade,
  revisao_id uuid not null references public.revisoes_estoque(id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  observacao text,
  quantidade_contada numeric,
  marcado_por uuid references auth.users(id) on delete set null,
  marcado_em timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'revisoes_estoque_itens_historico_item_idx'
  ) then
    create index revisoes_estoque_itens_historico_item_idx
      on public.revisoes_estoque_itens_historico (revisao_item_id, marcado_em desc);
  end if;
end;
$$;

create or replace function public.registrar_historico_item_revisao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and (
      old.status is distinct from new.status
      or old.observacao is distinct from new.observacao
      or old.quantidade_contada is distinct from new.quantidade_contada
    )
  then
    insert into public.revisoes_estoque_itens_historico (
      revisao_item_id,
      revisao_id,
      status_anterior,
      status_novo,
      observacao,
      quantidade_contada,
      marcado_por,
      marcado_em
    ) values (
      new.id,
      new.revisao_id,
      old.status,
      new.status,
      new.observacao,
      new.quantidade_contada,
      coalesce(new.revisado_por, auth.uid()),
      coalesce(new.revisado_em, now())
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_revisoes_estoque_itens_historico'
      and tgrelid = 'public.revisoes_estoque_itens'::regclass
      and not tgisinternal
  ) then
    create trigger trg_revisoes_estoque_itens_historico
    after update on public.revisoes_estoque_itens
    for each row execute function public.registrar_historico_item_revisao();
  end if;
end;
$$;

create or replace function public.proximo_dia_util_revisao(
  p_data timestamptz,
  p_dias_bloqueados smallint[] default '{}'
)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v_data timestamptz := p_data;
begin
  while extract(dow from v_data)::smallint = any(coalesce(p_dias_bloqueados, '{}')) loop
    v_data := v_data + interval '1 day';
  end loop;

  return v_data;
end;
$$;

alter table public.revisoes_estoque_itens_historico enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'revisoes_estoque_itens_historico'
      and policyname = 'Users read own stock review item history'
  ) then
    create policy "Users read own stock review item history"
    on public.revisoes_estoque_itens_historico for select to authenticated
    using (exists (select 1 from public.revisoes_estoque r where r.id = revisao_id and r.user_id = auth.uid()));
  end if;
end;
$$;

grant select on public.revisoes_estoque_itens_historico to authenticated;
grant execute on function public.proximo_dia_util_revisao(timestamptz, smallint[]) to authenticated;

notify pgrst, 'reload schema';