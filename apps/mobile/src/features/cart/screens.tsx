import { Feather } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { palette } from "../../app-shell/constants";
import { formatCurrency, getProductImage } from "../../app-shell/helpers";
import { styles } from "../../app-shell/styles";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAppStore } from "../../state/app-store";

export function CartScreen({ onCheckout }: { onCheckout: () => void }) {
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

function SummaryRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, large && styles.summaryLarge]}>{label}</Text>
      <Text style={[styles.summaryValue, large && styles.summaryLargeValue]}>{value}</Text>
    </View>
  );
}
