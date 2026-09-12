-- Remove o modulo de rotinas/revisoes de estoque.
-- Mantem public.solicitacoes_compra_itens, pois ela e usada pelo fluxo de solicitacoes.

drop table if exists public.revisoes_estoque_itens_historico cascade;
drop table if exists public.revisoes_estoque_itens cascade;
drop table if exists public.revisoes_estoque cascade;
drop table if exists public.itens_checklist_revisao cascade;
drop table if exists public.rotinas_revisao cascade;

drop function if exists public.registrar_historico_item_revisao() cascade;
drop function if exists public.proximo_dia_util_revisao(timestamptz, smallint[]) cascade;

notify pgrst, 'reload schema';
