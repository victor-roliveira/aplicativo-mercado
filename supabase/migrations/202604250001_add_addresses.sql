create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists addresses_user_id_last_used_idx
on public.addresses (user_id, last_used_at desc, updated_at desc);

create or replace function public.mark_address_last_used(
  p_address_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.addresses
    where id = p_address_id
      and user_id = auth.uid()
  ) then
    raise exception 'Endereco invalido';
  end if;

  update public.addresses
  set last_used_at = null
  where user_id = auth.uid();

  update public.addresses
  set last_used_at = timezone('utc', now())
  where id = p_address_id
    and user_id = auth.uid();
end;
$$;

alter table public.addresses enable row level security;

drop policy if exists "users manage own addresses" on public.addresses;
create policy "users manage own addresses"
on public.addresses for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists addresses_touch_updated_at on public.addresses;
create trigger addresses_touch_updated_at
before update on public.addresses
for each row execute procedure public.touch_updated_at();
