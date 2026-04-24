alter table public.profiles
  add column if not exists vehicle_plate text,
  add column if not exists driver_license text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, cpf, phone, vehicle_plate, driver_license, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo usuario'),
    new.raw_user_meta_data ->> 'cpf',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'vehicle_plate',
    new.raw_user_meta_data ->> 'driver_license',
    case
      when upper(coalesce(new.raw_user_meta_data ->> 'requested_role', 'CUSTOMER')) = 'COURIER'
        then 'COURIER'::public.app_role
      else 'CUSTOMER'::public.app_role
    end
  )
  on conflict (id) do nothing;

  insert into public.carts (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;
