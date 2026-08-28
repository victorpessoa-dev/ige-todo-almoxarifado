-- Permite que uma rotina de revisão de produtos abranja múltiplas categorias.
-- Mantém a coluna categoria preenchida para preservar compatibilidade com rotinas existentes.

alter table public.rotinas_revisao
  add column if not exists categorias text[] not null default '{}';

update public.rotinas_revisao
set categorias = array[trim(categoria)]
where tipo = 'produtos'
  and coalesce(array_length(categorias, 1), 0) = 0
  and nullif(trim(coalesce(categoria, '')), '') is not null;

alter table public.rotinas_revisao
  drop constraint if exists rotinas_revisao_categorias_validas;

alter table public.rotinas_revisao
  add constraint rotinas_revisao_categorias_validas check (
    tipo = 'checklist'
    or (
      coalesce(array_length(categorias, 1), 0) > 0
      and categoria = categorias[1]
      and not ('' = any(categorias))
    )
  );