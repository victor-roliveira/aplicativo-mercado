create or replace function public.courier_mark_out_for_delivery(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessao nao autenticada';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id;

  if v_order.id is null then
    raise exception 'Pedido nao encontrado';
  end if;

  if v_order.assigned_courier_id <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissao para atualizar este pedido';
  end if;

  if v_order.status not in ('PROCESSING', 'OUT_FOR_DELIVERY') then
    raise exception 'Este pedido nao pode sair para entrega agora';
  end if;

  update public.orders
  set
    status = 'OUT_FOR_DELIVERY',
    out_for_delivery_at = coalesce(v_order.out_for_delivery_at, timezone('utc', now()))
  where id = p_order_id;

  insert into public.audit_logs (actor_user_id, entity_name, entity_id, action, payload)
  values (
    auth.uid(),
    'orders',
    p_order_id::text,
    'COURIER_OUT_FOR_DELIVERY',
    jsonb_build_object('status', 'OUT_FOR_DELIVERY')
  );
end;
$$;

revoke all on function public.courier_mark_out_for_delivery(uuid) from public;
grant execute on function public.courier_mark_out_for_delivery(uuid) to authenticated;
