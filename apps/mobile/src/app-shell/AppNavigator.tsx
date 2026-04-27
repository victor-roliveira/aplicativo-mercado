import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { subscribeToAuthChanges } from "../services/market-api";
import { useOrderRealtime } from "../services/use-order-realtime";
import { useAppStore } from "../state/app-store";
import { BottomTabs } from "./BottomTabs";
import type { AppTab, ProfileSection, PublicScreen } from "./navigation-types";
import { styles } from "./styles";
import { FeedbackBar } from "../components/FeedbackBar";
import { AuthScreen, LandingScreen } from "../features/auth/screens";
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

  const handleRealtimeChange = useCallback(() => {
    void refreshAddresses();
    void refreshCatalog();
    void refreshCart();
    void refreshOrders();
  }, [refreshAddresses, refreshCatalog, refreshCart, refreshOrders]);

  useOrderRealtime(handleRealtimeChange);

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
