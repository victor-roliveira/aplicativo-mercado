import { create } from "zustand";
import {
  confirmCourierOrderDelivery,
  fetchCourierOrders,
  markCourierOrderOutForDelivery,
  type CourierOrder,
} from "../../services/courier-api";
import { useAppStore } from "../../state/app-store";

type CourierState = {
  orders: CourierOrder[];
  isLoading: boolean;
  bootstrap: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  markOutForDelivery: (orderId: string) => Promise<void>;
  confirmDelivery: (orderId: string, code: string) => Promise<void>;
};

function setFeedback(message: string) {
  useAppStore.setState({
    statusMessage: message,
    errorMessage: undefined,
  });
}

function setError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Nao foi possivel concluir a operacao do entregador.";

  useAppStore.setState({
    errorMessage: message,
    statusMessage: undefined,
  });
}

export const useCourierStore = create<CourierState>((set) => ({
  orders: [],
  isLoading: false,
  bootstrap: async () => {
    set({ isLoading: true });

    try {
      const orders = await fetchCourierOrders();
      set({ orders, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  refreshOrders: async () => {
    try {
      const orders = await fetchCourierOrders();
      set({ orders });
    } catch (error) {
      setError(error);
    }
  },
  markOutForDelivery: async (orderId) => {
    set({ isLoading: true });

    try {
      await markCourierOrderOutForDelivery(orderId);
      const orders = await fetchCourierOrders();
      set({ orders, isLoading: false });
      setFeedback("Pedido marcado como saiu para entrega.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  confirmDelivery: async (orderId, code) => {
    set({ isLoading: true });

    try {
      await confirmCourierOrderDelivery(orderId, code);
      const orders = await fetchCourierOrders();
      set({ orders, isLoading: false });
      setFeedback("Entrega confirmada com sucesso.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
}));
