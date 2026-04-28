create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('CUSTOMER', 'COURIER', 'ADMIN', 'DEVELOPER');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'PLACED',
      'PROCESSING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'STOCK_ISSUE'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'delivery_mode') then
    create type public.delivery_mode as enum ('DELIVERY', 'PICKUP');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('PIX', 'CASH', 'CARD_ON_DELIVERY');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  cpf text,
  phone text,
  avatar_url text,
  rating numeric(2,1),
  vehicle_plate text,
  driver_license text,
  role public.app_role not null default 'CUSTOMER',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cpf_length check (cpf is null or char_length(regexp_replace(cpf, '\D', '', 'g')) = 11),
  constraint rating_range check (rating is null or (rating >= 0 and rating <= 5))
);

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

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  slug text not null unique,
  description text not null,
  price_in_cents integer not null check (price_in_cents >= 0),
  discount_in_cents integer not null default 0 check (discount_in_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  min_stock_alert integer not null default 5 check (min_stock_alert >= 0),
  is_active boolean not null default true,
  weight_in_grams integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'OPEN',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price_in_cents integer not null check (unit_price_in_cents >= 0),
  unique(cart_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references public.profiles(id),
  assigned_courier_id uuid references public.profiles(id),
  status public.order_status not null default 'PLACED',
  delivery_mode public.delivery_mode not null,
  payment_method public.payment_method not null,
  subtotal_in_cents integer not null check (subtotal_in_cents >= 0),
  discount_total_in_cents integer not null default 0 check (discount_total_in_cents >= 0),
  delivery_fee_in_cents integer not null default 0 check (delivery_fee_in_cents >= 0),
  total_in_cents integer not null check (total_in_cents >= 0),
  change_for_in_cents integer check (change_for_in_cents >= 0),
  notes text,
  delivery_confirmation_code_hash text not null,
  stock_issue_reason text,
  placed_at timestamptz not null default timezone('utc', now()),
  processing_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz
);

create table if not exists public.order_delivery_codes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  confirmation_code text not null
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_in_cents integer not null check (unit_price_in_cents >= 0),
  discount_in_cents integer not null default 0 check (discount_in_cents >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  amount_in_cents integer not null check (amount_in_cents >= 0),
  provider_name text,
  provider_reference text unique,
  pix_qr_code text,
  pix_qr_code_base64 text,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null,
  quantity_delta integer not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  entity_name text not null,
  entity_id text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'CUSTOMER'::public.app_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('ADMIN', 'DEVELOPER');
$$;

create or replace function public.is_courier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'COURIER';
$$;

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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Somente administradores podem alterar status globais';
  end if;

  update public.orders
  set
    status = p_status,
    processing_at = case
      when p_status = 'PROCESSING' and processing_at is null then timezone('utc', now())
      else processing_at
    end,
    out_for_delivery_at = case
      when p_status = 'OUT_FOR_DELIVERY' and out_for_delivery_at is null then timezone('utc', now())
      else out_for_delivery_at
    end,
    delivered_at = case when p_status = 'DELIVERED' then timezone('utc', now()) else delivered_at end
  where id = p_order_id;

  insert into public.audit_logs (actor_user_id, entity_name, entity_id, action, payload)
  values (auth.uid(), 'orders', p_order_id::text, 'STATUS_UPDATED', jsonb_build_object('status', p_status));
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

  if not exists (select 1 from public.profiles where id = p_courier_id and role = 'COURIER') then
    raise exception 'Entregador invalido';
  end if;

  update public.orders
  set assigned_courier_id = p_courier_id
  where id = p_order_id;
end;
$$;

create or replace function public.confirm_delivery(
  p_order_id uuid,
  p_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;

  if v_order.id is null then
    raise exception 'Pedido nao encontrado';
  end if;

  if v_order.assigned_courier_id <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissao para concluir este pedido';
  end if;

  if v_order.delivery_confirmation_code_hash <> md5(p_code) then
    raise exception 'Codigo de entrega invalido';
  end if;

  update public.orders
  set status = 'DELIVERED', delivered_at = timezone('utc', now())
  where id = p_order_id;
end;
$$;

create or replace function public.flag_stock_issue(
  p_order_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  update public.orders
  set status = 'STOCK_ISSUE', stock_issue_reason = p_reason
  where id = p_order_id
  returning customer_id into v_customer_id;

  insert into public.notifications (user_id, order_id, title, body)
  values (
    v_customer_id,
    p_order_id,
    'Ajuste no seu pedido',
    p_reason
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_delivery_codes enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_logs enable row level security;

create policy "public can read active categories"
on public.categories for select
using (true);

create policy "public can read active products"
on public.products for select
using (is_active = true);

create policy "public can read product images"
on public.product_images for select
using (true);

create policy "users read own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "developer manages admins"
on public.profiles for update
using (public.current_role() = 'DEVELOPER')
with check (true);

create policy "admin manages operational profiles"
on public.profiles for update
using (public.is_admin())
with check (role <> 'ADMIN' or public.current_role() = 'DEVELOPER');

create policy "users manage own addresses"
on public.addresses for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users manage own cart"
on public.carts for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users manage own cart items"
on public.cart_items for all
using (
  exists (
    select 1 from public.carts c
    where c.id = cart_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.carts c
    where c.id = cart_id and c.user_id = auth.uid()
  )
);

create policy "customers read own orders"
on public.orders for select
using (
  customer_id = auth.uid()
  or assigned_courier_id = auth.uid()
  or public.is_admin()
);

create policy "admins update orders"
on public.orders for update
using (public.is_admin());

create policy "customers read own order items"
on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or o.assigned_courier_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "customers read own delivery code"
on public.order_delivery_codes for select
using (customer_id = auth.uid());

create policy "users read allowed payments"
on public.payments for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or public.is_admin())
  )
);

create policy "users read own notifications"
on public.notifications for select
using (user_id = auth.uid() or public.is_admin());

create policy "users mark own notifications as read"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "admins read inventory movements"
on public.inventory_movements for select
using (public.is_admin());

create policy "admins read audit logs"
on public.audit_logs for select
using (public.is_admin());

create policy "admins manage catalog categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage catalog products"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage product images"
on public.product_images for all
using (public.is_admin())
with check (public.is_admin());

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

create trigger addresses_touch_updated_at
before update on public.addresses
for each row execute procedure public.touch_updated_at();

create trigger products_touch_updated_at
before update on public.products
for each row execute procedure public.touch_updated_at();

create trigger carts_touch_updated_at
before update on public.carts
for each row execute procedure public.touch_updated_at();

create unique index if not exists carts_one_open_cart_per_user
on public.carts (user_id, status);

create index if not exists addresses_user_id_last_used_idx
on public.addresses (user_id, last_used_at desc, updated_at desc);
