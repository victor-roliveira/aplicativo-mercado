import { useEffect, useState } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Button, Text } from "react-native-paper";
import type { DeliveryMode, OrderStatus, PaymentMethod } from "@mercado/shared/domain/models";
import {
  palette,
  statusLabels,
  statusTone,
  svgIcons,
  type FeatherName,
  type MaterialIconName,
  type SvgIconComponent,
} from "../../app-shell/constants";
import {
  formatAddressLine,
  formatAddressLocation,
  formatCurrency,
  formatOrderTime,
  getPrimaryAddress,
} from "../../app-shell/helpers";
import { styles } from "../../app-shell/styles";
import { AppSvgIcon } from "../../components/AppSvgIcon";
import { useAppStore } from "../../state/app-store";

export function CheckoutScreen({
  onBack,
  onCompleted,
}: {
  onBack: () => void;
  onCompleted: () => void;
}) {
  const addresses = useAppStore((state) => state.addresses);
  const cart = useAppStore((state) => state.cart);
  const checkout = useAppStore((state) => state.checkout);
  const isLoading = useAppStore((state) => state.isLoading);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const primaryAddress = getPrimaryAddress(addresses);
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

        <Text style={styles.checkoutSectionLabel}>ENDEREÇO</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressCardTitle}>
            {deliveryMode === "PICKUP" ? "Retirada no local" : primaryAddress?.label ?? "Sem endereço"}
          </Text>
          <Text style={styles.addressCardText}>
            {deliveryMode === "PICKUP" ? "Você poderá retirar seu pedido na loja." : formatAddressLine(primaryAddress)}
          </Text>
          <Text style={styles.addressCardSubtext}>
            {deliveryMode === "PICKUP" ? "Endereço não é necessário para esta opção." : formatAddressLocation(primaryAddress)}
          </Text>
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
            title="Cartão online"
            subtitle="Pague agora com Abacate Pay"
            selected={paymentMethod === "CARD_ONLINE"}
            onPress={() => setPaymentMethod("CARD_ONLINE")}
          />
          <PaymentOption
            icon="credit-card-outline"
            title="Cartão na entrega"
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
          disabled={isLoading || cart.length === 0 || (deliveryMode === "DELIVERY" && !primaryAddress)}
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

export function OrdersScreen({ onTrack }: { onTrack: () => void }) {
  const orders = useAppStore((state) => state.orders);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Meus pedidos</Text>
      {orders.map((order, index) => (
        <Pressable key={order.id} style={styles.orderCard} onPress={onTrack}>
          <View>
            <Text style={styles.orderMeta}>#{order.id.replace("PED-", "")} • há {index === 0 ? "12 min" : "25 min"}</Text>
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

export function TrackScreen({ onBack }: { onBack: () => void }) {
  const orders = useAppStore((state) => state.orders);
  const order = orders[0];
  const code = order?.confirmationCode ?? "4821";
  const currentStatus = order?.status ?? "PLACED";
  const courierName = order?.assignedCourierName ?? "Entregador em definição";
  const courierRating = order?.assignedCourierRating ?? 4.9;
  const timelineItems: Array<{
    key: OrderStatus;
    icon?: FeatherName;
    svgIcon?: SvgIconComponent;
    label: string;
    time?: string;
  }> = [
    {
      key: "PLACED",
      icon: "check",
      label: "Pedido realizado",
      time: formatOrderTime(order?.placedAt),
    },
    {
      key: "PROCESSING",
      svgIcon: svgIcons.ProcessingIcon,
      label: "Em processamento",
      time: formatOrderTime(order?.processingAt),
    },
    {
      key: "OUT_FOR_DELIVERY",
      svgIcon: svgIcons.OutForDeliveryIcon,
      label: "Saiu para entrega",
      time: formatOrderTime(order?.outForDeliveryAt),
    },
    {
      key: "DELIVERED",
      icon: "home",
      label: "Entregue",
      time: formatOrderTime(order?.deliveredAt),
    },
  ];

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
        {order?.assignedCourierAvatarUrl ? (
          <Image source={{ uri: order.assignedCourierAvatarUrl }} style={styles.courierPhoto} />
        ) : (
          <View style={styles.courierAvatar}>
            <Text style={styles.courierAvatarText}>{courierName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.courierName}>{courierName}</Text>
          <Text style={styles.profileEmail}>★ {courierRating.toFixed(1)} • Entregador</Text>
        </View>
      </View>

      <Text style={styles.trackTitle}>Status em tempo real</Text>
      <View style={styles.timeline}>
        {timelineItems.map((item) => (
          <TimelineItem
            key={item.key}
            icon={item.icon}
            svgIcon={item.svgIcon}
            label={item.label}
            time={item.time}
            isCurrent={currentStatus === item.key}
            isDelivered={item.key === "DELIVERED" && currentStatus === "DELIVERED"}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function TimelineItem({
  icon,
  svgIcon,
  label,
  time,
  isCurrent,
  isDelivered,
}: {
  icon?: FeatherName;
  svgIcon?: SvgIconComponent;
  label: string;
  time?: string;
  isCurrent?: boolean;
  isDelivered?: boolean;
}) {
  const offsetX = useSharedValue(0);

  useEffect(() => {
    if (isCurrent && !isDelivered) {
      offsetX.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 90 }),
          withTiming(4, { duration: 90 }),
          withTiming(0, { duration: 90 }),
        ),
        -1,
        false,
      );
      return () => cancelAnimation(offsetX);
    }

    cancelAnimation(offsetX);
    offsetX.value = 0;
    return undefined;
  }, [isCurrent, isDelivered, offsetX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));
  const toneStyle = isDelivered
    ? styles.timelineIconDelivered
    : isCurrent
      ? styles.timelineIconCurrent
      : undefined;
  const labelToneStyle = isDelivered
    ? styles.timelineLabelDelivered
    : isCurrent
      ? styles.timelineLabelCurrent
      : styles.timelineLabelMuted;
  const iconColor = isDelivered || isCurrent ? palette.onAccent : palette.muted;

  return (
    <View style={styles.timelineItem}>
      <Animated.View style={[styles.timelineIcon, toneStyle, animatedStyle]}>
        {svgIcon ? (
          <AppSvgIcon Icon={svgIcon} size={20} color={iconColor} />
        ) : icon ? (
          <Feather name={icon} size={20} color={iconColor} />
        ) : null}
      </Animated.View>
      <View>
        <Text style={[styles.timelineLabel, labelToneStyle]}>{label}</Text>
        <Text style={styles.timelineTime}>{time ?? "-"}</Text>
      </View>
    </View>
  );
}
