insert into public.categories (name, slug)
values
  ('Frutas e Verduras', 'frutas-verduras'),
  ('Mercearia', 'mercearia'),
  ('Bebidas', 'bebidas'),
  ('Frios e Laticinios', 'frios-laticinios'),
  ('Limpeza', 'limpeza')
on conflict (slug) do update
set name = excluded.name;

insert into public.products (
  category_id,
  name,
  slug,
  description,
  price_in_cents,
  discount_in_cents,
  stock_quantity,
  min_stock_alert,
  is_active,
  weight_in_grams
)
select
  c.id,
  'Banana prata 1kg',
  'banana-prata-1kg',
  'Banana prata fresca, selecionada para consumo no dia a dia.',
  899,
  100,
  45,
  8,
  true,
  1000
from public.categories c
where c.slug = 'frutas-verduras'
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  discount_in_cents = excluded.discount_in_cents,
  stock_quantity = excluded.stock_quantity,
  min_stock_alert = excluded.min_stock_alert,
  is_active = excluded.is_active,
  weight_in_grams = excluded.weight_in_grams;

insert into public.products (
  category_id,
  name,
  slug,
  description,
  price_in_cents,
  discount_in_cents,
  stock_quantity,
  min_stock_alert,
  is_active,
  weight_in_grams
)
select
  c.id,
  'Cafe especial 500g',
  'cafe-especial-500g',
  'Cafe de torra media com notas de chocolate e castanhas.',
  2499,
  0,
  28,
  6,
  true,
  500
from public.categories c
where c.slug = 'mercearia'
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  discount_in_cents = excluded.discount_in_cents,
  stock_quantity = excluded.stock_quantity,
  min_stock_alert = excluded.min_stock_alert,
  is_active = excluded.is_active,
  weight_in_grams = excluded.weight_in_grams;

insert into public.products (
  category_id,
  name,
  slug,
  description,
  price_in_cents,
  discount_in_cents,
  stock_quantity,
  min_stock_alert,
  is_active,
  weight_in_grams
)
select
  c.id,
  'Arroz integral 1kg',
  'arroz-integral-1kg',
  'Arroz integral de graos selecionados para refeicoes completas.',
  1599,
  200,
  34,
  8,
  true,
  1000
from public.categories c
where c.slug = 'mercearia'
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  discount_in_cents = excluded.discount_in_cents,
  stock_quantity = excluded.stock_quantity,
  min_stock_alert = excluded.min_stock_alert,
  is_active = excluded.is_active,
  weight_in_grams = excluded.weight_in_grams;

insert into public.products (
  category_id,
  name,
  slug,
  description,
  price_in_cents,
  discount_in_cents,
  stock_quantity,
  min_stock_alert,
  is_active,
  weight_in_grams
)
select
  c.id,
  'Leite integral 1L',
  'leite-integral-1l',
  'Leite integral longa vida para uso diario.',
  699,
  0,
  60,
  12,
  true,
  1000
from public.categories c
where c.slug = 'frios-laticinios'
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  discount_in_cents = excluded.discount_in_cents,
  stock_quantity = excluded.stock_quantity,
  min_stock_alert = excluded.min_stock_alert,
  is_active = excluded.is_active,
  weight_in_grams = excluded.weight_in_grams;

insert into public.products (
  category_id,
  name,
  slug,
  description,
  price_in_cents,
  discount_in_cents,
  stock_quantity,
  min_stock_alert,
  is_active,
  weight_in_grams
)
select
  c.id,
  'Agua mineral 1,5L',
  'agua-mineral-1-5l',
  'Agua mineral sem gas em garrafa de 1,5 litro.',
  449,
  0,
  80,
  20,
  true,
  1500
from public.categories c
where c.slug = 'bebidas'
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  discount_in_cents = excluded.discount_in_cents,
  stock_quantity = excluded.stock_quantity,
  min_stock_alert = excluded.min_stock_alert,
  is_active = excluded.is_active,
  weight_in_grams = excluded.weight_in_grams;

insert into public.product_images (product_id, image_url, is_primary, sort_order)
select p.id, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e', true, 1
from public.products p
where p.slug = 'banana-prata-1kg'
  and not exists (
    select 1 from public.product_images pi
    where pi.product_id = p.id and pi.image_url = 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e'
  );

insert into public.product_images (product_id, image_url, is_primary, sort_order)
select p.id, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085', true, 1
from public.products p
where p.slug = 'cafe-especial-500g'
  and not exists (
    select 1 from public.product_images pi
    where pi.product_id = p.id and pi.image_url = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085'
  );

insert into public.product_images (product_id, image_url, is_primary, sort_order)
select p.id, 'https://images.unsplash.com/photo-1586201375761-83865001e31b', true, 1
from public.products p
where p.slug = 'arroz-integral-1kg'
  and not exists (
    select 1 from public.product_images pi
    where pi.product_id = p.id and pi.image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31b'
  );

insert into public.product_images (product_id, image_url, is_primary, sort_order)
select p.id, 'https://images.unsplash.com/photo-1563636619-e9143da7973b', true, 1
from public.products p
where p.slug = 'leite-integral-1l'
  and not exists (
    select 1 from public.product_images pi
    where pi.product_id = p.id and pi.image_url = 'https://images.unsplash.com/photo-1563636619-e9143da7973b'
  );

insert into public.product_images (product_id, image_url, is_primary, sort_order)
select p.id, 'https://images.unsplash.com/photo-1553531768-dfff47d5d6d6', true, 1
from public.products p
where p.slug = 'agua-mineral-1-5l'
  and not exists (
    select 1 from public.product_images pi
    where pi.product_id = p.id and pi.image_url = 'https://images.unsplash.com/photo-1553531768-dfff47d5d6d6'
  );
