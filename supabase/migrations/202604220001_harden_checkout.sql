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
  v_item record;
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

  v_code := right(regexp_replace(coalesce((select phone from public.profiles where id = v_customer_id), '0000'), '\D', '', 'g'), 4);

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
    delivery_confirmation_code_hash
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
    md5(coalesce(nullif(v_code, ''), '0000'))
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
    case when p_payment_method = 'PIX' then 'ABACATEPAY' else null end
  );

  delete from public.cart_items where cart_id = p_cart_id;

  return v_order_id;
end;
$$;

alter table public.orders replica identity full;
alter table public.products replica identity full;
alter table public.payments replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
