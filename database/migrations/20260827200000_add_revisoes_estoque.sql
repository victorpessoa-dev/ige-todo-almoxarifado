-- Modulo incremental de rotinas de revisao de estoque.
-- Nao altera ou remove dados existentes de produtos, movimentacoes ou solicitacoes.

create table if not exists public.rotinas_revisao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 160),
  tipo text not null check (tipo in ('produtos', 'checklist')),
  categoria text,
  horario time not null,
  frequencia text not null default 'diaria' check (frequencia in ('diaria', 'intervalo_dias', 'semanal')),
  intervalo_dias integer not null default 1 check (intervalo_dias between 1 and 365),
  dias_bloqueados smallint[] not null default '{}',
  foco text not null default 'inteligente' check (foco in ('estoque_baixo', 'pendencias', 'completa', 'inteligente')),
  repetir_notificacao_minutos integer not null default 10 check (repetir_notificacao_minutos between 5 and 240),
  janela_revisao integer not null default 480 check (janela_revisao between 30 and 1440),
  ativo boolean not null default true,
  ultima_execucao timestamptz,
  proxima_execucao timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rotinas_revisao_tipo_categoria check (
    (tipo = 'produtos' and nullif(trim(coalesce(categoria, '')), '') is not null)
    or tipo = 'checklist'
  ),
  constraint rotinas_revisao_dias_validos check (
    coalesce(array_length(dias_bloqueados, 1), 0) = 0
    or dias_bloqueados <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  )
);

create table if not exists public.itens_checklist_revisao (
  id uuid primary key default gen_random_uuid(),
  rotina_id uuid not null references public.rotinas_revisao(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 160),
  descricao text,
  ordem integer not null default 0 check (ordem >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revisoes_estoque (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rotina_id uuid not null references public.rotinas_revisao(id) on delete cascade,
  agendada_para timestamptz not null,
  iniciada_em timestamptz,
  concluida_em timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  notificar_em timestamptz,
  ultima_notificacao_em timestamptz,
  adiada_ate timestamptz,
  adiada_count integer not null default 0 check (adiada_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revisoes_estoque_itens (
  id uuid primary key default gen_random_uuid(),
  revisao_id uuid not null references public.revisoes_estoque(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  checklist_item_id uuid references public.itens_checklist_revisao(id) on delete set null,
  nome_snapshot text not null check (length(trim(nome_snapshot)) between 1 and 160),
  status text not null default 'pendente' check (status in ('pendente', 'ok', 'repor', 'em_falta', 'nao_verificado')),
  observacao text,
  quantidade_contada numeric check (quantidade_contada is null or quantidade_contada >= 0),
  revisado_em timestamptz,
  revisado_por uuid references auth.users(id) on delete set null,
  solicitacao_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revisoes_estoque_itens_origem check (
    (produto_id is not null and checklist_item_id is null)
    or (produto_id is null and checklist_item_id is not null)
  )
);

create table if not exists public.solicitacoes_compra_itens (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes_compra(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome_item text not null check (length(trim(nome_item)) between 1 and 160),
  quantidade numeric not null default 1 check (quantidade > 0),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  status text not null default 'pendente' check (status in ('pendente', 'comprado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.revisoes_estoque_itens'::regclass
      and conname = 'revisoes_estoque_itens_solicitacao_item_fkey'
  ) then
    alter table public.revisoes_estoque_itens
      add constraint revisoes_estoque_itens_solicitacao_item_fkey
      foreign key (solicitacao_item_id) references public.solicitacoes_compra_itens(id) on delete set null;
  end if;
end;
$$;

-- Cada pedido legado continua representado por um item no novo modelo 1:N.
insert into public.solicitacoes_compra_itens (
  solicitacao_id, produto_id, nome_item, quantidade, prioridade, status, created_at, updated_at
)
select id, produto_id, nome_item, quantidade, prioridade, 'pendente', created_at, updated_at
from public.solicitacoes_compra
on conflict do nothing;

create unique index if not exists solicitacoes_compra_itens_produto_unico
  on public.solicitacoes_compra_itens (solicitacao_id, produto_id)
  where produto_id is not null;
create unique index if not exists solicitacoes_compra_itens_manual_unico
  on public.solicitacoes_compra_itens (solicitacao_id, lower(nome_item))
  where produto_id is null;
create index if not exists rotinas_revisao_usuario_proxima_idx on public.rotinas_revisao (user_id, proxima_execucao) where ativo;
create index if not exists revisoes_estoque_usuario_status_idx on public.revisoes_estoque (user_id, status, agendada_para);
create index if not exists revisoes_estoque_rotina_idx on public.revisoes_estoque (rotina_id, agendada_para desc);
create unique index if not exists revisoes_estoque_rotina_aberta_unica on public.revisoes_estoque (rotina_id) where status in ('pendente', 'em_andamento', 'atrasada');
create index if not exists revisoes_estoque_itens_revisao_idx on public.revisoes_estoque_itens (revisao_id, status);
create index if not exists revisoes_estoque_itens_produto_idx on public.revisoes_estoque_itens (produto_id, revisado_em desc);
create unique index if not exists revisoes_estoque_itens_produto_reposicao_aberta_unica on public.revisoes_estoque_itens (produto_id) where produto_id is not null and status in ('repor', 'em_falta') and solicitacao_item_id is null;
create index if not exists itens_checklist_revisao_rotina_idx on public.itens_checklist_revisao (rotina_id, ativo, ordem);

drop trigger if exists trg_rotinas_revisao_updated_at on public.rotinas_revisao;
create trigger trg_rotinas_revisao_updated_at before update on public.rotinas_revisao for each row execute function public.set_updated_at();
drop trigger if exists trg_itens_checklist_revisao_updated_at on public.itens_checklist_revisao;
create trigger trg_itens_checklist_revisao_updated_at before update on public.itens_checklist_revisao for each row execute function public.set_updated_at();
drop trigger if exists trg_revisoes_estoque_updated_at on public.revisoes_estoque;
create trigger trg_revisoes_estoque_updated_at before update on public.revisoes_estoque for each row execute function public.set_updated_at();
drop trigger if exists trg_revisoes_estoque_itens_updated_at on public.revisoes_estoque_itens;
create trigger trg_revisoes_estoque_itens_updated_at before update on public.revisoes_estoque_itens for each row execute function public.set_updated_at();
drop trigger if exists trg_solicitacoes_compra_itens_updated_at on public.solicitacoes_compra_itens;
create trigger trg_solicitacoes_compra_itens_updated_at before update on public.solicitacoes_compra_itens for each row execute function public.set_updated_at();

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

create index if not exists revisoes_estoque_itens_historico_item_idx on public.revisoes_estoque_itens_historico (revisao_item_id, marcado_em desc);

create or replace function public.registrar_historico_item_revisao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (old.status is distinct from new.status or old.observacao is distinct from new.observacao or old.quantidade_contada is distinct from new.quantidade_contada) then
    insert into public.revisoes_estoque_itens_historico (revisao_item_id, revisao_id, status_anterior, status_novo, observacao, quantidade_contada, marcado_por, marcado_em)
    values (new.id, new.revisao_id, old.status, new.status, new.observacao, new.quantidade_contada, coalesce(new.revisado_por, auth.uid()), coalesce(new.revisado_em, now()));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_revisoes_estoque_itens_historico on public.revisoes_estoque_itens;
create trigger trg_revisoes_estoque_itens_historico after update on public.revisoes_estoque_itens for each row execute function public.registrar_historico_item_revisao();

create or replace function public.proximo_dia_util_revisao(p_data timestamptz, p_dias_bloqueados smallint[] default '{}')
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
alter table public.rotinas_revisao enable row level security;
alter table public.itens_checklist_revisao enable row level security;
alter table public.revisoes_estoque enable row level security;
alter table public.revisoes_estoque_itens enable row level security;
alter table public.solicitacoes_compra_itens enable row level security;
alter table public.revisoes_estoque_itens_historico enable row level security;
drop policy if exists "Users manage own review routines" on public.rotinas_revisao;
drop policy if exists "Users manage own checklist items" on public.itens_checklist_revisao;
drop policy if exists "Users manage own stock reviews" on public.revisoes_estoque;
drop policy if exists "Users manage own stock review items" on public.revisoes_estoque_itens;
drop policy if exists "Users manage own purchase request items" on public.solicitacoes_compra_itens;
drop policy if exists "Users read own stock review item history" on public.revisoes_estoque_itens_historico;
create policy "Users manage own review routines" on public.rotinas_revisao for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own checklist items" on public.itens_checklist_revisao for all to authenticated using (exists (select 1 from public.rotinas_revisao r where r.id = rotina_id and r.user_id = auth.uid())) with check (exists (select 1 from public.rotinas_revisao r where r.id = rotina_id and r.user_id = auth.uid()));
create policy "Users manage own stock reviews" on public.revisoes_estoque for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage own stock review items" on public.revisoes_estoque_itens for all to authenticated using (exists (select 1 from public.revisoes_estoque r where r.id = revisao_id and r.user_id = auth.uid())) with check (exists (select 1 from public.revisoes_estoque r where r.id = revisao_id and r.user_id = auth.uid()));
create policy "Users manage own purchase request items" on public.solicitacoes_compra_itens for all to authenticated using (true) with check (true);
create policy "Users read own stock review item history" on public.revisoes_estoque_itens_historico for select to authenticated using (exists (select 1 from public.revisoes_estoque r where r.id = revisao_id and r.user_id = auth.uid()));
grant select, insert, update, delete on public.rotinas_revisao to authenticated;
grant select, insert, update, delete on public.itens_checklist_revisao to authenticated;
grant select, insert, update, delete on public.revisoes_estoque to authenticated;
grant select, insert, update, delete on public.revisoes_estoque_itens to authenticated;
grant select, insert, update, delete on public.solicitacoes_compra_itens to authenticated;
grant select on public.revisoes_estoque_itens_historico to authenticated;
grant execute on function public.proximo_dia_util_revisao(timestamptz, smallint[]) to authenticated;

notify pgrst, 'reload schema';
