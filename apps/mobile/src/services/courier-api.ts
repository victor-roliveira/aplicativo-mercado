import type { DeliveryMode, OrderStatus, PaymentMethod } from "@mercado/shared/domain/models";
import { supabase } from "./supabase";

export type CourierOrderItem = {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  unitPriceInCents: number;
  unitLabel?: string;
  totalInCents: number;
};

export type CourierOrder = {
  id: string;
  rawOrderId: string;
  status: OrderStatus;
  totalInCents: number;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  changeForInCents?: number;
  notes?: string;
  paymentMethod: PaymentMethod;
  deliveryMode: DeliveryMode;
  placedAt: string;
  processingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  customerName: string;
  customerPhone?: string;
  addressLabel?: string;
  addressLine?: string;
  addressLocation?: string;
  items: CourierOrderItem[];
};

type CourierOrderRow = {
  id: string;
  order_number: number | null;
  status: OrderStatus;
  total_in_cents: number;
  subtotal_in_cents: number;
  delivery_fee_in_cents: number;
  change_for_in_cents: number | null;
  notes: string | null;
  payment_method: PaymentMethod;
  delivery_mode: DeliveryMode;
  placed_at: string;
  processing_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  shipping_address_label: string | null;
  shipping_address_line: string | null;
  shipping_address_location: string | null;
  customer_phone_snapshot: string | null;
  customer?: {
    full_name: string | null;
    phone: string | null;
  } | {
    full_name: string | null;
    phone: string | null;
  }[] | null;
};

type CourierOrderItemRow = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_in_cents: number;
  products?: {
    unit_label: string | null;
  } | {
    unit_label: string | null;
  }[] | null;
};

function getClient() {
  if (!supabase) {
    throw new Error("Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.");
  }

  return supabase;
}

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function mapCourierOrder(
  order: CourierOrderRow,
  itemsByOrder: Map<string, CourierOrderItem[]>,
): CourierOrder {
  const customer = firstRelation(order.customer);
  const orderNumber = order.order_number ? String(order.order_number) : order.id.slice(0, 6).toUpperCase();

  return {
    id: `#${orderNumber}`,
    rawOrderId: order.id,
    status: order.status,
    totalInCents: order.total_in_cents,
    subtotalInCents: order.subtotal_in_cents,
    deliveryFeeInCents: order.delivery_fee_in_cents,
    changeForInCents: order.change_for_in_cents ?? undefined,
    notes: order.notes ?? undefined,
    paymentMethod: order.payment_method,
    deliveryMode: order.delivery_mode,
    placedAt: order.placed_at,
    processingAt: order.processing_at ?? undefined,
    outForDeliveryAt: order.out_for_delivery_at ?? undefined,
    deliveredAt: order.delivered_at ?? undefined,
    customerName: customer?.full_name ?? "Cliente",
    customerPhone: order.customer_phone_snapshot ?? customer?.phone ?? undefined,
    addressLabel: order.shipping_address_label ?? undefined,
    addressLine: order.shipping_address_line ?? undefined,
    addressLocation: order.shipping_address_location ?? undefined,
    items: itemsByOrder.get(order.id) ?? [],
  };
}

export async function fetchCourierOrders(): Promise<CourierOrder[]> {
  const client = getClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return [];
  }

  const { data, error } = await client
    .from("orders")
    .select(
      "id, order_number, status, total_in_cents, subtotal_in_cents, delivery_fee_in_cents, change_for_in_cents, notes, payment_method, delivery_mode, placed_at, processing_at, out_for_delivery_at, delivered_at, shipping_address_label, shipping_address_line, shipping_address_location, customer_phone_snapshot, customer:profiles!orders_customer_id_fkey(full_name, phone)",
    )
    .eq("assigned_courier_id", user.id)
    .neq("status", "CANCELLED")
    .order("placed_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as CourierOrderRow[];
  const orderIds = orders.map((order) => order.id);
  const itemsByOrder = new Map<string, CourierOrderItem[]>();

  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await client
      .from("order_items")
      .select("id, order_id, product_name, quantity, unit_price_in_cents, products(unit_label)")
      .in("order_id", orderIds)
      .order("id", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    for (const item of (items ?? []) as CourierOrderItemRow[]) {
      const relation = firstRelation(item.products);
      const currentItems = itemsByOrder.get(item.order_id) ?? [];
      currentItems.push({
        id: item.id,
        orderId: item.order_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPriceInCents: item.unit_price_in_cents,
        unitLabel: relation?.unit_label ?? undefined,
        totalInCents: item.quantity * item.unit_price_in_cents,
      });
      itemsByOrder.set(item.order_id, currentItems);
    }
  }

  return orders.map((order) => mapCourierOrder(order, itemsByOrder));
}

export async function markCourierOrderOutForDelivery(orderId: string) {
  const client = getClient();
  const { error } = await client.rpc("courier_mark_out_for_delivery", {
    p_order_id: orderId,
  });

  if (error) {
    throw error;
  }
}

export async function confirmCourierOrderDelivery(orderId: string, code: string) {
  const client = getClient();
  const normalizedCode = code.replace(/\D/g, "");
  const { error } = await client.rpc("confirm_delivery", {
    p_order_id: orderId,
    p_code: normalizedCode,
  });

  if (error) {
    throw error;
  }
}
