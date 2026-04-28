insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can upload product images'
  ) then
    create policy "Admins can upload product images"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'product-images'
      and public.is_admin()
      and (storage.foldername(name))[1] = 'products'
      and (storage.foldername(name))[2] = auth.uid()::text
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
      and policyname = 'Admins can view own product images'
  ) then
    create policy "Admins can view own product images"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'product-images'
      and public.is_admin()
      and (storage.foldername(name))[1] = 'products'
      and (storage.foldername(name))[2] = auth.uid()::text
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
      and policyname = 'Admins can update own product images'
  ) then
    create policy "Admins can update own product images"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'product-images'
      and public.is_admin()
      and (storage.foldername(name))[1] = 'products'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    with check (
      bucket_id = 'product-images'
      and public.is_admin()
      and (storage.foldername(name))[1] = 'products'
      and (storage.foldername(name))[2] = auth.uid()::text
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
      and policyname = 'Admins can delete own product images'
  ) then
    create policy "Admins can delete own product images"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'product-images'
      and public.is_admin()
      and (storage.foldername(name))[1] = 'products'
      and (storage.foldername(name))[2] = auth.uid()::text
    );
  end if;
end $$;
