create or replace function public.update_my_profile(
  p_full_name text,
  p_phone text,
  p_cpf text,
  p_avatar_url text,
  p_vehicle_type text,
  p_vehicle_plate text,
  p_driver_license text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessao nao autenticada';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Informe seu nome completo';
  end if;

  if coalesce(trim(p_phone), '') = '' then
    raise exception 'Informe seu telefone';
  end if;

  update public.profiles
  set
    full_name = trim(p_full_name),
    phone = trim(p_phone),
    cpf = nullif(trim(p_cpf), ''),
    avatar_url = nullif(trim(p_avatar_url), ''),
    vehicle_type = nullif(trim(p_vehicle_type), ''),
    vehicle_plate = nullif(trim(p_vehicle_plate), ''),
    driver_license = nullif(trim(p_driver_license), '')
  where id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'Perfil nao encontrado';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text, text, text) from public;
grant execute on function public.update_my_profile(text, text, text, text, text, text, text) to authenticated;
