import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { consumePasswordRecoveryLink, subscribeToAuthChanges } from "../services/market-api";
import { useOrderRealtime } from "../services/use-order-realtime";
import { useAppStore } from "../state/app-store";
import { BottomTabs } from "./BottomTabs";
import type { AppTab, ProfileSection, PublicScreen } from "./navigation-types";
import { styles } from "./styles";
import { FeedbackBar } from "../components/FeedbackBar";
import { AdminNavigator } from "../features/admin/screens";
import { AuthScreen, LandingScreen, ResetPasswordScreen } from "../features/auth/screens";
import { HomeScreen, ProductDetailScreen } from "../features/catalog/screens";
import { CartScreen } from "../features/cart/screens";
import { CheckoutScreen, OrdersScreen, TrackScreen } from "../features/orders/screens";
import { AddressesScreen, ProfileScreen } from "../features/profile/screens";

export function AppNavigator() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const activeRole = useAppStore((state) => state.activeRole);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const refreshAddresses = useAppStore((state) => state.refreshAddresses);
  const refreshCatalog = useAppStore((state) => state.refreshCatalog);
  const refreshCart = useAppStore((state) => state.refreshCart);
  const refreshOrders = useAppStore((state) => state.refreshOrders);
  const [publicScreen, setPublicScreen] = useState<PublicScreen>("landing");
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [profileSection, setProfileSection] = useState<ProfileSection>("overview");
  const [tracking, setTracking] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const products = useAppStore((state) => state.products);

  useEffect(() => {
    void bootstrap();

    return subscribeToAuthChanges(() => {
      void bootstrap();
    });
  }, [bootstrap]);

  useEffect(() => {
    let isMounted = true;

    const handleRecoveryUrl = async (url: string | null) => {
      if (!url) {
        return;
      }

      try {
        const isRecoveryLink = await consumePasswordRecoveryLink(url);

        if (isMounted && isRecoveryLink) {
          setPublicScreen("reset-password");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel abrir o link de recuperacao.";
        useAppStore.setState({ errorMessage: message });
      }
    };

    void Linking.getInitialURL().then((url) => void handleRecoveryUrl(url));
    const subscription = Linking.addEventListener("url", ({ url }: { url: string }) => {
      void handleRecoveryUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleRealtimeChange = useCallback(() => {
    void refreshAddresses();
    void refreshCatalog();
    void refreshCart();
    void refreshOrders();
  }, [refreshAddresses, refreshCatalog, refreshCart, refreshOrders]);

  useOrderRealtime(handleRealtimeChange);

  if (publicScreen === "reset-password") {
    return (
      <SafeAreaView style={styles.appRoot} edges={["top", "left", "right"]}>
        <FeedbackBar />
        <ResetPasswordScreen onBack={() => setPublicScreen("login")} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.appRoot} edges={["top", "left", "right"]}>
        <FeedbackBar />
        {publicScreen === "landing" ? (
          <LandingScreen
            onLogin={() => setPublicScreen("login")}
            onRegister={() => setPublicScreen("register")}
          />
        ) : (
          <AuthScreen
            mode={publicScreen === "login" ? "login" : "register"}
            registrationKind={publicScreen === "register-courier" ? "courier" : "customer"}
            onModeChange={setPublicScreen}
          />
        )}
      </SafeAreaView>
    );
  }

  if (activeRole === "ADMIN" || activeRole === "DEVELOPER") {
    return (
      <SafeAreaView style={styles.appRoot} edges={["top", "left", "right"]}>
        <FeedbackBar />
        <AdminNavigator />
      </SafeAreaView>
    );
  }

  const shouldShowCustomerTabs = activeRole === "CUSTOMER";
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const isNestedScreen =
    tracking || checkoutOpen || Boolean(selectedProduct) || profileSection === "addresses";

  const handleTabChange = (tab: AppTab) => {
    setTracking(false);
    setCheckoutOpen(false);
    setProfileSection("overview");
    setSelectedProductId(undefined);
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.appRoot} edges={["top", "left", "right"]}>
      <FeedbackBar />
      {selectedProduct ? (
        <ProductDetailScreen
          product={selectedProduct}
          onBack={() => setSelectedProductId(undefined)}
        />
      ) : checkoutOpen ? (
        <CheckoutScreen
          onBack={() => setCheckoutOpen(false)}
          onCompleted={() => {
            setCheckoutOpen(false);
            setActiveTab("orders");
          }}
        />
      ) : tracking ? (
        <TrackScreen onBack={() => setTracking(false)} />
      ) : activeTab === "home" ? (
        <HomeScreen
          onCart={() => setActiveTab("cart")}
          onProduct={setSelectedProductId}
        />
      ) : activeTab === "cart" ? (
        <CartScreen onCheckout={() => setCheckoutOpen(true)} />
      ) : activeTab === "orders" ? (
        <OrdersScreen onTrack={() => setTracking(true)} />
      ) : profileSection === "addresses" ? (
        <AddressesScreen onBack={() => setProfileSection("overview")} />
      ) : (
        <ProfileScreen onOpenAddresses={() => setProfileSection("addresses")} />
      )}
      {shouldShowCustomerTabs && !isNestedScreen ? (
        <BottomTabs activeTab={activeTab} onChange={handleTabChange} />
      ) : null}
    </SafeAreaView>
  );
}
