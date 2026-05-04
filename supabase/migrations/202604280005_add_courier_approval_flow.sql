alter table public.profiles
add column if not exists is_approved boolean;

update public.profiles
set is_approved = true
where is_approved is null;

alter table public.profiles
alter column is_approved set default true;

update public.profiles
set is_active = false
where role = 'COURIER'
  and coalesce(is_approved, false) = false;

alter table public.profiles
alter column is_approved set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    cpf,
    contact_email,
    phone,
    vehicle_type,
    vehicle_plate,
    driver_license,
    role,
    is_active,
    is_approved
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo usuario'),
    new.raw_user_meta_data ->> 'cpf',
    coalesce(new.email, new.raw_user_meta_data ->> 'contact_email'),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'vehicle_type',
    new.raw_user_meta_data ->> 'vehicle_plate',
    new.raw_user_meta_data ->> 'driver_license',
    case
      when upper(coalesce(new.raw_user_meta_data ->> 'requested_role', 'CUSTOMER')) = 'COURIER'
        then 'COURIER'::public.app_role
      else 'CUSTOMER'::public.app_role
    end,
    case
      when upper(coalesce(new.raw_user_meta_data ->> 'requested_role', 'CUSTOMER')) = 'COURIER'
        then false
      else true
    end,
    case
      when upper(coalesce(new.raw_user_meta_data ->> 'requested_role', 'CUSTOMER')) = 'COURIER'
        then false
      else true
    end
  )
  on conflict (id) do nothing;

  insert into public.carts (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.assign_courier(
  p_order_id uuid,
  p_courier_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente administradores podem atribuir entregadores';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = p_order_id
      and status = 'PROCESSING'
  ) then
    raise exception 'Pedido invalido para atribuicao';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_courier_id
      and role = 'COURIER'
      and is_active = true
      and coalesce(is_approved, false) = true
  ) then
    raise exception 'Entregador invalido ou ainda nao aprovado';
  end if;

  update public.orders
  set assigned_courier_id = p_courier_id
  where id = p_order_id;
end;
$$;
