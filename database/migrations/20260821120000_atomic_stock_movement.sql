begin;

create or replace function public.registrar_movimentacao_estoque(
  p_produto_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_produto public.produtos%rowtype;
  v_movimentacao public.movimentacoes_estoque%rowtype;
  v_produto_atualizado public.produtos%rowtype;
  v_novo_estoque numeric;
begin
  if v_user_id is null then raise exception 'Usuario nao autenticado.'; end if;
  if p_tipo not in ('entrada', 'saida') then raise exception 'Tipo de movimentacao invalido.'; end if;
  if p_quantidade is null or p_quantidade <= 0 or p_quantidade > 999999 then
    raise exception 'Quantidade invalida.';
  end if;

  select * into v_produto from public.produtos where id = p_produto_id for update;
  if not found then raise exception 'Produto nao encontrado.'; end if;

  v_novo_estoque := case when p_tipo = 'entrada'
    then v_produto.estoque + p_quantidade
    else v_produto.estoque - p_quantidade end;
  if v_novo_estoque < 0 then raise exception 'Estoque insuficiente.'; end if;

  insert into public.movimentacoes_estoque (user_id, produto_id, tipo, quantidade, motivo)
  values (v_user_id, p_produto_id, p_tipo, p_quantidade, nullif(trim(coalesce(p_motivo, '')), ''))
  returning * into v_movimentacao;

  update public.produtos set estoque = v_novo_estoque where id = p_produto_id
  returning * into v_produto_atualizado;

  return jsonb_build_object('movimentacao', to_jsonb(v_movimentacao), 'produto', to_jsonb(v_produto_atualizado));
end;
$$;

revoke all on function public.registrar_movimentacao_estoque(uuid, text, numeric, text) from public, anon;
grant execute on function public.registrar_movimentacao_estoque(uuid, text, numeric, text) to authenticated;

commit;