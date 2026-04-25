insert into public.categories (name, slug)
values
  ('Bebidas', 'bebidas'),
  ('Proteinas', 'proteinas'),
  ('Frios', 'frios'),
  ('Frutas e Verduras', 'frutas-verduras'),
  ('Laticinios', 'laticinios')
on conflict (slug) do update
set name = excluded.name;

update public.products
set category_id = target_category.id
from public.categories current_category
join public.categories target_category on target_category.slug = 'frutas-verduras'
where public.products.category_id = current_category.id
  and current_category.slug = 'mercearia';

insert into public.products (
  category_id,
  name,
  slug,
  description,
  price_in_cents,
  discount_in_cents,
  stock_quantity,
  min_stock_alert,
  is_active
)
values
  ((select id from public.categories where slug = 'frutas-verduras'), 'Banana prata', 'banana-prata-demo', 'Banana fresca selecionada para o dia a dia.', 899, 100, 32, 5, true),
  ((select id from public.categories where slug = 'frutas-verduras'), 'Tomate italiano', 'tomate-italiano-demo', 'Tomate fresco para molhos, saladas e preparo diario.', 1290, 190, 24, 5, true),
  ((select id from public.categories where slug = 'proteinas'), 'Picanha premium', 'picanha-premium-demo', 'Corte nobre com marmoreio equilibrado.', 8990, 1000, 10, 3, true),
  ((select id from public.categories where slug = 'proteinas'), 'Peito de frango', 'peito-frango-demo', 'Bandeja resfriada ideal para receitas do dia a dia.', 2590, 0, 18, 4, true),
  ((select id from public.categories where slug = 'proteinas'), 'File de salmao', 'file-salmao-demo', 'Peixe fresco com corte alto e sabor suave.', 5990, 450, 8, 2, true),
  ((select id from public.categories where slug = 'laticinios'), 'Leite integral 1L', 'leite-integral-demo', 'Leite integral gelado pronto para consumo.', 649, 0, 42, 8, true),
  ((select id from public.categories where slug = 'laticinios'), 'Iogurte natural', 'iogurte-natural-demo', 'Pote cremoso para cafe da manha e lanches.', 899, 90, 20, 5, true),
  ((select id from public.categories where slug = 'laticinios'), 'Manteiga com sal', 'manteiga-com-sal-demo', 'Textura cremosa para paes e receitas.', 1390, 150, 16, 4, true),
  ((select id from public.categories where slug = 'frios'), 'Queijo mussarela', 'queijo-mussarela-demo', 'Peca fresca para lanches e receitas.', 4290, 0, 14, 4, true),
  ((select id from public.categories where slug = 'bebidas'), 'Suco de laranja 1L', 'suco-laranja-demo', 'Suco integral gelado e refrescante.', 1290, 0, 27, 5, true)
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_in_cents = excluded.price_in_cents,
  discount_in_cents = excluded.discount_in_cents,
  stock_quantity = excluded.stock_quantity,
  min_stock_alert = excluded.min_stock_alert,
  is_active = excluded.is_active;

delete from public.product_images
where product_id in (
  select id
  from public.products
  where slug in (
    'banana-prata-demo',
    'tomate-italiano-demo',
    'picanha-premium-demo',
    'peito-frango-demo',
    'file-salmao-demo',
    'leite-integral-demo',
    'iogurte-natural-demo',
    'manteiga-com-sal-demo',
    'queijo-mussarela-demo',
    'suco-laranja-demo'
  )
);

insert into public.product_images (product_id, image_url, is_primary, sort_order)
values
  ((select id from public.products where slug = 'banana-prata-demo'), 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e', true, 0),
  ((select id from public.products where slug = 'tomate-italiano-demo'), 'https://images.unsplash.com/photo-1546470427-e26264be0b0d', true, 0),
  ((select id from public.products where slug = 'picanha-premium-demo'), 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f', true, 0),
  ((select id from public.products where slug = 'peito-frango-demo'), 'https://images.unsplash.com/photo-1604503468506-a8da13d82791', true, 0),
  ((select id from public.products where slug = 'file-salmao-demo'), 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44', true, 0),
  ((select id from public.products where slug = 'leite-integral-demo'), 'https://images.unsplash.com/photo-1563636619-e9143da7973b', true, 0),
  ((select id from public.products where slug = 'iogurte-natural-demo'), 'https://images.unsplash.com/photo-1571212515416-fef01fc43637', true, 0),
  ((select id from public.products where slug = 'manteiga-com-sal-demo'), 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d', true, 0),
  ((select id from public.products where slug = 'queijo-mussarela-demo'), 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d', true, 0),
  ((select id from public.products where slug = 'suco-laranja-demo'), 'https://images.unsplash.com/photo-1600271886742-f049cd451bba', true, 0);
