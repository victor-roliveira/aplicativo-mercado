import type { OrderStatus } from "@mercado/shared/domain/models";
import { supabase } from "./supabase";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminProduct = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  sku: string;
  description: string;
  priceInCents: number;
  stockQuantity: number;
  unitLabel: string;
  imageUrl?: string;
  isActive: boolean;
};

export type AdminProductForm = {
  id?: string;
  categoryId: string;
  name: string;
  sku: string;
  description: string;
  price: string;
  stock: string;
  unitLabel: string;
  imageUrl: string;
};

export type AdminCourierStatus = "DELIVERING" | "AVAILABLE" | "INACTIVE";

export type AdminCourier = {
  id: string;
  fullName: string;
  phone?: string;
  contactEmail?: string;
  avatarUrl?: string;
  rating?: number;
  vehicleType?: string;
  vehiclePlate?: string;
  deliveriesCount: number;
  status: AdminCourierStatus;
  isActive: boolean;
};

export type AdminCourierForm = {
  id?: string;
  avatarUrl: string;
  fullName: string;
  phone: string;
  contactEmail: string;
  vehicleType: string;
  vehiclePlate: string;
  status: "AVAILABLE" | "INACTIVE";
};

export type AdminOrderItem = {
  orderId: string;
  productName: string;
  quantity: number;
  unitPriceInCents: number;
  totalInCents: number;
};

export type AdminOrder = {
  id: string;
  rawOrderId: string;
  status: OrderStatus;
  totalInCents: number;
  placedAt: string;
  paymentMethod: string;
  deliveryMode: string;
  customerName: string;
  customerPhone?: string;
  addressLabel?: string;
  addressLine?: string;
  addressLocation?: string;
  assignedCourierId?: string;
  assignedCourierName?: string;
  items: AdminOrderItem[];
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  sku: string | null;
  description: string;
  price_in_cents: number;
  stock_quantity: number;
  unit_label: string | null;
  is_active: boolean;
  categories?: { name: string } | { name: string }[] | null;
  product_images?: Array<{
    image_url: string;
    is_primary: boolean;
    sort_order: number;
  }>;
};

type CourierRow = {
  id: string;
  full_name: string;
  phone: string | null;
  contact_email: string | null;
  avatar_url: string | null;
  rating: number | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  is_active: boolean;
  assigned_orders?: Array<{ status: OrderStatus | null }> | null;
};

type OrderRow = {
  id: string;
  order_number: number | null;
  status: OrderStatus;
  total_in_cents: number;
  payment_method: string;
  delivery_mode: string;
  placed_at: string;
  assigned_courier_id: string | null;
  customer_phone_snapshot: string | null;
  shipping_address_label: string | null;
  shipping_address_line: string | null;
  shipping_address_location: string | null;
  customer?: {
    full_name: string | null;
    phone: string | null;
  } | {
    full_name: string | null;
    phone: string | null;
  }[] | null;
  assigned_courier?: {
    full_name: string | null;
  } | {
    full_name: string | null;
  }[] | null;
};

type OrderItemRow = {
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price_in_cents: number;
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(base: string) {
  return `${slugify(base)}-${Date.now().toString().slice(-6)}`;
}

function normalizeMoney(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numeric = Number(cleaned);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Informe um preço válido.");
  }

  return Math.round(numeric * 100);
}

function normalizeInteger(value: string, label: string) {
  const numeric = Number.parseInt(value.replace(/\D/g, ""), 10);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`Informe ${label} válido.`);
  }

  return numeric;
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const client = getClient();
  const { data, error } = await client.from("categories").select("id, name, slug").order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
  }));
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("id, category_id, name, sku, description, price_in_cents, stock_quantity, unit_label, is_active, categories(name), product_images(image_url, is_primary, sort_order)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductRow[])
    .filter((product) => product.is_active)
    .map((product) => {
      const category = firstRelation(product.categories);
      const images = [...(product.product_images ?? [])].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
      );

      return {
        id: product.id,
        categoryId: product.category_id,
        categoryName: category?.name ?? "Sem categoria",
        name: product.name,
        sku: product.sku ?? `PRD-${product.id.slice(0, 8).toUpperCase()}`,
        description: product.description,
        priceInCents: product.price_in_cents,
        stockQuantity: product.stock_quantity,
        unitLabel: product.unit_label ?? "un",
        imageUrl: images[0]?.image_url,
        isActive: product.is_active,
      };
    });
}

export async function saveAdminProduct(input: AdminProductForm): Promise<AdminProduct[]> {
  const client = getClient();
  const payload = {
    category_id: input.categoryId,
    name: input.name.trim(),
    sku: input.sku.trim(),
    description: input.description.trim(),
    price_in_cents: normalizeMoney(input.price),
    stock_quantity: normalizeInteger(input.stock, "um estoque"),
    unit_label: input.unitLabel.trim().toLowerCase() || "un",
    is_active: true,
  };

  if (!payload.name || !payload.sku || !payload.description) {
    throw new Error("Preencha nome, SKU e descrição do produto.");
  }

  let productId = input.id;

  if (input.id) {
    const { error } = await client.from("products").update(payload).eq("id", input.id);

    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await client
      .from("products")
      .insert({
        ...payload,
        slug: uniqueSlug(payload.name),
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    productId = data.id as string;
  }

  if (!productId) {
    throw new Error("Não foi possível identificar o produto salvo.");
  }

  const { error: deleteImagesError } = await client.from("product_images").delete().eq("product_id", productId);

  if (deleteImagesError) {
    throw deleteImagesError;
  }

  if (input.imageUrl.trim()) {
    const { error: imageError } = await client.from("product_images").insert({
      product_id: productId,
      image_url: input.imageUrl.trim(),
      is_primary: true,
      sort_order: 0,
    });

    if (imageError) {
      throw imageError;
    }
  }

  return fetchAdminProducts();
}

export async function deleteAdminProduct(productId: string): Promise<AdminProduct[]> {
  const client = getClient();
  const { error } = await client
    .from("products")
    .update({
      is_active: false,
      stock_quantity: 0,
    })
    .eq("id", productId);

  if (error) {
    throw error;
  }

  return fetchAdminProducts();
}

export async function fetchAdminCouriers(): Promise<AdminCourier[]> {
  const client = getClient();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, phone, contact_email, avatar_url, rating, vehicle_type, vehicle_plate, is_active, assigned_orders:orders!orders_assigned_courier_id_fkey(status)")
    .eq("role", "COURIER")
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CourierRow[]).map((courier) => {
    const assignedOrders = courier.assigned_orders ?? [];
    const deliveriesCount = assignedOrders.filter((order) => order.status === "DELIVERED").length;
    const hasOrderInTransit = assignedOrders.some((order) => order.status === "OUT_FOR_DELIVERY");

    return {
      id: courier.id,
      fullName: courier.full_name,
      phone: courier.phone ?? undefined,
      contactEmail: courier.contact_email ?? undefined,
      avatarUrl: courier.avatar_url ?? undefined,
      rating: courier.rating ?? undefined,
      vehicleType: courier.vehicle_type ?? undefined,
      vehiclePlate: courier.vehicle_plate ?? undefined,
      deliveriesCount,
      status: hasOrderInTransit ? "DELIVERING" : courier.is_active ? "AVAILABLE" : "INACTIVE",
      isActive: courier.is_active,
    };
  });
}

export async function saveAdminCourier(input: AdminCourierForm): Promise<AdminCourier[]> {
  const client = getClient();
  const payload = {
    full_name: input.fullName.trim(),
    phone: input.phone.trim() || null,
    contact_email: input.contactEmail.trim().toLowerCase() || null,
    avatar_url: input.avatarUrl.trim() || null,
    vehicle_type: input.vehicleType.trim() || null,
    vehicle_plate: input.vehiclePlate.trim().toUpperCase() || null,
    is_active: input.status === "AVAILABLE",
  };

  if (!payload.full_name || !payload.contact_email) {
    throw new Error("Preencha nome e e-mail do entregador.");
  }

  if (input.id) {
    const { error } = await client.from("profiles").update(payload).eq("id", input.id);

    if (error) {
      throw error;
    }

    return fetchAdminCouriers();
  }

  const { data: existingProfile, error: existingProfileError } = await client
    .from("profiles")
    .select("id")
    .eq("contact_email", payload.contact_email)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (!existingProfile) {
    throw new Error("Use o e-mail de um usuário já cadastrado no app para promover esse perfil a entregador.");
  }

  const { error } = await client
    .from("profiles")
    .update({
      ...payload,
      role: "COURIER",
    })
    .eq("id", existingProfile.id);

  if (error) {
    throw error;
  }

  return fetchAdminCouriers();
}

export async function deleteAdminCourier(courierId: string): Promise<AdminCourier[]> {
  const client = getClient();
  const { error } = await client
    .from("profiles")
    .update({
      is_active: false,
    })
    .eq("id", courierId);

  if (error) {
    throw error;
  }

  return fetchAdminCouriers();
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const client = getClient();
  const { data, error } = await client
    .from("orders")
    .select("id, order_number, status, total_in_cents, payment_method, delivery_mode, placed_at, assigned_courier_id, customer_phone_snapshot, shipping_address_label, shipping_address_line, shipping_address_location, customer:profiles!orders_customer_id_fkey(full_name, phone), assigned_courier:profiles!orders_assigned_courier_id_fkey(full_name)")
    .order("placed_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as OrderRow[];
  const orderIds = orders.map((order) => order.id);
  const { data: items, error: itemsError } = await client
    .from("order_items")
    .select("order_id, product_name, quantity, unit_price_in_cents")
    .in("order_id", orderIds);

  if (itemsError) {
    throw itemsError;
  }

  const itemsByOrder = new Map<string, AdminOrderItem[]>();

  for (const item of (items ?? []) as OrderItemRow[]) {
    const currentItems = itemsByOrder.get(item.order_id) ?? [];
    currentItems.push({
      orderId: item.order_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPriceInCents: item.unit_price_in_cents,
      totalInCents: item.quantity * item.unit_price_in_cents,
    });
    itemsByOrder.set(item.order_id, currentItems);
  }

  return orders.map((order) => {
    const customer = firstRelation(order.customer);
    const assignedCourier = firstRelation(order.assigned_courier);

    return {
      id: order.order_number ? `#o${order.order_number}` : `#${order.id.slice(0, 6)}`,
      rawOrderId: order.id,
      status: order.status,
      totalInCents: order.total_in_cents,
      placedAt: order.placed_at,
      paymentMethod: order.payment_method,
      deliveryMode: order.delivery_mode,
      customerName: customer?.full_name ?? "Cliente",
      customerPhone: order.customer_phone_snapshot ?? customer?.phone ?? undefined,
      addressLabel: order.shipping_address_label ?? undefined,
      addressLine: order.shipping_address_line ?? undefined,
      addressLocation: order.shipping_address_location ?? undefined,
      assignedCourierId: order.assigned_courier_id ?? undefined,
      assignedCourierName: assignedCourier?.full_name ?? undefined,
      items: itemsByOrder.get(order.id) ?? [],
    };
  });
}

export async function approveAdminOrder(orderId: string) {
  const client = getClient();
  const { error } = await client.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: "PROCESSING",
  });

  if (error) {
    throw error;
  }
}

export async function rejectAdminOrder(orderId: string) {
  const client = getClient();
  const { error } = await client.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: "CANCELLED",
  });

  if (error) {
    throw error;
  }
}

export async function advanceAdminOrderToDelivery(orderId: string, courierId: string) {
  const client = getClient();

  const { error: assignError } = await client.rpc("assign_courier", {
    p_order_id: orderId,
    p_courier_id: courierId,
  });

  if (assignError) {
    throw assignError;
  }

  const { error } = await client.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: "OUT_FOR_DELIVERY",
  });

  if (error) {
    throw error;
  }
}
