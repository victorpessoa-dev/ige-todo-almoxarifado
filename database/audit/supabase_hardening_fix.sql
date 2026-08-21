-- Hardening Supabase para grants, policies e funcoes publicas.
-- Status: aplicado no ambiente real.
-- Mantenha este arquivo para reaplicacao se uma auditoria futura apontar grants amplos.

begin;

-- Fecha grants herdados amplos. RLS continua ativo, mas grants diretos devem ficar minimos.
revoke all privileges on all tables in schema public from public;
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all tables in schema public from authenticated;

revoke all privileges on all sequences in schema public from public;
revoke all privileges on all sequences in schema public from anon;
revoke all privileges on all sequences in schema public from authenticated;

-- Postgres concede EXECUTE para PUBLIC por padrao; reabrimos somente RPCs publicas esperadas.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public revoke all on sequences from public;
alter default privileges in schema public revoke execute on functions from public;

grant usage on schema public to anon, authenticated;

grant select on public.solicitantes_compra to anon;
grant select on public.centros_custo to anon;

-- Neste projeto, authenticated representa operador interno confiavel.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all privileges on public.api_rate_limits from public, anon, authenticated;
grant usage, select on sequence public.solicitacoes_compra_codigo_seq to authenticated;

grant execute on function public.check_api_rate_limit(text)
to authenticated;

grant execute on function public.criar_solicitacao_compra_publica(text, text, numeric, text, date, uuid, text, text, text, text, uuid)
to anon, authenticated;

grant execute on function public.buscar_solicitacao_compra_publica(text)
to anon, authenticated;

grant execute on function public.listar_solicitacoes_compra_publica()
to anon, authenticated;

grant execute on function public.listar_produtos_catalogo_publico()
to anon, authenticated;

alter table public.api_rate_limits enable row level security;

drop policy if exists "delete tarefas" on public.tarefas;
drop policy if exists "insert tarefas" on public.tarefas;
drop policy if exists "select tarefas" on public.tarefas;
drop policy if exists "update tarefas" on public.tarefas;
drop policy if exists "Authenticated users can manage tasks" on public.tarefas;

drop policy if exists "delete lembretes" on public.lembretes;
drop policy if exists "insert lembretes" on public.lembretes;
drop policy if exists "select lembretes" on public.lembretes;
drop policy if exists "update lembretes" on public.lembretes;
drop policy if exists "Authenticated users can manage reminders" on public.lembretes;

drop policy if exists "produtos_all" on public.produtos;
drop policy if exists "Authenticated users can manage products" on public.produtos;

drop policy if exists "movimentacoes_all" on public.movimentacoes_estoque;
drop policy if exists "Authenticated users can manage stock movements" on public.movimentacoes_estoque;

drop policy if exists "Public can create purchase requests" on public.solicitacoes_compra;
drop policy if exists "Authenticated users can create purchase requests" on public.solicitacoes_compra;
drop policy if exists "Authenticated users can read purchase requests" on public.solicitacoes_compra;
drop policy if exists "Authenticated users can update purchase requests" on public.solicitacoes_compra;
drop policy if exists "Authenticated users can delete purchase requests" on public.solicitacoes_compra;
drop policy if exists "Authenticated users can manage purchase requests" on public.solicitacoes_compra;

drop policy if exists "Authenticated users can create requesters" on public.solicitantes_compra;
drop policy if exists "Authenticated users can read all requesters" on public.solicitantes_compra;
drop policy if exists "Authenticated users can update requesters" on public.solicitantes_compra;
drop policy if exists "Authenticated users can delete requesters" on public.solicitantes_compra;
drop policy if exists "Authenticated users can manage requesters" on public.solicitantes_compra;

drop policy if exists "Authenticated users can create cost centers" on public.centros_custo;
drop policy if exists "Authenticated users can read all cost centers" on public.centros_custo;
drop policy if exists "Authenticated users can update cost centers" on public.centros_custo;
drop policy if exists "Authenticated users can delete cost centers" on public.centros_custo;
drop policy if exists "Authenticated users can manage cost centers" on public.centros_custo;

create policy "Authenticated users can manage tasks"
on public.tarefas for all to authenticated
using (true) with check (true);

create policy "Authenticated users can manage reminders"
on public.lembretes for all to authenticated
using (true) with check (true);

create policy "Authenticated users can manage products"
on public.produtos for all to authenticated
using (true) with check (true);

create policy "Authenticated users can manage stock movements"
on public.movimentacoes_estoque for all to authenticated
using (true) with check (true);

drop policy if exists "Public can read active requesters" on public.solicitantes_compra;
create policy "Public can read active requesters"
on public.solicitantes_compra for select
to anon, authenticated
using (ativo = true);

create policy "Authenticated users can manage requesters"
on public.solicitantes_compra for all to authenticated
using (true) with check (true);

drop policy if exists "Public can read active cost centers" on public.centros_custo;
create policy "Public can read active cost centers"
on public.centros_custo for select
to anon, authenticated
using (ativo = true);

create policy "Authenticated users can manage cost centers"
on public.centros_custo for all to authenticated
using (true) with check (true);

create policy "Authenticated users can create purchase requests"
on public.solicitacoes_compra for insert
to authenticated
with check (true);

create policy "Authenticated users can manage purchase requests"
on public.solicitacoes_compra for all to authenticated
using (true) with check (true);

notify pgrst, 'reload schema';

commit;
