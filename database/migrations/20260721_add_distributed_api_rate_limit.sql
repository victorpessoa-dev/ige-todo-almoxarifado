-- Rate limit distribuido para endpoints administrativos com custo de IA.
-- O contador fica no Postgres e e compartilhado por todas as instancias.

create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;

revoke all privileges on public.api_rate_limits from public, anon, authenticated;

create or replace function public.check_api_rate_limit(p_key_prefix text)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  configured_limit integer;
  configured_window_seconds integer := 60;
  current_bucket public.api_rate_limits%rowtype;
  normalized_key text := trim(coalesce(p_key_prefix, ''));
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  configured_limit := case normalized_key
    when 'api:analyze' then 12
    when 'api:inventory-scan-assist' then 20
    when 'api:inventory-turnover-analysis' then 15
    else null
  end;

  if configured_limit is null then
    raise exception 'Endpoint sem configuracao de rate limit.';
  end if;

  insert into public.api_rate_limits (
    bucket_key,
    request_count,
    reset_at,
    updated_at
  ) values (
    normalized_key || ':' || current_user_id::text,
    1,
    now() + make_interval(secs => configured_window_seconds),
    now()
  )
  on conflict (bucket_key) do update
  set
    request_count = case
      when api_rate_limits.reset_at <= now() then 1
      else api_rate_limits.request_count + 1
    end,
    reset_at = case
      when api_rate_limits.reset_at <= now()
        then now() + make_interval(secs => configured_window_seconds)
      else api_rate_limits.reset_at
    end,
    updated_at = now()
  returning * into current_bucket;

  return query select
    current_bucket.request_count <= configured_limit,
    greatest(configured_limit - current_bucket.request_count, 0),
    case
      when current_bucket.request_count > configured_limit
        then greatest(ceil(extract(epoch from (current_bucket.reset_at - now())))::integer, 1)
      else 0
    end;
end;
$$;

revoke execute on function public.check_api_rate_limit(text) from public, anon;
grant execute on function public.check_api_rate_limit(text) to authenticated;

