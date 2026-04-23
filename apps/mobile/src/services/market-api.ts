import type { AppRole, DeliveryMode, OrderStatus, PaymentMethod, ProductSummary } from "@mercado/shared/domain/models";
import { supabase } from "./supabase";

export type AuthForm = {
  email: string;
  password: string;
  fullName?: string;
  cpf?: string;
  phone?: string;
};

export type Profile = {
  id: string;
  fullName: string;
  role: AppRole;
  email?: string;
};

export type CartLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OrderCard = {
  id: string;
  status: OrderStatus;
  total: number;
  paymentMethod: PaymentMethod;
  deliveryMode: DeliveryMode;
  confirmationCode?: string;
  assignedCourierName?: string;
};

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price_in_cents: number;
  discount_in_cents: number;
  stock_quantity: number;
  is_active: boolean;
  categories?: { name: string } | { name: string }[] | null;
  product_images?: Array<{
    image_url: string;
    is_primary: boolean;
    sort_order: number;
  }>;
};

type CartItemRow = {
  product_id: string;
  quantity: number;
  unit_price_in_cents: number;
  products?: { name: string } | { name: string }[] | null;
};

type OrderRow = {
  id: string;
  order_number: number | null;
  status: OrderStatus;
  total_in_cents: number;
  payment_method: PaymentMethod;
  delivery_mode: DeliveryMode;
  assigned_courier_id: string | null;
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

export async function getCurrentProfile(): Promise<Profile | null> {
  const client = getClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError?.message === "Auth session missing!") {
    return null;
  }

  if (userError) {
    throw userError;
  }

  if (!user) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    email: user.email,
  };
}

export async function signInWithPassword({ email, password }: AuthForm) {
  const client = getClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signUpCustomer({
  email,
  password,
  fullName,
  cpf,
  phone,
}: AuthForm) {
  const client = getClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        cpf,
        phone,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    hasSession: Boolean(data.session),
  };
}

export async function signOut() {
  const client = getClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export function subscribeToAuthChanges(onChange: () => void) {
  if (!supabase) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    onChange();
  });

  return () => subscription.unsubscribe();
}

export async function fetchProducts(): Promise<ProductSummary[]> {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select(
      "id, name, description, price_in_cents, discount_in_cents, stock_quantity, is_active, categories(name), product_images(image_url, is_primary, sort_order)",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProductRow[]).map((product) => {
    const category = firstRelation(product.categories);
    const images = [...(product.product_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    );

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      categoryName: category?.name ?? "Sem categoria",
      priceInCents: product.price_in_cents,
      discountInCents: product.discount_in_cents,
      availableQuantity: product.stock_quantity,
      imageUrl: images[0]?.image_url,
      isAvailable: product.is_active && product.stock_quantity > 0,
    };
  });
}

async function getOpenCartId() {
  const client = getClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Entre na sua conta antes de usar o carrinho.");
  }

  const { data: existingCart, error: existingCartError } = await client
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "OPEN")
    .maybeSingle();

  if (existingCartError) {
    throw existingCartError;
  }

  if (existingCart) {
    return existingCart.id as string;
  }

  const { data: createdCart, error: createdCartError } = await client
    .from("carts")
    .insert({ user_id: user.id, status: "OPEN" })
    .select("id")
    .single();

  if (createdCartError) {
    throw createdCartError;
  }

  return createdCart.id as string;
}

export async function fetchCartItems(): Promise<CartLine[]> {
  const client = getClient();
  const cartId = await getOpenCartId();
  const { data, error } = await client
    .from("cart_items")
    .select("product_id, quantity, unit_price_in_cents, products(name)")
    .eq("cart_id", cartId)
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CartItemRow[]).map((item) => {
    const product = firstRelation(item.products);

    return {
      productId: item.product_id,
      name: product?.name ?? "Produto",
      quantity: item.quantity,
      unitPrice: item.unit_price_in_cents,
    };
  });
}

export async function addProductToCart(product: ProductSummary): Promise<CartLine[]> {
  const client = getClient();
  const cartId = await getOpenCartId();
  const unitPrice = product.priceInCents - product.discountInCents;

  const { data: existingItem, error: existingItemError } = await client
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (existingItemError) {
    throw existingItemError;
  }

  if (existingItem) {
    const { error } = await client
      .from("cart_items")
      .update({ quantity: existingItem.quantity + 1, unit_price_in_cents: unitPrice })
      .eq("id", existingItem.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await client.from("cart_items").insert({
      cart_id: cartId,
      product_id: product.id,
      quantity: 1,
      unit_price_in_cents: unitPrice,
    });

    if (error) {
      throw error;
    }
  }

  return fetchCartItems();
}

export async function checkoutCart(
  deliveryMode: DeliveryMode,
  paymentMethod: PaymentMethod,
) {
  const client = getClient();
  const cartId = await getOpenCartId();
  const { data, error } = await client.rpc("checkout_cart", {
    p_cart_id: cartId,
    p_delivery_mode: deliveryMode,
    p_payment_method: paymentMethod,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function fetchOrders(): Promise<OrderCard[]> {
  const client = getClient();
  const { data, error } = await client
    .from("orders")
    .select("id, order_number, status, total_in_cents, payment_method, delivery_mode, assigned_courier_id")
    .order("placed_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as OrderRow[];
  const orderIds = orders.map((order) => order.id);
  const deliveryCodes = new Map<string, string>();

  if (orderIds.length > 0) {
    const { data: codes, error: codesError } = await client
      .from("order_delivery_codes")
      .select("order_id, confirmation_code")
      .in("order_id", orderIds);

    if (!codesError) {
      for (const code of codes ?? []) {
        deliveryCodes.set(code.order_id, code.confirmation_code);
      }
    }
  }

  return orders.map((order) => ({
    id: order.order_number ? `PED-${order.order_number}` : order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    total: order.total_in_cents,
    paymentMethod: order.payment_method,
    deliveryMode: order.delivery_mode,
    confirmationCode: deliveryCodes.get(order.id),
  }));
}
