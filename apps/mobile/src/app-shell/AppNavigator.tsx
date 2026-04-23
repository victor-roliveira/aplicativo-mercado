import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Chip, Text, TextInput } from "react-native-paper";
import type {
  AppRole,
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  ProductSummary,
} from "@mercado/shared/domain/models";
import { subscribeToAuthChanges } from "../services/market-api";
import { useOrderRealtime } from "../services/use-order-realtime";
import { useAppStore } from "../state/app-store";

type PublicScreen = "landing" | "login" | "register";
type AppTab = "home" | "cart" | "orders" | "profile";
type FeatherName = keyof typeof Feather.glyphMap;
type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const palette = {
  background: "#140c0f",
  backgroundSoft: "#341013",
  card: "#1f1516",
  cardSoft: "#2a1d1f",
  border: "#3c2629",
  borderActive: "#ff434d",
  text: "#fff7f7",
  muted: "#b8a7aa",
  green: "#ff353f",
  green2: "#ff4a5a",
  danger: "#ff4147",
  warning: "#f0a020",
  success: "#22c55e",
  onAccent: "#fff7f7",
};

const roleLabels: Record<AppRole, string> = {
  CUSTOMER: "Cliente",
  COURIER: "Entregador",
  ADMIN: "Admin",
  DEVELOPER: "Dev",
};

const statusLabels: Record<OrderStatus, string> = {
  PLACED: "Pedido realizado",
  PROCESSING: "Em processamento",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  STOCK_ISSUE: "Ajuste de estoque",
};

const statusTone: Partial<Record<OrderStatus, "success" | "warning" | "danger">> = {
  PROCESSING: "warning",
  OUT_FOR_DELIVERY: "danger",
  DELIVERED: "success",
  CANCELLED: "danger",
  STOCK_ISSUE: "danger",
};

const categoryIcons: Record<string, string> = {
  hortifruti: "broccoli",
  frutas: "food-apple-outline",
  bebidas: "bottle-soda-outline",
  mercearia: "basket-outline",
  padaria: "bread-slice-outline",
  frios: "cheese",
  limpeza: "spray-bottle",
};

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function getDiscountPercent(product: ProductSummary) {
  if (!product.discountInCents || product.priceInCents <= 0) {
    return 0;
  }

  return Math.round((product.discountInCents / product.priceInCents) * 100);
}

function getProductImage(product?: ProductSummary) {
  return product?.imageUrl ?? "https://images.unsplash.com/photo-1542838132-92c53300491e";
}

function getEffectivePrice(product: ProductSummary) {
  return product.priceInCents - product.discountInCents;
}

function Logo() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.logoMark}>
        <MaterialCommunityIcons name="leaf" size={28} color={palette.onAccent} />
      </View>
      <Text style={styles.logoText}>verdejá</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon = "arrow-right",
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      mode="contained"
      loading={loading}
      disabled={disabled}
      contentStyle={styles.primaryButtonContent}
      labelStyle={styles.primaryButtonLabel}
      style={styles.primaryButton}
      buttonColor={palette.green}
      textColor={palette.onAccent}
      onPress={onPress}
      icon={({ color, size }) => <Feather name={icon} color={color} size={size} />}
    >
      {label}
    </Button>
  );
}

function AppInput({
  label,
  icon,
  value,
  placeholder,
  secureTextEntry,
  keyboardType,
  onChangeText,
}: {
  label: string;
  icon: FeatherName;
  value: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        mode="outlined"
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        left={<TextInput.Icon icon={() => <Feather name={icon} size={20} color={palette.muted} />} />}
        outlineColor={palette.border}
        activeOutlineColor={palette.green}
        textColor={palette.text}
        style={styles.textInput}
        theme={{ roundness: 16 }}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function FeedbackBar() {
  const errorMessage = useAppStore((state) => state.errorMessage);
  const statusMessage = useAppStore((state) => state.statusMessage);
  const clearFeedback = useAppStore((state) => state.clearFeedback);

  if (!errorMessage && !statusMessage) {
    return null;
  }

  return (
    <View style={styles.feedbackWrap}>
      <Chip
        icon={errorMessage ? "alert-circle" : "check"}
        onClose={clearFeedback}
        textStyle={styles.feedbackText}
        style={[styles.feedback, errorMessage ? styles.feedbackError : styles.feedbackSuccess]}
      >
        {errorMessage ?? statusMessage}
      </Chip>
    </View>
  );
}

function LandingScreen({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.publicContent}>
      <View style={styles.landingTop}>
        <Logo />
        <Pressable onPress={onLogin}>
          <Text style={styles.loginLink}>Entrar</Text>
        </Pressable>
      </View>

      <Chip compact textStyle={styles.badgeText} style={styles.badge}>
        Mercado fresquinho em casa
      </Chip>

      <Text style={styles.heroTitle}>
        Seu mercado{"\n"}em <Text style={styles.heroTitleAccent}>minutos.</Text>
      </Text>
      <Text style={styles.heroSubtitle}>
        Hortifruti, padaria, carnes e mais, entregues à sua porta ou prontos
        para retirada.
      </Text>

      <View style={styles.featureList}>
        <Feature icon="truck" label="Entrega em até 40 min" />
        <Feature icon="clock" label="Status do pedido em tempo real" />
        <Feature icon="shield" label="Pagamento seguro: Pix, cartão ou dinheiro" />
      </View>

      <View style={styles.publicActions}>
        <PrimaryButton label="Começar agora" onPress={onRegister} />
        <Button
          mode="contained-tonal"
          textColor={palette.text}
          buttonColor={palette.cardSoft}
          contentStyle={styles.secondaryButtonContent}
          style={styles.secondaryButton}
          onPress={onLogin}
        >
          Já tenho conta
        </Button>
      </View>
    </ScrollView>
  );
}

function Feature({ icon, label }: { icon: FeatherName; label: string }) {
  return (
    <View style={styles.featureCard}>
      <Feather name={icon} size={22} color={palette.green} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

function AuthScreen({
  mode,
  onModeChange,
}: {
  mode: "login" | "register";
  onModeChange: (mode: PublicScreen) => void;
}) {
  const signIn = useAppStore((state) => state.signIn);
  const signUp = useAppStore((state) => state.signUp);
  const isLoading = useAppStore((state) => state.isLoading);
  const setActiveRole = useAppStore((state) => state.setActiveRole);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    cpf: "",
    phone: "",
  });

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    if (mode === "login") {
      void signIn(form);
      return;
    }

    void signUp(form);
  };

  return (
    <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.backButton} onPress={() => onModeChange("landing")}>
        <Feather name="arrow-left" size={22} color={palette.text} />
      </Pressable>
      <Logo />
      <Text style={styles.authTitle}>
        {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
      </Text>
      <Text style={styles.authSubtitle}>
        {mode === "login" ? "Entre para continuar suas compras" : "Leva menos de um minuto"}
      </Text>

      <View style={styles.authForm}>
        {mode === "register" ? (
          <>
            <AppInput
              label="Nome completo"
              icon="user"
              value={form.fullName}
              placeholder="Maria Silva"
              onChangeText={(value) => updateForm("fullName", value)}
            />
            <AppInput
              label="CPF"
              icon="credit-card"
              value={form.cpf}
              placeholder="000.000.000-00"
              keyboardType="number-pad"
              onChangeText={(value) => updateForm("cpf", value)}
            />
            <Text style={styles.inputHint}>Os 4 últimos dígitos serão seu código de entrega</Text>
          </>
        ) : null}

        <AppInput
          label="Email"
          icon="mail"
          value={form.email}
          placeholder="voce@email.com"
          keyboardType="email-address"
          onChangeText={(value) => updateForm("email", value)}
        />
        <AppInput
          label="Senha"
          icon="lock"
          value={form.password}
          placeholder={mode === "login" ? "••••••••" : "mínimo 8 caracteres"}
          secureTextEntry
          onChangeText={(value) => updateForm("password", value)}
        />
        {mode === "register" ? (
          <AppInput
            label="Telefone"
            icon="phone"
            value={form.phone}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            onChangeText={(value) => updateForm("phone", value)}
          />
        ) : (
          <Pressable style={styles.forgotPassword}>
            <Text style={styles.greenText}>Esqueci minha senha</Text>
          </Pressable>
        )}
      </View>

      <PrimaryButton
        label={mode === "login" ? "Entrar" : "Criar conta"}
        loading={isLoading}
        disabled={isLoading}
        onPress={submit}
      />

      {mode === "login" ? (
        <>
          <View style={styles.demoRoles}>
            {(["CUSTOMER", "COURIER", "ADMIN"] as AppRole[]).map((role) => (
              <Pressable
                key={role}
                style={styles.demoRoleButton}
                onPress={() => setActiveRole(role)}
              >
                <Text style={styles.demoRoleText}>{roleLabels[role]}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.demoText}>demo: acesse direto cada perfil após login</Text>
        </>
      ) : null}

      <Pressable
        style={styles.authSwitch}
        onPress={() => onModeChange(mode === "login" ? "register" : "login")}
      >
        <Text style={styles.authSwitchText}>
          {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
          <Text style={styles.greenText}>{mode === "login" ? "Cadastre-se" : "Entrar"}</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function HomeScreen({
  onCart,
  onProduct,
}: {
  onCart: () => void;
  onProduct: (productId: string) => void;
}) {
  const products = useAppStore((state) => state.products);
  const cart = useAppStore((state) => state.cart);
  const isLoading = useAppStore((state) => state.isLoading);
  const addToCart = useAppStore((state) => state.addToCart);
  const [selectedCategory, setSelectedCategory] = useState("Tudo");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.categoryName)));
    return ["Tudo", ...unique];
  }, [products]);

  const filteredProducts =
    selectedCategory === "Tudo"
      ? products
      : products.filter((product) => product.categoryName === selectedCategory);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.mutedSmall}>Entregar em</Text>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={18} color={palette.green} />
            <Text style={styles.addressText}>Rua das Flores, 120</Text>
          </View>
        </View>
        <Pressable style={styles.notificationButton}>
          <Feather name="bell" size={22} color={palette.text} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={23} color={palette.muted} />
        <Text style={styles.searchText}>Buscar produtos...</Text>
      </View>

      <View style={styles.promoCard}>
        <View>
          <Text style={styles.promoKicker}>HOJE</Text>
          <Text style={styles.promoTitle}>20% off em hortifruti</Text>
          <Text style={styles.promoSubtitle}>Use o código FRESCO20</Text>
        </View>
        <MaterialCommunityIcons name="leaf-maple" size={78} color="rgba(136,24,32,0.18)" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        {categories.map((category) => {
          const normalized = category.toLowerCase();
          const iconName = categoryIcons[normalized] ?? "cart-outline";
          const selected = category === selectedCategory;

          return (
            <Pressable
              key={category}
              style={[styles.categoryPill, selected && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <MaterialCommunityIcons
                name={iconName as keyof typeof MaterialCommunityIcons.glyphMap}
                size={18}
                color={selected ? palette.onAccent : palette.muted}
              />
              <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Para você</Text>
        <Text style={styles.mutedText}>{filteredProducts.length} itens</Text>
      </View>

      <View style={styles.productGrid}>
        {filteredProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            loading={isLoading}
            onOpen={() => onProduct(product.id)}
            onAdd={() => void addToCart(product)}
          />
        ))}
      </View>

      {cart.length > 0 ? (
        <Pressable style={styles.floatingCart} onPress={onCart}>
          <Feather name="shopping-bag" size={20} color={palette.onAccent} />
          <Text style={styles.floatingCartText}>{cart.length} item(ns) no carrinho</Text>
          <Feather name="arrow-right" size={18} color={palette.onAccent} />
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function ProductCard({
  product,
  index,
  loading,
  onOpen,
  onAdd,
}: {
  product: ProductSummary;
  index: number;
  loading: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const discount = getDiscountPercent(product);

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(280)} style={styles.productCardWrap}>
      <Pressable style={styles.productCard} onPress={onOpen}>
        <Image source={{ uri: getProductImage(product) }} style={styles.productImage} />
        {discount > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        ) : null}
        {!product.isAvailable ? (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>Esgotado</Text>
          </View>
        ) : null}
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.discountInCents > 0 ? (
          <Text style={styles.oldPrice}>{formatCurrency(product.priceInCents)}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>
            {formatCurrency(getEffectivePrice(product))}
          </Text>
          <Text style={styles.unitText}>/un</Text>
          <Pressable
            disabled={!product.isAvailable || loading}
            style={[styles.addButton, !product.isAvailable && styles.addButtonDisabled]}
            onPress={onAdd}
          >
            <Feather name="plus" size={25} color={palette.onAccent} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function CartScreen({ onCheckout }: { onCheckout: () => void }) {
  const cart = useAppStore((state) => state.cart);
  const products = useAppStore((state) => state.products);
  const addToCart = useAppStore((state) => state.addToCart);
  const decrementCartItem = useAppStore((state) => state.decrementCartItem);
  const removeCartItem = useAppStore((state) => state.removeCartItem);
  const isLoading = useAppStore((state) => state.isLoading);
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const deliveryFee = cart.length > 0 ? 690 : 0;
  const total = subtotal + deliveryFee;

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Carrinho</Text>
      <Text style={styles.mutedText}>{cart.length} itens</Text>

      <View style={styles.cartList}>
        {cart.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);

          return (
            <View key={item.productId} style={styles.cartItem}>
              <Image source={{ uri: getProductImage(product) }} style={styles.cartImage} />
              <View style={styles.cartInfo}>
                <Text style={styles.cartName}>{item.name}</Text>
                <Text style={styles.cartPrice}>{formatCurrency(item.unitPrice)} / un</Text>
                <View style={styles.quantityRow}>
                  <Pressable
                    style={styles.quantityButton}
                    disabled={isLoading}
                    onPress={() => void decrementCartItem(item.productId)}
                  >
                    <Feather name="minus" size={18} color={palette.muted} />
                  </Pressable>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <Pressable
                    style={styles.quantityButton}
                    disabled={!product || isLoading}
                    onPress={() => product && void addToCart(product)}
                  >
                    <Feather name="plus" size={18} color={palette.text} />
                  </Pressable>
                </View>
              </View>
              <Pressable
                style={styles.cartTrashButton}
                disabled={isLoading}
                onPress={() => void removeCartItem(item.productId)}
              >
                <Feather name="trash-2" size={20} color={palette.muted} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="shopping-bag" size={32} color={palette.green} />
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptyText}>Adicione produtos da vitrine para finalizar um pedido.</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
            <SummaryRow label="Entrega" value={formatCurrency(deliveryFee)} />
            <View style={styles.summaryDivider} />
            <SummaryRow label="Total" value={formatCurrency(total)} large />
          </View>
          <PrimaryButton
            label="Finalizar pedido"
            loading={isLoading}
            disabled={isLoading}
            onPress={onCheckout}
          />
        </>
      )}
    </ScrollView>
  );
}

function ProductDetailScreen({
  product,
  onBack,
}: {
  product: ProductSummary;
  onBack: () => void;
}) {
  const addToCart = useAppStore((state) => state.addToCart);
  const isLoading = useAppStore((state) => state.isLoading);
  const [quantity, setQuantity] = useState(product.isAvailable ? 1 : 0);
  const price = getEffectivePrice(product);
  const unit = product.categoryName.toLowerCase().includes("fruta") ? "kg" : "un";

  const handleAdd = async () => {
    for (let index = 0; index < quantity; index += 1) {
      await addToCart(product);
    }
  };

  return (
    <View style={styles.productDetailRoot}>
      <ScrollView contentContainerStyle={styles.productDetailContent}>
        <View style={styles.productHero}>
          <Image source={{ uri: getProductImage(product) }} style={styles.productHeroImage} />
          <Pressable style={styles.detailBackButton} onPress={onBack}>
            <Feather name="arrow-left" size={22} color={palette.text} />
          </Pressable>
        </View>

        <View style={styles.productDetailSheet}>
          <Text style={styles.detailCategory}>{product.categoryName.toUpperCase()}</Text>
          <Text style={styles.detailTitle}>{product.name}</Text>
          <View style={styles.detailPriceRow}>
            <Text style={styles.detailPrice}>{formatCurrency(price)}</Text>
            <Text style={styles.detailUnit}>/ {unit}</Text>
          </View>

          <Text style={styles.detailSectionTitle}>Descricao</Text>
          <Text style={styles.detailDescription}>
            {product.description || "Produto fresco selecionado pelo produtor local."}
          </Text>

          <View style={styles.stockCard}>
            <Text style={styles.stockLabel}>
              {product.isAvailable ? "Disponivel em estoque" : "Produto indisponivel"}
            </Text>
            <Text style={styles.stockValue}>{product.availableQuantity} {unit}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.productDetailFooter}>
        <View style={styles.detailQuantityControl}>
          <Pressable
            style={styles.detailQuantityButton}
            disabled={quantity <= 1}
            onPress={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            <Feather name="minus" size={20} color={palette.text} />
          </Pressable>
          <Text style={styles.detailQuantityText}>{quantity}</Text>
          <Pressable
            style={styles.detailQuantityButton}
            disabled={!product.isAvailable || quantity >= product.availableQuantity}
            onPress={() => setQuantity((current) => Math.min(product.availableQuantity, current + 1))}
          >
            <Feather name="plus" size={20} color={palette.text} />
          </Pressable>
        </View>
        <Button
          mode="contained"
          loading={isLoading}
          disabled={isLoading || !product.isAvailable}
          buttonColor={palette.green}
          textColor={palette.onAccent}
          style={styles.detailAddButton}
          contentStyle={styles.detailAddButtonContent}
          labelStyle={styles.primaryButtonLabel}
          icon={({ color, size }) => <Feather name="shopping-bag" color={color} size={size} />}
          onPress={() => void handleAdd()}
        >
          Adicionar - {formatCurrency(price * quantity)}
        </Button>
      </View>
    </View>
  );
}

function CheckoutScreen({
  onBack,
  onCompleted,
}: {
  onBack: () => void;
  onCompleted: () => void;
}) {
  const cart = useAppStore((state) => state.cart);
  const checkout = useAppStore((state) => state.checkout);
  const isLoading = useAppStore((state) => state.isLoading);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const deliveryFee = deliveryMode === "DELIVERY" && cart.length > 0 ? 1200 : 0;
  const total = subtotal + deliveryFee;

  const handleConfirm = async () => {
    await checkout(deliveryMode, paymentMethod);

    if (cart.length > 0 && useAppStore.getState().cart.length === 0) {
      onCompleted();
    }
  };

  return (
    <View style={styles.checkoutRoot}>
      <ScrollView contentContainerStyle={styles.checkoutContent}>
        <View style={styles.checkoutHeader}>
          <Pressable style={styles.backCircle} onPress={onBack}>
            <Feather name="arrow-left" size={22} color={palette.text} />
          </Pressable>
          <Text style={styles.screenTitleCompact}>Finalizar</Text>
        </View>

        <Text style={styles.checkoutSectionLabel}>COMO RECEBER</Text>
        <View style={styles.deliveryOptions}>
          <CheckoutOption
            icon="home-outline"
            title="Entrega"
            subtitle="40-60 min"
            selected={deliveryMode === "DELIVERY"}
            onPress={() => setDeliveryMode("DELIVERY")}
          />
          <CheckoutOption
            icon="storefront-outline"
            title="Retirar"
            subtitle="Em 20 min"
            selected={deliveryMode === "PICKUP"}
            onPress={() => setDeliveryMode("PICKUP")}
          />
        </View>

        <Text style={styles.checkoutSectionLabel}>ENDERECO</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressCardTitle}>Casa</Text>
          <Text style={styles.addressCardText}>Rua das Flores, 120 - Apto 42</Text>
        </View>

        <Text style={styles.checkoutSectionLabel}>PAGAMENTO</Text>
        <View style={styles.paymentList}>
          <PaymentOption
            icon="qrcode"
            title="Pix"
            subtitle="Aprovacao instantanea via Abacate Pay"
            selected={paymentMethod === "PIX"}
            onPress={() => setPaymentMethod("PIX")}
          />
          <PaymentOption
            icon="credit-card-fast-outline"
            title="Cartao online"
            subtitle="Pague agora com Abacate Pay"
            selected={paymentMethod === "CARD_ONLINE"}
            onPress={() => setPaymentMethod("CARD_ONLINE")}
          />
          <PaymentOption
            icon="credit-card-outline"
            title="Cartao na entrega"
            subtitle="Credito ou debito"
            selected={paymentMethod === "CARD_ON_DELIVERY"}
            onPress={() => setPaymentMethod("CARD_ON_DELIVERY")}
          />
          <PaymentOption
            icon="cash"
            title="Dinheiro na entrega"
            subtitle="Informe valor para troco"
            selected={paymentMethod === "CASH"}
            onPress={() => setPaymentMethod("CASH")}
          />
        </View>
      </ScrollView>

      <View style={styles.checkoutFooter}>
        <View>
          <Text style={styles.checkoutTotalLabel}>Total</Text>
          <Text style={styles.checkoutTotal}>{formatCurrency(total)}</Text>
        </View>
        <Button
          mode="contained"
          loading={isLoading}
          disabled={isLoading || cart.length === 0}
          buttonColor={palette.green}
          textColor={palette.onAccent}
          style={styles.checkoutButton}
          contentStyle={styles.checkoutButtonContent}
          labelStyle={styles.primaryButtonLabel}
          onPress={() => void handleConfirm()}
        >
          Confirmar pedido
        </Button>
      </View>
    </View>
  );
}

function CheckoutOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.checkoutOption, selected && styles.checkoutOptionActive]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={25} color={selected ? palette.green : palette.muted} />
      <Text style={styles.checkoutOptionTitle}>{title}</Text>
      <Text style={styles.checkoutOptionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function PaymentOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: MaterialIconName;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.paymentOption, selected && styles.paymentOptionActive]} onPress={onPress}>
      <View style={[styles.paymentIcon, selected && styles.paymentIconActive]}>
        <MaterialCommunityIcons name={icon} size={24} color={selected ? palette.onAccent : palette.muted} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.paymentTitle}>{title}</Text>
        <Text style={styles.paymentSubtitle}>{subtitle}</Text>
      </View>
      {selected ? <Feather name="check" size={23} color={palette.green} /> : null}
    </Pressable>
  );
}

function SummaryRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, large && styles.summaryLarge]}>{label}</Text>
      <Text style={[styles.summaryValue, large && styles.summaryLargeValue]}>{value}</Text>
    </View>
  );
}

function OrdersScreen({ onTrack }: { onTrack: () => void }) {
  const orders = useAppStore((state) => state.orders);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Meus pedidos</Text>
      {orders.map((order, index) => (
        <Pressable key={order.id} style={styles.orderCard} onPress={onTrack}>
          <View>
            <Text style={styles.orderMeta}>#{order.id.replace("PED-", "")} · há {index === 0 ? "12 min" : "25 min"}</Text>
            <Text style={styles.orderItems}>{index + 1} item{index === 0 ? "s" : ""}</Text>
            <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Feather name="chevron-right" size={24} color={palette.muted} />
        </Pressable>
      ))}
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="list" size={32} color={palette.green} />
          <Text style={styles.emptyTitle}>Nenhum pedido ainda</Text>
          <Text style={styles.emptyText}>Quando você finalizar uma compra, ela aparecerá aqui.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = statusTone[status] ?? "warning";

  return (
    <View style={[styles.statusBadge, styles[`statusBadge_${tone}`]]}>
      <Text style={[styles.statusBadgeText, styles[`statusBadgeText_${tone}`]]}>
        {statusLabels[status]}
      </Text>
    </View>
  );
}

function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const signOut = useAppStore((state) => state.signOut);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Perfil</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.fullName?.charAt(0).toUpperCase() ?? "V"}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{profile?.fullName ?? "Cliente Verdejá"}</Text>
          <Text style={styles.profileEmail}>{profile?.email ?? "cliente@email.com"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile ? roleLabels[profile.role] : "Cliente"}</Text>
          </View>
        </View>
      </View>

      <ProfileAction icon="map-pin" label="Endereços" active />
      <ProfileAction icon="credit-card" label="Pagamentos" />
      <ProfileAction icon="bell" label="Notificações" />
      <ProfileAction icon="help-circle" label="Ajuda" />
      <Pressable style={[styles.profileAction, styles.logoutAction]} onPress={() => void signOut()}>
        <View style={[styles.profileActionIcon, styles.logoutIcon]}>
          <Feather name="log-out" size={22} color={palette.danger} />
        </View>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

function ProfileAction({ icon, label, active }: { icon: FeatherName; label: string; active?: boolean }) {
  return (
    <View style={[styles.profileAction, active && styles.profileActionActive]}>
      <View style={styles.profileActionIcon}>
        <Feather name={icon} size={22} color={palette.muted} />
      </View>
      <Text style={styles.profileActionText}>{label}</Text>
      <Feather name="chevron-right" size={22} color={palette.muted} />
    </View>
  );
}

function TrackScreen({ onBack }: { onBack: () => void }) {
  const orders = useAppStore((state) => state.orders);
  const order = orders[0];
  const code = order?.confirmationCode ?? "4821";

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.trackHeader}>
        <Pressable style={styles.backCircle} onPress={onBack}>
          <Feather name="arrow-left" size={22} color={palette.text} />
        </Pressable>
        <View>
          <Text style={styles.mutedText}>Pedido {order?.id ?? "#1042"}</Text>
          <Text style={styles.screenTitleCompact}>Acompanhar</Text>
        </View>
      </View>

      <View style={styles.deliveryCodeCard}>
        <Text style={styles.deliveryCodeLabel}>SEU CÓDIGO DE ENTREGA</Text>
        <Text style={styles.deliveryCode}>{code.split("").join(" ")}</Text>
        <Text style={styles.deliveryCodeHint}>Informe ao entregador na chegada</Text>
      </View>

      <View style={styles.courierCard}>
        <View style={styles.courierAvatar}>
          <Text style={styles.courierEmoji}>🧑‍🌾</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.courierName}>João Pereira</Text>
          <Text style={styles.profileEmail}>★ 4.9 · Entregador</Text>
        </View>
        <Pressable style={styles.contactButton}>
        <Feather name="phone" size={20} color={palette.onAccent} />
        </Pressable>
        <Pressable style={styles.chatButton}>
          <Feather name="message-circle" size={20} color={palette.text} />
        </Pressable>
      </View>

      <Text style={styles.trackTitle}>Status em tempo real</Text>
      <View style={styles.timeline}>
        <TimelineItem icon="check" label="Pedido realizado" time="14:02" done />
        <TimelineItem icon="box" label="Em processamento" time="14:08" done />
        <TimelineItem icon="truck" label="Saiu para entrega" time="14:24" done active />
        <TimelineItem icon="home" label="Entregue" time="—" />
      </View>
    </ScrollView>
  );
}

function TimelineItem({
  icon,
  label,
  time,
  done,
  active,
}: {
  icon: FeatherName;
  label: string;
  time: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineIcon, done && styles.timelineIconDone, active && styles.timelineIconActive]}>
        <Feather name={icon} size={20} color={done ? palette.onAccent : palette.muted} />
      </View>
      <View>
        <Text style={[styles.timelineLabel, !done && styles.timelineLabelMuted]}>{label}</Text>
        <Text style={styles.timelineTime}>{time}</Text>
      </View>
    </View>
  );
}

function BottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  const tabs: Array<{ key: AppTab; label: string; icon: FeatherName }> = [
    { key: "home", label: "Início", icon: "home" },
    { key: "cart", label: "Carrinho", icon: "shopping-bag" },
    { key: "orders", label: "Pedidos", icon: "list" },
    { key: "profile", label: "Perfil", icon: "user" },
  ];

  return (
    <View style={styles.bottomTabs}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <Pressable key={tab.key} style={styles.tabButton} onPress={() => onChange(tab.key)}>
            <Feather name={tab.icon} size={23} color={active ? palette.green : palette.muted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppNavigator() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const activeRole = useAppStore((state) => state.activeRole);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const refreshCatalog = useAppStore((state) => state.refreshCatalog);
  const refreshCart = useAppStore((state) => state.refreshCart);
  const refreshOrders = useAppStore((state) => state.refreshOrders);
  const [publicScreen, setPublicScreen] = useState<PublicScreen>("landing");
  const [activeTab, setActiveTab] = useState<AppTab>("home");
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
    void refreshCatalog();
    void refreshCart();
    void refreshOrders();
  }, [refreshCatalog, refreshCart, refreshOrders]);

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
            onModeChange={setPublicScreen}
          />
        )}
      </SafeAreaView>
    );
  }

  const shouldShowCustomerTabs = activeRole === "CUSTOMER";
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const isNestedScreen = tracking || checkoutOpen || Boolean(selectedProduct);
  const handleTabChange = (tab: AppTab) => {
    setTracking(false);
    setCheckoutOpen(false);
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
      ) : (
        <ProfileScreen />
      )}
      {shouldShowCustomerTabs && !isNestedScreen ? (
        <BottomTabs activeTab={activeTab} onChange={handleTabChange} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: palette.background,
  },
  publicContent: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: palette.backgroundSoft,
  },
  landingTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  logoText: {
    color: palette.text,
    fontSize: 27,
    letterSpacing: -1,
  },
  loginLink: {
    color: palette.muted,
    fontSize: 16,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,53,63,0.12)",
    borderColor: "rgba(255,53,63,0.26)",
    borderWidth: 1,
    marginTop: 4,
  },
  badgeText: {
    color: palette.green,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 56,
    letterSpacing: -2.4,
    lineHeight: 68,
    marginTop: 28,
  },
  heroTitleAccent: {
    color: palette.green2,
  },
  heroSubtitle: {
    color: palette.muted,
    fontSize: 22,
    lineHeight: 34,
    marginTop: 24,
  },
  featureList: {
    gap: 14,
    marginTop: 42,
  },
  featureCard: {
    alignItems: "center",
    backgroundColor: "rgba(26,15,16,0.84)",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 66,
    paddingHorizontal: 20,
  },
  featureText: {
    color: palette.text,
    flex: 1,
    fontSize: 17,
  },
  publicActions: {
    gap: 16,
    marginTop: 34,
  },
  primaryButton: {
    borderRadius: 13,
  },
  primaryButtonContent: {
    flexDirection: "row-reverse",
    height: 58,
  },
  primaryButtonLabel: {
    color: palette.onAccent,
    fontSize: 17,
  },
  secondaryButton: {
    borderRadius: 13,
  },
  secondaryButtonContent: {
    height: 58,
  },
  authContent: {
    flexGrow: 1,
    paddingBottom: 34,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: palette.backgroundSoft,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(31,21,22,0.84)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginBottom: 20,
    width: 48,
  },
  authTitle: {
    color: palette.text,
    fontSize: 42,
    letterSpacing: -1.7,
    marginTop: 22,
  },
  authSubtitle: {
    color: palette.muted,
    fontSize: 20,
    marginTop: 12,
  },
  authForm: {
    gap: 18,
    marginTop: 34,
    marginBottom: 28,
  },
  inputBlock: {
    gap: 10,
  },
  inputLabel: {
    color: palette.text,
    fontSize: 16,
  },
  textInput: {
    backgroundColor: palette.card,
    minHeight: 58,
  },
  inputHint: {
    color: palette.muted,
    fontSize: 14,
    marginTop: -10,
  },
  forgotPassword: {
    alignItems: "flex-end",
  },
  greenText: {
    color: palette.green,
  },
  demoRoles: {
    flexDirection: "row",
    gap: 10,
    marginTop: 30,
  },
  demoRoleButton: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 18,
    flex: 1,
    paddingVertical: 13,
  },
  demoRoleText: {
    color: palette.text,
  },
  demoText: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 18,
    textAlign: "center",
  },
  authSwitch: {
    alignItems: "center",
    marginTop: 28,
  },
  authSwitchText: {
    color: palette.muted,
    fontSize: 16,
  },
  feedbackWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    zIndex: 20,
  },
  feedback: {
    borderRadius: 16,
  },
  feedbackError: {
    backgroundColor: "#44181d",
  },
  feedbackSuccess: {
    backgroundColor: "#173823",
  },
  feedbackText: {
    color: palette.text,
  },
  screenContent: {
    flexGrow: 1,
    paddingBottom: 118,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  homeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mutedSmall: {
    color: palette.muted,
    fontSize: 14,
  },
  addressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 4,
  },
  addressText: {
    color: palette.text,
    fontSize: 18,
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  notificationDot: {
    backgroundColor: palette.green,
    borderRadius: 7,
    height: 14,
    position: "absolute",
    right: 8,
    top: 8,
    width: 14,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 18,
    flexDirection: "row",
    gap: 14,
    height: 58,
    marginTop: 28,
    paddingHorizontal: 18,
  },
  searchText: {
    color: palette.muted,
    fontSize: 21,
  },
  promoCard: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    overflow: "hidden",
    padding: 26,
  },
  promoKicker: {
    color: palette.onAccent,
    fontSize: 13,
    letterSpacing: 2,
  },
  promoTitle: {
    color: palette.onAccent,
    fontSize: 28,
    marginTop: 8,
  },
  promoSubtitle: {
    color: "#ffd6da",
    fontSize: 18,
    marginTop: 8,
  },
  categoryList: {
    gap: 12,
    marginTop: 30,
    paddingRight: 20,
  },
  categoryPill: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  categoryPillActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  categoryText: {
    color: palette.muted,
    fontSize: 16,
  },
  categoryTextActive: {
    color: palette.onAccent,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 36,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 24,
    letterSpacing: -0.7,
  },
  mutedText: {
    color: palette.muted,
    fontSize: 15,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 16,
  },
  productCardWrap: {
    width: "48%",
  },
  productCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    width: "100%",
  },
  productImage: {
    backgroundColor: palette.cardSoft,
    borderRadius: 14,
    height: 148,
    width: "100%",
  },
  discountBadge: {
    backgroundColor: palette.green,
    borderRadius: 13,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    top: 12,
  },
  discountText: {
    color: palette.onAccent,
    fontSize: 12,
  },
  soldOutBadge: {
    backgroundColor: palette.danger,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 12,
    top: 12,
  },
  soldOutText: {
    color: palette.text,
    fontSize: 12,
  },
  productName: {
    color: palette.text,
    fontSize: 18,
    marginTop: 14,
    minHeight: 44,
  },
  oldPrice: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 8,
    textDecorationLine: "line-through",
  },
  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  productPrice: {
    color: palette.green,
    fontSize: 18,
  },
  unitText: {
    color: palette.muted,
    flex: 1,
    fontSize: 12,
    marginLeft: 3,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  addButtonDisabled: {
    backgroundColor: "rgba(255,53,63,0.12)",
  },
  floatingCart: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 18,
    bottom: 92,
    flexDirection: "row",
    gap: 10,
    left: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    position: "absolute",
    right: 20,
  },
  floatingCartText: {
    color: palette.onAccent,
    flex: 1,
  },
  screenTitle: {
    color: palette.text,
    fontSize: 36,
    letterSpacing: -1,
  },
  screenTitleCompact: {
    color: palette.text,
    fontSize: 24,
  },
  cartList: {
    gap: 16,
    marginTop: 20,
  },
  cartItem: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 15,
    padding: 14,
  },
  cartImage: {
    borderRadius: 12,
    height: 96,
    width: 96,
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    color: palette.text,
    fontSize: 18,
  },
  cartPrice: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 4,
  },
  quantityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginTop: 13,
  },
  quantityButton: {
    alignItems: "center",
    backgroundColor: "#160f10",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  quantityText: {
    color: palette.text,
    fontSize: 18,
  },
  cartTrashButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  summaryCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 18,
    marginTop: 28,
    padding: 20,
  },
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 17,
  },
  summaryValue: {
    color: palette.text,
    fontSize: 17,
  },
  summaryDivider: {
    backgroundColor: palette.border,
    height: 1,
  },
  summaryLarge: {
    color: palette.text,
    fontSize: 23,
  },
  summaryLargeValue: {
    color: palette.green,
    fontSize: 23,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: 28,
    padding: 28,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 19,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    textAlign: "center",
  },
  productDetailRoot: {
    flex: 1,
    backgroundColor: palette.background,
  },
  productDetailContent: {
    flexGrow: 1,
    paddingBottom: 116,
  },
  productHero: {
    backgroundColor: palette.backgroundSoft,
    height: 268,
  },
  productHeroImage: {
    height: "100%",
    width: "100%",
  },
  detailBackButton: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    left: 20,
    position: "absolute",
    top: 18,
    width: 48,
  },
  productDetailSheet: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 22,
    paddingTop: 36,
  },
  detailCategory: {
    color: palette.green,
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailTitle: {
    color: palette.text,
    fontSize: 36,
    letterSpacing: -1,
  },
  detailPriceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  detailPrice: {
    color: palette.green,
    fontSize: 34,
    letterSpacing: -0.8,
  },
  detailUnit: {
    color: palette.muted,
    fontSize: 18,
    marginBottom: 5,
  },
  detailSectionTitle: {
    color: palette.text,
    fontSize: 20,
    marginTop: 34,
  },
  detailDescription: {
    color: palette.muted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 14,
  },
  stockCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    padding: 20,
  },
  stockLabel: {
    color: palette.muted,
    fontSize: 16,
  },
  stockValue: {
    color: palette.green,
    fontSize: 16,
  },
  productDetailFooter: {
    alignItems: "center",
    backgroundColor: "rgba(20,12,15,0.96)",
    borderTopColor: palette.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 14,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 16,
    position: "absolute",
    right: 0,
  },
  detailQuantityControl: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 24,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-between",
    paddingHorizontal: 8,
    width: 168,
  },
  detailQuantityButton: {
    alignItems: "center",
    backgroundColor: "#160f10",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  detailQuantityText: {
    color: palette.text,
    fontSize: 20,
  },
  detailAddButton: {
    borderRadius: 16,
    flex: 1,
  },
  detailAddButtonContent: {
    height: 58,
  },
  checkoutRoot: {
    flex: 1,
    backgroundColor: palette.backgroundSoft,
  },
  checkoutContent: {
    flexGrow: 1,
    paddingBottom: 122,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  checkoutHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 28,
  },
  checkoutSectionLabel: {
    color: palette.muted,
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: 16,
    marginTop: 8,
  },
  deliveryOptions: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 30,
  },
  checkoutOption: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    minHeight: 122,
    padding: 20,
  },
  checkoutOptionActive: {
    backgroundColor: "rgba(255,53,63,0.12)",
    borderColor: palette.green,
  },
  checkoutOptionTitle: {
    color: palette.text,
    fontSize: 21,
    marginTop: 18,
  },
  checkoutOptionSubtitle: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 4,
  },
  addressCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 30,
    padding: 20,
  },
  addressCardTitle: {
    color: palette.text,
    fontSize: 20,
  },
  addressCardText: {
    color: palette.muted,
    fontSize: 17,
    marginTop: 6,
  },
  paymentList: {
    gap: 12,
  },
  paymentOption: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 88,
    padding: 18,
  },
  paymentOptionActive: {
    backgroundColor: "rgba(255,53,63,0.12)",
    borderColor: palette.green,
  },
  paymentIcon: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  paymentIconActive: {
    backgroundColor: palette.green,
  },
  paymentTitle: {
    color: palette.text,
    fontSize: 20,
  },
  paymentSubtitle: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 4,
  },
  checkoutFooter: {
    alignItems: "center",
    backgroundColor: "rgba(20,12,15,0.96)",
    borderTopColor: palette.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 16,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: "absolute",
    right: 0,
  },
  checkoutTotalLabel: {
    color: palette.muted,
    fontSize: 14,
  },
  checkoutTotal: {
    color: palette.green,
    fontSize: 23,
    marginTop: 4,
  },
  checkoutButton: {
    borderRadius: 14,
    flex: 1,
  },
  checkoutButtonContent: {
    height: 58,
  },
  orderCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    minHeight: 170,
    padding: 20,
  },
  orderMeta: {
    color: palette.muted,
    fontSize: 15,
  },
  orderItems: {
    color: palette.text,
    fontSize: 22,
    marginTop: 10,
  },
  orderTotal: {
    color: palette.green,
    fontSize: 18,
    marginTop: 13,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 18,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusBadge_success: {
    backgroundColor: "#153824",
  },
  statusBadge_warning: {
    backgroundColor: "#3f2d0a",
  },
  statusBadge_danger: {
    backgroundColor: "#421719",
  },
  statusBadgeText: {
    fontSize: 13,
  },
  statusBadgeText_success: {
    color: palette.success,
  },
  statusBadgeText_warning: {
    color: palette.warning,
  },
  statusBadgeText_danger: {
    color: palette.danger,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 22,
    marginTop: 22,
    padding: 24,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarText: {
    color: palette.onAccent,
    fontSize: 26,
  },
  profileName: {
    color: palette.text,
    fontSize: 21,
  },
  profileEmail: {
    color: palette.muted,
    fontSize: 15,
    marginTop: 5,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#4a1c20",
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: palette.green,
    fontSize: 12,
  },
  profileAction: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 18,
    marginTop: 12,
    minHeight: 86,
    paddingHorizontal: 18,
  },
  profileActionActive: {
    borderColor: palette.green,
  },
  profileActionIcon: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  profileActionText: {
    color: palette.text,
    flex: 1,
    fontSize: 20,
  },
  logoutAction: {
    borderColor: palette.border,
  },
  logoutIcon: {
    backgroundColor: "#3b191c",
  },
  logoutText: {
    color: palette.danger,
    flex: 1,
    fontSize: 20,
  },
  trackHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
  },
  backCircle: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  deliveryCodeCard: {
    alignItems: "center",
    backgroundColor: palette.green2,
    borderRadius: 24,
    marginTop: 28,
    padding: 28,
  },
  deliveryCodeLabel: {
    color: "#ffe6e8",
    fontSize: 13,
    letterSpacing: 3,
  },
  deliveryCode: {
    color: palette.onAccent,
    fontSize: 70,
    letterSpacing: 12,
    marginTop: 8,
  },
  deliveryCodeHint: {
    color: "#ffe6e8",
    fontSize: 16,
  },
  courierCard: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginTop: 30,
    padding: 22,
  },
  courierAvatar: {
    alignItems: "center",
    backgroundColor: "#4a1c20",
    borderRadius: 30,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  courierEmoji: {
    fontSize: 26,
  },
  courierName: {
    color: palette.text,
    fontSize: 20,
  },
  contactButton: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  chatButton: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  trackTitle: {
    color: palette.text,
    fontSize: 22,
    marginTop: 30,
  },
  timeline: {
    marginTop: 20,
  },
  timelineItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    marginBottom: 28,
  },
  timelineIcon: {
    alignItems: "center",
    backgroundColor: palette.cardSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  timelineIconDone: {
    backgroundColor: palette.green,
  },
  timelineIconActive: {
    borderColor: "#8f232b",
    borderWidth: 7,
  },
  timelineLabel: {
    color: palette.text,
    fontSize: 21,
  },
  timelineLabelMuted: {
    color: palette.muted,
  },
  timelineTime: {
    color: palette.muted,
    fontSize: 15,
    marginTop: 2,
  },
  bottomTabs: {
    alignItems: "center",
    backgroundColor: "rgba(30,20,20,0.98)",
    borderTopColor: palette.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    height: 78,
    justifyContent: "space-around",
    left: 0,
    position: "absolute",
    right: 0,
  },
  tabButton: {
    alignItems: "center",
    gap: 5,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 13,
  },
  tabLabelActive: {
    color: palette.green,
  },
  flex: {
    flex: 1,
  },
});


