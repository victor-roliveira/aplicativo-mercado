insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read profile avatars'
  ) then
    create policy "Public can read profile avatars"
    on storage.objects
    for select
    using (bucket_id = 'profile-avatars');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users upload own profile avatars'
  ) then
    create policy "Authenticated users upload own profile avatars"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'profile-avatars'
      and split_part(name, '/', 1) = 'avatars'
      and split_part(name, '/', 2) = auth.uid()::text
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users update own profile avatars'
  ) then
    create policy "Authenticated users update own profile avatars"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'profile-avatars'
      and split_part(name, '/', 1) = 'avatars'
      and split_part(name, '/', 2) = auth.uid()::text
    )
    with check (
      bucket_id = 'profile-avatars'
      and split_part(name, '/', 1) = 'avatars'
      and split_part(name, '/', 2) = auth.uid()::text
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users delete own profile avatars'
  ) then
    create policy "Authenticated users delete own profile avatars"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'profile-avatars'
      and split_part(name, '/', 1) = 'avatars'
      and split_part(name, '/', 2) = auth.uid()::text
    );
  end if;
end $$;
