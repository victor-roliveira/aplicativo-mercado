drop index if exists public.carts_one_open_cart_per_user;

create unique index if not exists carts_one_open_cart_per_user
on public.carts (user_id)
where status = 'OPEN';
