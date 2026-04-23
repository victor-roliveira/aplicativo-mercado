import { create } from "zustand";
import type { AppRole, DeliveryMode, PaymentMethod, ProductSummary } from "@mercado/shared/domain/models";
import {
  addProductToCart as addProductToRemoteCart,
  checkoutCart,
  fetchCartItems,
  fetchOrders,
  fetchProducts,
  getCurrentProfile,
  signInWithPassword,
  signOut as signOutRemote,
  signUpCustomer,
  type AuthForm,
  type CartLine,
  type OrderCard,
  type Profile,
} from "../services/market-api";

type AppState = {
  activeRole: AppRole;
  profile: Profile | null;
  products: ProductSummary[];
  cart: CartLine[];
  orders: OrderCard[];
  isLoading: boolean;
  isAuthenticated: boolean;
  statusMessage?: string;
  errorMessage?: string;
  setActiveRole: (role: AppRole) => void;
  bootstrap: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  signIn: (form: AuthForm) => Promise<void>;
  signUp: (form: AuthForm) => Promise<void>;
  signOut: () => Promise<void>;
  addToCart: (product: ProductSummary) => Promise<void>;
  checkout: (deliveryMode: DeliveryMode, paymentMethod: PaymentMethod) => Promise<void>;
  clearFeedback: () => void;
};

const demoProducts: ProductSummary[] = [
  {
    id: "prod-demo-banana",
    name: "Banana prata",
    description: "Produto demo exibido quando o Supabase ainda nao carregou.",
    categoryName: "Frutas",
    priceInCents: 899,
    discountInCents: 100,
    availableQuantity: 32,
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e",
    isAvailable: true,
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Nao foi possivel concluir a operacao.";
}

export const useAppStore = create<AppState>((set, get) => ({
  activeRole: "CUSTOMER",
  profile: null,
  products: demoProducts,
  cart: [],
  orders: [],
  isLoading: false,
  isAuthenticated: false,
  setActiveRole: (role) => set({ activeRole: role }),
  clearFeedback: () => set({ errorMessage: undefined, statusMessage: undefined }),
  bootstrap: async () => {
    set({ isLoading: true, errorMessage: undefined });

    try {
      const profile = await getCurrentProfile();
      const products = await fetchProducts();
      const isAuthenticated = Boolean(profile);
      const [cart, orders] = isAuthenticated
        ? await Promise.all([fetchCartItems(), fetchOrders()])
        : [[], []];

      set({
        profile,
        products,
        cart,
        orders,
        activeRole: profile?.role ?? "CUSTOMER",
        isAuthenticated,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: getErrorMessage(error),
      });
    }
  },
  refreshCatalog: async () => {
    try {
      const products = await fetchProducts();
      set({ products });
    } catch (error) {
      set({ errorMessage: getErrorMessage(error) });
    }
  },
  refreshCart: async () => {
    if (!get().isAuthenticated) {
      return;
    }

    try {
      const cart = await fetchCartItems();
      set({ cart });
    } catch (error) {
      set({ errorMessage: getErrorMessage(error) });
    }
  },
  refreshOrders: async () => {
    if (!get().isAuthenticated) {
      return;
    }

    try {
      const orders = await fetchOrders();
      set({ orders });
    } catch (error) {
      set({ errorMessage: getErrorMessage(error) });
    }
  },
  signIn: async (form) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      await signInWithPassword(form);
      await get().bootstrap();
      set({ statusMessage: "Login realizado com sucesso." });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  signUp: async (form) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const result = await signUpCustomer(form);

      if (!result.hasSession) {
        set({
          profile: null,
          cart: [],
          orders: [],
          activeRole: "CUSTOMER",
          isAuthenticated: false,
          isLoading: false,
          statusMessage:
            "Conta criada. Confirme seu email no Supabase antes de entrar.",
        });
        return;
      }

      await get().bootstrap();
      set({
        statusMessage:
          "Conta criada e login realizado com sucesso.",
      });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  signOut: async () => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      await signOutRemote();
      set({
        profile: null,
        cart: [],
        orders: [],
        activeRole: "CUSTOMER",
        isAuthenticated: false,
        isLoading: false,
        statusMessage: "Sessao encerrada.",
      });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  addToCart: async (product) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const cart = await addProductToRemoteCart(product);
      set({ cart, isLoading: false, statusMessage: "Produto adicionado ao carrinho." });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  checkout: async (deliveryMode, paymentMethod) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      await checkoutCart(deliveryMode, paymentMethod);
      const [products, cart, orders] = await Promise.all([
        fetchProducts(),
        fetchCartItems(),
        fetchOrders(),
      ]);

      set({
        products,
        cart,
        orders,
        isLoading: false,
        statusMessage: "Pedido criado com sucesso. O estoque ja foi atualizado.",
      });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
}));
