alter table public.profiles
  add column if not exists contact_email text,
  add column if not exists vehicle_type text;

update public.profiles p
set contact_email = u.email
from auth.users u
where u.id = p.id
  and coalesce(p.contact_email, '') = '';

alter table public.products
  add column if not exists sku text,
  add column if not exists unit_label text not null default 'un';

update public.products
set sku = 'PRD-' || upper(left(id::text, 8))
where sku is null;

alter table public.products
  alter column sku set not null;

create unique index if not exists products_sku_idx on public.products (sku);

alter table public.orders
  add column if not exists customer_phone_snapshot text,
  add column if not exists shipping_address_label text,
  add column if not exists shipping_address_line text,
  add column if not exists shipping_address_location text;

update public.orders o
set customer_phone_snapshot = coalesce(o.customer_phone_snapshot, p.phone)
from public.profiles p
where p.id = o.customer_id;

update public.orders o
set
  shipping_address_label = a.label,
  shipping_address_line = a.street || ', ' || a.number || coalesce(' - ' || nullif(a.complement, ''), ''),
  shipping_address_location = a.neighborhood || ' - ' || a.city || '/' || a.state
from (
  select distinct on (user_id)
    user_id,
    label,
    street,
    number,
    complement,
    neighborhood,
    city,
    state
  from public.addresses
  order by user_id, last_used_at desc nulls last, updated_at desc
) a
where a.user_id = o.customer_id
  and o.delivery_mode = 'DELIVERY'
  and (o.shipping_address_line is null or o.shipping_address_line = '');

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
    role
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
    end
  )
  on conflict (id) do nothing;

  insert into public.carts (user_id)
  values (new.id)
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.checkout_cart(
  p_cart_id uuid,
  p_delivery_mode public.delivery_mode,
  p_payment_method public.payment_method,
  p_change_for_in_cents integer default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order_id uuid;
  v_subtotal integer := 0;
  v_discount_total integer := 0;
  v_delivery_fee integer := case when p_delivery_mode = 'DELIVERY' then 1200 else 0 end;
  v_code text;
  v_phone text;
  v_item record;
  v_address record;
begin
  if v_customer_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  if not exists (
    select 1
    from public.carts c
    where c.id = p_cart_id
      and c.user_id = v_customer_id
      and c.status = 'OPEN'
  ) then
    raise exception 'Carrinho invalido para este usuario';
  end if;

  if not exists (select 1 from public.cart_items where cart_id = p_cart_id) then
    raise exception 'Carrinho vazio';
  end if;

  perform 1
  from public.products p
  join public.cart_items ci on ci.product_id = p.id
  where ci.cart_id = p_cart_id
  for update of p;

  if exists (
    select 1
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = p_cart_id
      and (p.stock_quantity < ci.quantity or p.is_active = false)
  ) then
    raise exception 'Carrinho contem itens sem estoque suficiente';
  end if;

  for v_item in
    select
      ci.*,
      p.name,
      p.discount_in_cents
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = p_cart_id
  loop
    v_subtotal := v_subtotal + (v_item.unit_price_in_cents * v_item.quantity);
    v_discount_total := v_discount_total + (v_item.discount_in_cents * v_item.quantity);
  end loop;

  select phone into v_phone
  from public.profiles
  where id = v_customer_id;

  v_code := right(regexp_replace(coalesce(v_phone, '0000'), '\D', '', 'g'), 4);

  if p_delivery_mode = 'DELIVERY' then
    select
      label,
      street,
      number,
      complement,
      neighborhood,
      city,
      state
    into v_address
    from public.addresses
    where user_id = v_customer_id
    order by last_used_at desc nulls last, updated_at desc
    limit 1;

    if v_address.label is null then
      raise exception 'Cadastre um endereco antes de finalizar a entrega em casa';
    end if;
  end if;

  insert into public.orders (
    customer_id,
    status,
    delivery_mode,
    payment_method,
    subtotal_in_cents,
    discount_total_in_cents,
    delivery_fee_in_cents,
    total_in_cents,
    change_for_in_cents,
    notes,
    delivery_confirmation_code_hash,
    customer_phone_snapshot,
    shipping_address_label,
    shipping_address_line,
    shipping_address_location
  )
  values (
    v_customer_id,
    'PLACED',
    p_delivery_mode,
    p_payment_method,
    v_subtotal,
    v_discount_total,
    v_delivery_fee,
    greatest(v_subtotal - v_discount_total, 0) + v_delivery_fee,
    p_change_for_in_cents,
    p_notes,
    md5(coalesce(nullif(v_code, ''), '0000')),
    v_phone,
    case when p_delivery_mode = 'DELIVERY' then v_address.label else 'Retirada no local' end,
    case
      when p_delivery_mode = 'DELIVERY'
        then v_address.street || ', ' || v_address.number || coalesce(' - ' || nullif(v_address.complement, ''), '')
      else 'Pedido para retirada'
    end,
    case
      when p_delivery_mode = 'DELIVERY'
        then v_address.neighborhood || ' - ' || v_address.city || '/' || v_address.state
      else 'Sem endereco de entrega'
    end
  )
  returning id into v_order_id;

  insert into public.order_delivery_codes (order_id, customer_id, confirmation_code)
  values (v_order_id, v_customer_id, coalesce(nullif(v_code, ''), '0000'));

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price_in_cents,
    discount_in_cents
  )
  select
    v_order_id,
    ci.product_id,
    p.name,
    ci.quantity,
    ci.unit_price_in_cents,
    p.discount_in_cents
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = p_cart_id;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity
  from public.cart_items ci
  where ci.cart_id = p_cart_id
    and ci.product_id = p.id;

  insert into public.inventory_movements (product_id, order_id, movement_type, quantity_delta, reason)
  select
    ci.product_id,
    v_order_id,
    'RESERVE_ORDER',
    -ci.quantity,
    'Checkout concluido'
  from public.cart_items ci
  where ci.cart_id = p_cart_id;

  insert into public.payments (order_id, method, amount_in_cents, provider_name)
  values (
    v_order_id,
    p_payment_method,
    greatest(v_subtotal - v_discount_total, 0) + v_delivery_fee,
    case when p_payment_method in ('PIX', 'CARD_ONLINE') then 'ABACATEPAY' else 'OFFLINE' end
  );

  update public.carts
  set status = 'CHECKED_OUT'
  where id = p_cart_id;

  insert into public.carts (user_id)
  values (v_customer_id);

  return v_order_id;
end;
$$;
