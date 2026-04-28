import { create } from "zustand";
import type { AddressRecord, AppRole, DeliveryMode, PaymentMethod, ProductSummary } from "@mercado/shared/domain/models";
import {
  addProductToCart as addProductToRemoteCart,
  checkoutCart,
  createAddress as createRemoteAddress,
  deleteAddress as deleteRemoteAddress,
  decrementCartItem as decrementRemoteCartItem,
  fetchAddresses,
  fetchCartItems,
  fetchOrders,
  fetchProducts,
  getCurrentProfile,
  markAddressAsLastUsed as markRemoteAddressAsLastUsed,
  removeCartItem as removeRemoteCartItem,
  requestPasswordReset as requestRemotePasswordReset,
  signInWithPassword,
  signOut as signOutRemote,
  signUpAccount,
  updateMyProfile as updateRemoteProfile,
  updatePassword as updateRemotePassword,
  updateAddress as updateRemoteAddress,
  type AddressFormData,
  type AuthForm,
  type CartLine,
  type OrderCard,
  type Profile,
  type ProfileUpdateFormData,
} from "../services/market-api";

type AppState = {
  activeRole: AppRole;
  profile: Profile | null;
  addresses: AddressRecord[];
  products: ProductSummary[];
  cart: CartLine[];
  orders: OrderCard[];
  isLoading: boolean;
  isAuthenticated: boolean;
  statusMessage?: string;
  errorMessage?: string;
  bootstrap: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  signIn: (form: AuthForm) => Promise<void>;
  signUp: (form: AuthForm) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string, confirmPassword: string) => Promise<void>;
  changePassword: (password: string, confirmPassword: string) => Promise<void>;
  updateProfile: (input: ProfileUpdateFormData) => Promise<void>;
  signOut: () => Promise<void>;
  createAddress: (input: AddressFormData) => Promise<void>;
  updateAddress: (addressId: string, input: AddressFormData) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  markAddressAsLastUsed: (addressId: string) => Promise<void>;
  addToCart: (product: ProductSummary) => Promise<void>;
  decrementCartItem: (productId: string) => Promise<void>;
  removeCartItem: (productId: string) => Promise<void>;
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
  {
    id: "prod-demo-tomate",
    name: "Tomate italiano",
    description: "Tomate fresco para saladas e molhos.",
    categoryName: "Frutas e Verduras",
    priceInCents: 1290,
    discountInCents: 190,
    availableQuantity: 24,
    imageUrl: "https://images.unsplash.com/photo-1546470427-e26264be0b0d",
    isAvailable: true,
  },
  {
    id: "prod-demo-picanha",
    name: "Picanha premium",
    description: "Corte nobre com marmoreio equilibrado.",
    categoryName: "Proteínas",
    priceInCents: 8990,
    discountInCents: 1000,
    availableQuantity: 10,
    imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f",
    isAvailable: true,
  },
  {
    id: "prod-demo-frango",
    name: "Peito de frango",
    description: "Bandeja resfriada, ideal para o dia a dia.",
    categoryName: "Proteínas",
    priceInCents: 2590,
    discountInCents: 0,
    availableQuantity: 18,
    imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791",
    isAvailable: true,
  },
  {
    id: "prod-demo-salmao",
    name: "Filé de salmão",
    description: "Peixe fresco com corte alto.",
    categoryName: "Proteínas",
    priceInCents: 5990,
    discountInCents: 450,
    availableQuantity: 8,
    imageUrl: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44",
    isAvailable: true,
  },
  {
    id: "prod-demo-leite",
    name: "Leite integral 1L",
    description: "Leite integral gelado e pronto para consumo.",
    categoryName: "Laticínios",
    priceInCents: 649,
    discountInCents: 0,
    availableQuantity: 42,
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b",
    isAvailable: true,
  },
  {
    id: "prod-demo-iogurte",
    name: "Iogurte natural",
    description: "Pote cremoso ideal para café da manhã.",
    categoryName: "Laticínios",
    priceInCents: 899,
    discountInCents: 90,
    availableQuantity: 20,
    imageUrl: "https://images.unsplash.com/photo-1571212515416-fef01fc43637",
    isAvailable: true,
  },
  {
    id: "prod-demo-manteiga",
    name: "Manteiga com sal",
    description: "Textura cremosa para pães e receitas.",
    categoryName: "Laticínios",
    priceInCents: 1390,
    discountInCents: 150,
    availableQuantity: 16,
    imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d",
    isAvailable: true,
  },
  {
    id: "prod-demo-queijo",
    name: "Queijo mussarela",
    description: "Peça fresca para lanches e receitas.",
    categoryName: "Frios",
    priceInCents: 4290,
    discountInCents: 0,
    availableQuantity: 14,
    imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d",
    isAvailable: true,
  },
  {
    id: "prod-demo-suco",
    name: "Suco de laranja 1L",
    description: "Suco integral gelado e refrescante.",
    categoryName: "Bebidas",
    priceInCents: 1290,
    discountInCents: 0,
    availableQuantity: 27,
    imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba",
    isAvailable: true,
  },
];

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : typeof error === "string"
          ? error
          : "";

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Confirme seu email no Supabase antes de entrar.";
  }

  if (normalizedMessage.includes("auth session missing")) {
    return "Sessao expirada. Entre novamente para continuar.";
  }

  if (normalizedMessage.includes("network request failed") || normalizedMessage.includes("fetch")) {
    return "Nao foi possivel conectar ao Supabase. Verifique sua internet e as chaves do .env.";
  }

  if (message) {
    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Nao foi possivel concluir a operacao.";
}

function validatePasswordInput(password: string, confirmPassword: string) {
  if (password.trim().length < 8) {
    throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
  }

  if (password !== confirmPassword) {
    throw new Error("As senhas nao coincidem.");
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  activeRole: "CUSTOMER",
  profile: null,
  addresses: [],
  products: demoProducts,
  cart: [],
  orders: [],
  isLoading: false,
  isAuthenticated: false,
  clearFeedback: () => set({ errorMessage: undefined, statusMessage: undefined }),
  bootstrap: async () => {
    set({ isLoading: true, errorMessage: undefined });

    try {
      const profile = await getCurrentProfile();
      const productsResponse = await fetchProducts();
      const products = productsResponse.length > 0 ? productsResponse : demoProducts;
      const isAuthenticated = Boolean(profile);
      const [addresses, cart, orders] = isAuthenticated
        ? await Promise.all([fetchAddresses(), fetchCartItems(), fetchOrders()])
        : [[], [], []];

      set({
        profile,
        addresses,
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
      const productsResponse = await fetchProducts();
      const products = productsResponse.length > 0 ? productsResponse : demoProducts;
      set({ products });
    } catch (error) {
      set({ errorMessage: getErrorMessage(error) });
    }
  },
  refreshAddresses: async () => {
    if (!get().isAuthenticated) {
      return;
    }

    try {
      const addresses = await fetchAddresses();
      set({ addresses });
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
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  signUp: async (form) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const accountRole = form.accountRole ?? "CUSTOMER";

      if (!form.fullName?.trim()) {
        throw new Error("Informe seu nome completo.");
      }

      if (!form.cpf?.trim()) {
        throw new Error("Informe seu CPF.");
      }

      if (!form.phone?.trim()) {
        throw new Error("Informe seu telefone.");
      }

      if (accountRole === "COURIER") {
        if (!form.vehiclePlate?.trim()) {
          throw new Error("Informe a placa do veiculo.");
        }

        if (!form.driverLicense?.trim()) {
          throw new Error("Informe a CNH.");
        }
      }

      const result = await signUpAccount(form);

      if (!result.hasSession) {
        set({
          profile: null,
          cart: [],
          orders: [],
          activeRole: accountRole,
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
  requestPasswordReset: async (email) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      if (!email.trim()) {
        throw new Error("Informe seu email para recuperar a senha.");
      }

      await requestRemotePasswordReset(email);
      set({
        isLoading: false,
        statusMessage: "Enviamos o link de redefinicao para seu email.",
      });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  updatePassword: async (password, confirmPassword) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      validatePasswordInput(password, confirmPassword);
      await updateRemotePassword(password);
      await get().bootstrap();
      set({
        isLoading: false,
        statusMessage: "Senha atualizada com sucesso.",
      });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  changePassword: async (password, confirmPassword) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      validatePasswordInput(password, confirmPassword);
      await updateRemotePassword(password);
      set({
        isLoading: false,
        statusMessage: "Senha alterada com sucesso.",
      });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  updateProfile: async (input) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      if (!input.fullName.trim()) {
        throw new Error("Informe seu nome completo.");
      }

      if (!input.phone.trim()) {
        throw new Error("Informe seu telefone.");
      }

      const profile = await updateRemoteProfile(input);
      set({
        profile,
        activeRole: profile.role,
        isLoading: false,
        statusMessage: "Perfil atualizado com sucesso.",
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
        addresses: [],
        cart: [],
        orders: [],
        activeRole: "CUSTOMER",
        isAuthenticated: false,
        isLoading: false,
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
  createAddress: async (input) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const addresses = await createRemoteAddress(input);
      set({ addresses, isLoading: false, statusMessage: "Endereço adicionado com sucesso." });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  updateAddress: async (addressId, input) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const addresses = await updateRemoteAddress(addressId, input);
      set({ addresses, isLoading: false, statusMessage: "Endereço atualizado com sucesso." });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  deleteAddress: async (addressId) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const addresses = await deleteRemoteAddress(addressId);
      set({ addresses, isLoading: false, statusMessage: "Endereço removido com sucesso." });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  markAddressAsLastUsed: async (addressId) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const addresses = await markRemoteAddressAsLastUsed(addressId);
      set({ addresses, isLoading: false, statusMessage: "Endereço definido como último utilizado." });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  decrementCartItem: async (productId) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const cart = await decrementRemoteCartItem(productId);
      set({ cart, isLoading: false });
    } catch (error) {
      set({ isLoading: false, errorMessage: getErrorMessage(error) });
    }
  },
  removeCartItem: async (productId) => {
    set({ isLoading: true, errorMessage: undefined, statusMessage: undefined });

    try {
      const cart = await removeRemoteCartItem(productId);
      set({ cart, isLoading: false, statusMessage: "Produto removido do carrinho." });
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
