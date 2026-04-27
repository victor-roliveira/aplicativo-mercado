import type {
  AddressRecord,
  AppRole,
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  ProductSummary,
} from "@mercado/shared/domain/models";
import Constants from "expo-constants";
import { supabase } from "./supabase";

export type AuthForm = {
  email: string;
  password: string;
  fullName?: string;
  cpf?: string;
  phone?: string;
  accountRole?: Extract<AppRole, "CUSTOMER" | "COURIER">;
  vehiclePlate?: string;
  driverLicense?: string;
};

export type Profile = {
  id: string;
  fullName: string;
  role: AppRole;
  email?: string;
  contactEmail?: string;
  phone?: string;
  avatarUrl?: string;
  rating?: number;
  vehicleType?: string;
  vehiclePlate?: string;
  driverLicense?: string;
  createdAt?: string;
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
  rawOrderId: string;
  placedAt?: string;
  processingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  assignedCourierName?: string;
  assignedCourierAvatarUrl?: string;
  assignedCourierRating?: number;
};

export type AddressFormData = {
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
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
  placed_at: string;
  processing_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  assigned_courier?: {
    full_name: string;
    avatar_url: string | null;
    rating: number | null;
  } | {
    full_name: string;
    avatar_url: string | null;
    rating: number | null;
  }[] | null;
};

type AddressRow = {
  id: string;
  user_id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
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

function mapAddressRow(address: AddressRow): AddressRecord {
  return {
    id: address.id,
    userId: address.user_id,
    label: address.label,
    street: address.street,
    number: address.number,
    complement: address.complement ?? undefined,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zipCode: address.zip_code,
    lastUsedAt: address.last_used_at ?? undefined,
    createdAt: address.created_at,
    updatedAt: address.updated_at,
  };
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
    .select("id, full_name, role, contact_email, phone, avatar_url, rating, vehicle_type, vehicle_plate, driver_license, created_at")
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
    contactEmail: data.contact_email ?? user.email ?? undefined,
    phone: data.phone ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
    rating: data.rating ?? undefined,
    vehicleType: data.vehicle_type ?? undefined,
    vehiclePlate: data.vehicle_plate ?? undefined,
    driverLicense: data.driver_license ?? undefined,
    createdAt: data.created_at ?? undefined,
  };
}

export async function signInWithPassword({ email, password }: AuthForm) {
  const client = getClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signUpAccount({
  email,
  password,
  fullName,
  cpf,
  phone,
  accountRole,
  vehiclePlate,
  driverLicense,
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
        requested_role: accountRole ?? "CUSTOMER",
        vehicle_plate: vehiclePlate,
        driver_license: driverLicense,
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

export async function requestPasswordReset(email: string) {
  const client = getClient();
  const baseUrl = Constants.linkingUri?.replace(/\/+$/, "");
  const redirectTo = baseUrl
    ? `${baseUrl.includes("/--") ? baseUrl : `${baseUrl}/--`}/reset-password`
    : "mercado://reset-password";
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

function extractAuthParams(url: string) {
  const [basePart, hashPart = ""] = url.split("#");
  const queryString = basePart.includes("?") ? basePart.split("?")[1] ?? "" : "";
  const params = new URLSearchParams(queryString);
  const hashParams = new URLSearchParams(hashPart);

  hashParams.forEach((value, key) => {
    params.set(key, value);
  });

  return params;
}

export async function consumePasswordRecoveryLink(url: string) {
  const client = getClient();
  const params = extractAuthParams(url);
  const type = params.get("type");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const errorDescription = params.get("error_description");

  if (errorDescription) {
    throw new Error(decodeURIComponent(errorDescription));
  }

  if (type !== "recovery" || !accessToken || !refreshToken) {
    return false;
  }

  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function updatePassword(password: string) {
  const client = getClient();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function fetchAddresses(): Promise<AddressRecord[]> {
  const client = getClient();
  const { data, error } = await client
    .from("addresses")
    .select("id, user_id, label, street, number, complement, neighborhood, city, state, zip_code, last_used_at, created_at, updated_at")
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as AddressRow[]).map(mapAddressRow);
}

export async function createAddress(input: AddressFormData): Promise<AddressRecord[]> {
  const client = getClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Entre novamente para gerenciar seus endereços.");
  }

  const currentAddresses = await fetchAddresses();
  const payload = {
    user_id: user.id,
    label: input.label.trim(),
    street: input.street.trim(),
    number: input.number.trim(),
    complement: input.complement?.trim() || null,
    neighborhood: input.neighborhood.trim(),
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    zip_code: input.zipCode.trim(),
    last_used_at: currentAddresses.length === 0 ? new Date().toISOString() : null,
  };

  const { error } = await client.from("addresses").insert(payload);

  if (error) {
    throw error;
  }

  return fetchAddresses();
}

export async function updateAddress(
  addressId: string,
  input: AddressFormData,
): Promise<AddressRecord[]> {
  const client = getClient();
  const { error } = await client
    .from("addresses")
    .update({
      label: input.label.trim(),
      street: input.street.trim(),
      number: input.number.trim(),
      complement: input.complement?.trim() || null,
      neighborhood: input.neighborhood.trim(),
      city: input.city.trim(),
      state: input.state.trim().toUpperCase(),
      zip_code: input.zipCode.trim(),
    })
    .eq("id", addressId);

  if (error) {
    throw error;
  }

  return fetchAddresses();
}

export async function markAddressAsLastUsed(addressId: string): Promise<AddressRecord[]> {
  const client = getClient();
  const { error } = await client.rpc("mark_address_last_used", {
    p_address_id: addressId,
  });

  if (error) {
    throw error;
  }

  return fetchAddresses();
}

export async function deleteAddress(addressId: string): Promise<AddressRecord[]> {
  const client = getClient();
  const { error } = await client.from("addresses").delete().eq("id", addressId);

  if (error) {
    throw error;
  }

  const addresses = await fetchAddresses();

  if (addresses.length > 0 && !addresses.some((address) => address.lastUsedAt)) {
    return markAddressAsLastUsed(addresses[0].id);
  }

  return addresses;
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

export async function decrementCartItem(productId: string): Promise<CartLine[]> {
  const client = getClient();
  const cartId = await getOpenCartId();
  const { data: existingItem, error: existingItemError } = await client
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingItemError) {
    throw existingItemError;
  }

  if (!existingItem) {
    return fetchCartItems();
  }

  if (existingItem.quantity <= 1) {
    const { error } = await client
      .from("cart_items")
      .delete()
      .eq("id", existingItem.id);

    if (error) {
      throw error;
    }

    return fetchCartItems();
  }

  const { error } = await client
    .from("cart_items")
    .update({ quantity: existingItem.quantity - 1 })
    .eq("id", existingItem.id);

  if (error) {
    throw error;
  }

  return fetchCartItems();
}

export async function removeCartItem(productId: string): Promise<CartLine[]> {
  const client = getClient();
  const cartId = await getOpenCartId();
  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId)
    .eq("product_id", productId);

  if (error) {
    throw error;
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
    .select("id, order_number, status, total_in_cents, payment_method, delivery_mode, assigned_courier_id, placed_at, processing_at, out_for_delivery_at, delivered_at, assigned_courier:profiles!orders_assigned_courier_id_fkey(full_name, avatar_url, rating)")
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
    rawOrderId: order.id,
    status: order.status,
    total: order.total_in_cents,
    paymentMethod: order.payment_method,
    deliveryMode: order.delivery_mode,
    confirmationCode: deliveryCodes.get(order.id),
    placedAt: order.placed_at,
    processingAt: order.processing_at ?? undefined,
    outForDeliveryAt: order.out_for_delivery_at ?? undefined,
    deliveredAt: order.delivered_at ?? undefined,
    assignedCourierName: firstRelation(order.assigned_courier)?.full_name ?? undefined,
    assignedCourierAvatarUrl: firstRelation(order.assigned_courier)?.avatar_url ?? undefined,
    assignedCourierRating: firstRelation(order.assigned_courier)?.rating ?? undefined,
  }));
}
