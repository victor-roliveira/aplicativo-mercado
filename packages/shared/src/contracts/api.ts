import type { OrderStatus, ProductSummary } from "../domain/models";

export type CatalogResponse = {
  products: ProductSummary[];
};

export type CheckoutRequest = {
  cartId: string;
  deliveryMode: "DELIVERY" | "PICKUP";
  paymentMethod: "PIX" | "CASH" | "CARD_ON_DELIVERY" | "CARD_ONLINE";
  changeForInCents?: number;
  notes?: string;
};

export type OrderRealtimeEvent = {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
  message: string;
};
