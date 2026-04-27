import { create } from "zustand";
import type {
  AdminCategory,
  AdminCourier,
  AdminCourierForm,
  AdminOrder,
  AdminProduct,
  AdminProductForm,
} from "../../services/admin-api";
import {
  advanceAdminOrderToDelivery,
  approveAdminOrder,
  deleteAdminCourier,
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminCouriers,
  fetchAdminOrders,
  fetchAdminProducts,
  rejectAdminOrder,
  saveAdminCourier,
  saveAdminProduct,
} from "../../services/admin-api";
import { useAppStore } from "../../state/app-store";

type AdminState = {
  categories: AdminCategory[];
  products: AdminProduct[];
  couriers: AdminCourier[];
  orders: AdminOrder[];
  isLoading: boolean;
  bootstrap: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshCouriers: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  saveProduct: (input: AdminProductForm) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  saveCourier: (input: AdminCourierForm) => Promise<void>;
  deleteCourier: (courierId: string) => Promise<void>;
  approveOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string) => Promise<void>;
  advanceOrder: (orderId: string, courierId: string) => Promise<void>;
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
        : "Não foi possível concluir a operação administrativa.";

  useAppStore.setState({
    errorMessage: message,
    statusMessage: undefined,
  });
}

export const useAdminStore = create<AdminState>((set, get) => ({
  categories: [],
  products: [],
  couriers: [],
  orders: [],
  isLoading: false,
  bootstrap: async () => {
    set({ isLoading: true });

    try {
      const [categories, products, couriers, orders] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminProducts(),
        fetchAdminCouriers(),
        fetchAdminOrders(),
      ]);

      set({
        categories,
        products,
        couriers,
        orders,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  refreshProducts: async () => {
    try {
      const [categories, products] = await Promise.all([fetchAdminCategories(), fetchAdminProducts()]);
      set({ categories, products });
    } catch (error) {
      setError(error);
    }
  },
  refreshCouriers: async () => {
    try {
      const couriers = await fetchAdminCouriers();
      set({ couriers });
    } catch (error) {
      setError(error);
    }
  },
  refreshOrders: async () => {
    try {
      const orders = await fetchAdminOrders();
      set({ orders });
    } catch (error) {
      setError(error);
    }
  },
  saveProduct: async (input) => {
    set({ isLoading: true });

    try {
      const products = await saveAdminProduct(input);
      set({ products, isLoading: false });
      setFeedback(input.id ? "Produto atualizado com sucesso." : "Produto criado com sucesso.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  deleteProduct: async (productId) => {
    set({ isLoading: true });

    try {
      const products = await deleteAdminProduct(productId);
      set({ products, isLoading: false });
      setFeedback("Produto removido do catálogo.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  saveCourier: async (input) => {
    set({ isLoading: true });

    try {
      const couriers = await saveAdminCourier(input);
      set({ couriers, isLoading: false });
      setFeedback(input.id ? "Entregador atualizado com sucesso." : "Entregador configurado com sucesso.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  deleteCourier: async (courierId) => {
    set({ isLoading: true });

    try {
      const couriers = await deleteAdminCourier(courierId);
      set({ couriers, isLoading: false });
      setFeedback("Entregador desativado.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  approveOrder: async (orderId) => {
    set({ isLoading: true });

    try {
      await approveAdminOrder(orderId);
      const orders = await fetchAdminOrders();
      set({ orders, isLoading: false });
      setFeedback("Pedido aprovado e enviado para processamento.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  rejectOrder: async (orderId) => {
    set({ isLoading: true });

    try {
      await rejectAdminOrder(orderId);
      const orders = await fetchAdminOrders();
      set({ orders, isLoading: false });
      setFeedback("Pedido recusado.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
  advanceOrder: async (orderId, courierId) => {
    set({ isLoading: true });

    try {
      await advanceAdminOrderToDelivery(orderId, courierId);
      const [orders, couriers] = await Promise.all([fetchAdminOrders(), fetchAdminCouriers()]);
      set({ orders, couriers, isLoading: false });
      setFeedback("Pedido saiu para entrega.");
    } catch (error) {
      set({ isLoading: false });
      setError(error);
    }
  },
}));
