-- Count a download at most once per (resource, IP) per hour.
-- IPs are stored only as salted SHA-256 hashes (computed in the Edge Function).

create table public.download_hits (
  resource_id bigint      not null references public.resources(id) on delete cascade,
  ip_hash     text        not null,
  last_hit    timestamptz not null default now(),
  primary key (resource_id, ip_hash)
);
alter table public.download_hits enable row level security;   -- no policies: service_role only
revoke all on public.download_hits from public, anon, authenticated;

drop function public.increment_download(bigint);

create function public.increment_download(p_id bigint, p_ip_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare counted boolean;
begin
  -- Atomic: the row is inserted, or refreshed only if the last hit is older than 1 hour.
  with hit as (
    insert into public.download_hits as h (resource_id, ip_hash)
    values (p_id, p_ip_hash)
    on conflict (resource_id, ip_hash) do update set last_hit = now()
      where h.last_hit < now() - interval '1 hour'
    returning 1
  )
  select exists (select 1 from hit) into counted;

  if counted then
    update public.resources set download_count = download_count + 1 where id = p_id and is_published;
  end if;

  -- Housekeeping (~1% of calls): drop entries that no longer matter.
  if random() < 0.01 then
    delete from public.download_hits where last_hit < now() - interval '1 day';
  end if;
  return counted;
end $$;

revoke execute on function public.increment_download(bigint, text) from public, anon, authenticated;
grant  execute on function public.increment_download(bigint, text) to service_role;
