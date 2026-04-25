export type AppRole = "CUSTOMER" | "COURIER" | "ADMIN" | "DEVELOPER";

export type OrderStatus =
  | "PLACED"
  | "PROCESSING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "STOCK_ISSUE";

export type PaymentMethod = "PIX" | "CASH" | "CARD_ON_DELIVERY" | "CARD_ONLINE";
export type DeliveryMode = "DELIVERY" | "PICKUP";

export type ProductSummary = {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  priceInCents: number;
  discountInCents: number;
  availableQuantity: number;
  imageUrl?: string;
  isAvailable: boolean;
};

export type AddressRecord = {
  id: string;
  userId: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderSummary = {
  id: string;
  userId: string;
  status: OrderStatus;
  totalInCents: number;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  confirmationCode: string;
  assignedCourierId?: string;
  assignedCourierName?: string;
  assignedCourierAvatarUrl?: string;
  assignedCourierRating?: number;
  placedAt?: string;
  processingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
};
