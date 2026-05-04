import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";
import { palette, roleLabels, svgIcons } from "../../app-shell/constants";
import { formatCurrency, formatOrderTime } from "../../app-shell/helpers";
import type { CourierTab } from "../../app-shell/navigation-types";
import { styles as sharedStyles } from "../../app-shell/styles";
import { AppSvgIcon } from "../../components/AppSvgIcon";
import {
  PasswordEditorFields,
  ProfileEditorFields,
  type PasswordEditorDraft,
  type ProfileEditorDraft,
} from "../../components/account/AccountForms";
import {
  removeProfileAvatarByUrl,
  uploadProfileAvatar,
  type UploadableProfileAvatar,
} from "../../services/storage-api";
import { useAppStore } from "../../state/app-store";
import { useCourierStore } from "./courier-store";

function isSameDay(value: string | undefined, now: Date) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getPaymentLabel(method: string) {
  switch (method) {
    case "PIX":
      return "Pix";
    case "CARD_ONLINE":
      return "Cartao online";
    case "CARD_ON_DELIVERY":
      return "Cartao";
    case "CASH":
      return "Dinheiro";
    default:
      return method;
  }
}

function getCourierInitials(name?: string) {
  if (!name?.trim()) {
    return "E";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatQuantityLabel(quantity: number, unitLabel?: string) {
  if (!unitLabel) {
    return `${quantity}x`;
  }

  return `${quantity}x ${unitLabel}`;
}

type CourierOrderDetailProps = {
  orderId: string;
  onBack: () => void;
};

function DeliveryConfirmSlider({
  enabled,
  loading,
  completed,
  label,
  onComplete,
}: {
  enabled: boolean;
  loading: boolean;
  completed: boolean;
  label: string;
  onComplete: () => Promise<void>;
}) {
  const thumbOffset = useRef(new Animated.Value(0)).current;
  const dragStartRef = useRef(0);
  const isCompletingRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = 60;
  const trackPadding = 6;
  const maxOffset = Math.max(trackWidth - thumbSize - trackPadding * 2, 0);

  const resetThumb = () => {
    Animated.spring(thumbOffset, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  };

  useEffect(() => {
    if (!enabled || completed) {
      resetThumb();
    }
  }, [completed, enabled, maxOffset]);

  const completeDelivery = useCallback(async () => {
    if (!enabled || loading || completed || isCompletingRef.current) {
      return;
    }

    isCompletingRef.current = true;

    Animated.timing(thumbOffset, {
      toValue: maxOffset,
      duration: 140,
      useNativeDriver: true,
    }).start();

    try {
      await onComplete();
    } finally {
      isCompletingRef.current = false;
      resetThumb();
    }
  }, [completed, enabled, loading, maxOffset, onComplete, thumbOffset]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          enabled &&
          !loading &&
          !completed &&
          Math.abs(gestureState.dx) > 4 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderGrant: () => {
          thumbOffset.stopAnimation((value) => {
            dragStartRef.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = Math.min(Math.max(dragStartRef.current + gestureState.dx, 0), maxOffset);
          thumbOffset.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          const releaseOffset = Math.min(Math.max(dragStartRef.current + gestureState.dx, 0), maxOffset);

          if (releaseOffset >= maxOffset * 0.82) {
            void completeDelivery();
            return;
          }

          resetThumb();
        },
        onPanResponderTerminate: resetThumb,
      }),
    [completed, completeDelivery, enabled, loading, maxOffset],
  );

  return (
    <View
      style={[
        courierStyles.confirmSliderTrack,
        !enabled && courierStyles.confirmSliderTrackDisabled,
        completed && courierStyles.confirmSliderTrackCompleted,
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Text
        style={[
          courierStyles.confirmSliderText,
          enabled && courierStyles.confirmSliderTextEnabled,
          completed && courierStyles.confirmSliderTextCompleted,
        ]}
      >
        {label}
      </Text>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          courierStyles.confirmSliderThumb,
          completed && courierStyles.confirmSliderThumbCompleted,
          {
            transform: [{ translateX: thumbOffset }],
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.green} />
        ) : (
          <Feather name="chevrons-right" size={24} color={completed ? "#fff" : "#8a7b7d"} />
        )}
      </Animated.View>
    </View>
  );
}

export function CourierNavigator() {
  const bootstrap = useCourierStore((state) => state.bootstrap);
  const refreshOrders = useCourierStore((state) => state.refreshOrders);
  const [activeTab, setActiveTab] = useState<CourierTab>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState<string>();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    void refreshOrders();
  }, [refreshOrders, selectedOrderId]);

  const handleTabChange = (tab: CourierTab) => {
    setSelectedOrderId(undefined);
    setActiveTab(tab);
  };

  return (
    <View style={courierStyles.root}>
      {selectedOrderId ? (
        <CourierOrderDetailScreen orderId={selectedOrderId} onBack={() => setSelectedOrderId(undefined)} />
      ) : activeTab === "orders" ? (
        <CourierOrdersScreen onOpenOrder={setSelectedOrderId} />
      ) : (
        <CourierProfileScreen />
      )}
      {!selectedOrderId ? (
        <CourierBottomTabs activeTab={activeTab} onChange={handleTabChange} />
      ) : null}
    </View>
  );
}

export function CourierAccountStateScreen({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const signOut = useAppStore((state) => state.signOut);
  const isLoading = useAppStore((state) => state.isLoading);

  return (
    <View style={courierStyles.accountStateRoot}>
      <View style={courierStyles.accountStateCard}>
        <View style={courierStyles.accountStateIcon}>
          <AppSvgIcon Icon={svgIcons.AdminCouriersIcon} size={34} color="#fff" />
        </View>
        <Text style={courierStyles.accountStateTitle}>{title}</Text>
        <Text style={courierStyles.accountStateDescription}>{description}</Text>
        <Button
          mode="contained"
          buttonColor={palette.green}
          textColor="#fff"
          style={courierStyles.accountStatePrimaryButton}
          contentStyle={courierStyles.accountStatePrimaryButtonContent}
          loading={isLoading}
          disabled={isLoading}
          onPress={onAction}
        >
          {actionLabel}
        </Button>
        <Button
          mode="outlined"
          textColor={palette.text}
          style={courierStyles.accountStateGhostButton}
          onPress={() => void signOut()}
        >
          Sair
        </Button>
      </View>
    </View>
  );
}

function CourierOrdersScreen({ onOpenOrder }: { onOpenOrder: (orderId: string) => void }) {
  const orders = useCourierStore((state) => state.orders);
  const profile = useAppStore((state) => state.profile);
  const now = useMemo(() => new Date(), [orders]);
  const activeOrders = orders.filter((order) => order.status === "PROCESSING" || order.status === "OUT_FOR_DELIVERY");
  const pendingCount = activeOrders.length;
  const deliveredToday = orders.filter((order) => isSameDay(order.deliveredAt, now)).length;
  const rating = profile?.rating ?? 4.9;
  const firstName = profile?.fullName?.split(" ")[0] ?? "Entregador";

  return (
    <ScrollView contentContainerStyle={courierStyles.content}>
      <View style={courierStyles.hero}>
        <View style={courierStyles.heroRow}>
          <View>
            <Text style={courierStyles.heroKicker}>Olá, entregador</Text>
            <Text style={courierStyles.heroName}>{firstName} 👋</Text>
          </View>
          <View style={courierStyles.heroAvatar}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={courierStyles.heroAvatarImage} />
            ) : (
              <Text style={courierStyles.heroAvatarText}>{getCourierInitials(profile?.fullName).slice(0, 1)}</Text>
            )}
          </View>
        </View>

        <View style={courierStyles.statGrid}>
          <CourierStatCard
            icon={svgIcons.AdminOrdersIcon}
            value={String(pendingCount)}
            label="Pendentes"
          />
          <CourierStatCard
            iconName="trending-up"
            value={String(deliveredToday)}
            label="Hoje"
          />
          <CourierStatCard
            iconName="star"
            value={rating.toFixed(1)}
            label="Avaliacao"
          />
        </View>
      </View>

      <View style={courierStyles.sectionHeader}>
        <Text style={courierStyles.sectionTitle}>Pedidos delegados</Text>
        <View style={courierStyles.activePill}>
          <Text style={courierStyles.activePillText}>{activeOrders.length} ativos</Text>
        </View>
      </View>

      <View style={courierStyles.orderList}>
        {activeOrders.map((order) => (
          <Pressable
            key={order.rawOrderId}
            style={courierStyles.orderCard}
            onPress={() => onOpenOrder(order.rawOrderId)}
          >
            <View style={courierStyles.orderCardHeader}>
              <View style={courierStyles.orderMetaBlock}>
                <Text style={courierStyles.orderIdText}>{order.id}</Text>
                <View style={courierStyles.orderTimeRow}>
                  <Feather name="clock" size={14} color="#746266" />
                  <Text style={courierStyles.orderTimeText}>{formatOrderTime(order.placedAt)}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={22} color="#746266" />
            </View>

            <Text style={courierStyles.customerName}>{order.customerName}</Text>
            <Text style={courierStyles.customerLocation}>{order.addressLocation ?? "Retirada no local"}</Text>

            <View style={courierStyles.orderDivider} />

            <View style={courierStyles.orderFooter}>
              <View style={courierStyles.orderFooterMeta}>
                <View style={courierStyles.metaPill}>
                  <AppSvgIcon Icon={svgIcons.AdminOrdersIcon} size={14} color={palette.muted} />
                  <Text style={courierStyles.metaPillText}>{order.items.length} itens</Text>
                </View>
                <View style={courierStyles.metaPill}>
                  <Text style={courierStyles.metaPillText}>{getPaymentLabel(order.paymentMethod)}</Text>
                </View>
              </View>
              <Text style={courierStyles.orderTotal}>{formatCurrency(order.totalInCents)}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {activeOrders.length === 0 ? (
        <View style={sharedStyles.emptyState}>
          <AppSvgIcon Icon={svgIcons.AdminOrdersIcon} size={34} color={palette.green} />
          <Text style={sharedStyles.emptyTitle}>Nenhum pedido ativo</Text>
          <Text style={sharedStyles.emptyText}>Os pedidos atribuídos a você aparecerão aqui.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function CourierOrderDetailScreen({ orderId, onBack }: CourierOrderDetailProps) {
  const orders = useCourierStore((state) => state.orders);
  const isLoading = useCourierStore((state) => state.isLoading);
  const markOutForDelivery = useCourierStore((state) => state.markOutForDelivery);
  const confirmDelivery = useCourierStore((state) => state.confirmDelivery);
  const order = orders.find((item) => item.rawOrderId === orderId);
  const [code, setCode] = useState("");
  const codeInputRef = useRef<NativeTextInput>(null);

  useEffect(() => {
    setCode("");
  }, [orderId]);

  if (!order) {
    return (
      <ScrollView contentContainerStyle={courierStyles.content}>
        <View style={courierStyles.detailHero}>
          <View style={courierStyles.detailHeaderRow}>
            <Pressable style={courierStyles.detailBackButton} onPress={onBack}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <View>
              <Text style={courierStyles.detailKicker}>Pedido</Text>
              <Text style={courierStyles.detailTitle}>Nao encontrado</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  const canMarkOut = order.status === "PROCESSING";
  const canConfirm = order.status === "OUT_FOR_DELIVERY" && code.length === 4 && !isLoading;
  const isDelivered = order.status === "DELIVERED";
  const changeAmount =
    order.paymentMethod === "CASH" && order.changeForInCents && order.changeForInCents > order.totalInCents
      ? order.changeForInCents - order.totalInCents
      : undefined;
  const sliderLabel = isDelivered
    ? "Entrega confirmada"
    : order.status !== "OUT_FOR_DELIVERY"
      ? "Aguardando sair para entrega"
      : code.length < 4
        ? "Informe o codigo para confirmar"
        : "Arraste para confirmar entrega";

  return (
    <ScrollView contentContainerStyle={courierStyles.content}>
      <View style={courierStyles.detailHero}>
        <View style={courierStyles.detailHeaderRow}>
          <Pressable style={courierStyles.detailBackButton} onPress={onBack}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={courierStyles.detailKicker}>Recebido as {formatOrderTime(order.placedAt)}</Text>
            <Text style={courierStyles.detailTitle}>Pedido {order.id}</Text>
          </View>
        </View>
      </View>

      <View style={courierStyles.detailCard}>
        <View style={courierStyles.customerIdentity}>
          <View style={courierStyles.customerInitialCircle}>
            <Text style={courierStyles.customerInitialText}>
              {order.customerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={courierStyles.flex}>
            <Text style={courierStyles.detailLabel}>Cliente</Text>
            <Text style={courierStyles.detailStrong}>{order.customerName}</Text>
          </View>
        </View>
      </View>

      <View style={courierStyles.detailCard}>
        <View style={courierStyles.detailRowStart}>
          <View style={courierStyles.detailIconBox}>
            <Feather name="map-pin" size={22} color={palette.green} />
          </View>
          <View style={courierStyles.flex}>
            <Text style={courierStyles.detailLabel}>Endereco de entrega</Text>
            <Text style={courierStyles.detailStrong}>{order.addressLine ?? "Retirada no local"}</Text>
            <Text style={courierStyles.detailMuted}>{order.addressLocation ?? "Mapa sera integrado em breve"}</Text>
          </View>
        </View>

        <Pressable
          style={courierStyles.mapButton}
          onPress={() =>
            useAppStore.setState({
              statusMessage: "Abertura no mapa sera implementada em seguida.",
              errorMessage: undefined,
            })
          }
        >
          <Feather name="navigation" size={20} color="#211516" />
          <Text style={courierStyles.mapButtonText}>Abrir no mapa</Text>
        </Pressable>
      </View>

      <View style={courierStyles.detailCard}>
        <View style={courierStyles.cardTitleRow}>
          <AppSvgIcon Icon={svgIcons.AdminOrdersIcon} size={18} color={palette.green} />
          <Text style={courierStyles.cardTitle}>Itens ({order.items.length})</Text>
        </View>

        <View style={courierStyles.itemsList}>
          {order.items.map((item) => (
            <View key={item.id} style={courierStyles.itemRow}>
              <Text style={courierStyles.itemName}>{item.productName}</Text>
              <Text style={courierStyles.itemQuantity}>{formatQuantityLabel(item.quantity, item.unitLabel)}</Text>
            </View>
          ))}
        </View>
      </View>

      {order.notes ? (
        <View style={courierStyles.noteCard}>
          <Text style={courierStyles.noteText}>{order.notes}</Text>
        </View>
      ) : null}

      <View style={courierStyles.detailCard}>
        <View style={courierStyles.cardTitleRow}>
          <Feather name="credit-card" size={18} color={palette.green} />
          <Text style={courierStyles.cardTitle}>Pagamento</Text>
        </View>

        <View style={courierStyles.paymentRow}>
          <Text style={courierStyles.paymentLabel}>Metodo</Text>
          <Text style={courierStyles.paymentValue}>{getPaymentLabel(order.paymentMethod)}</Text>
        </View>

        {order.paymentMethod === "CASH" && order.changeForInCents ? (
          <>
            <View style={courierStyles.paymentRow}>
              <Text style={courierStyles.paymentLabel}>Troco para</Text>
              <Text style={courierStyles.paymentValue}>{formatCurrency(order.changeForInCents)}</Text>
            </View>
            {changeAmount ? (
              <View style={courierStyles.paymentRow}>
                <Text style={courierStyles.paymentLabelAccent}>Levar de troco</Text>
                <Text style={courierStyles.paymentValueAccent}>{formatCurrency(changeAmount)}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        <View style={courierStyles.paymentDivider} />
        <View style={courierStyles.paymentRow}>
          <Text style={courierStyles.paymentTotalLabel}>Total do pedido</Text>
          <Text style={courierStyles.paymentTotalValue}>{formatCurrency(order.totalInCents)}</Text>
        </View>
      </View>

      <Button
        mode="contained"
        buttonColor={canMarkOut ? palette.green : "#d86167"}
        textColor={palette.onAccent}
        style={courierStyles.primaryActionButton}
        contentStyle={courierStyles.primaryActionContent}
        loading={isLoading && canMarkOut}
        disabled={!canMarkOut || isLoading}
        icon="truck-fast-outline"
        onPress={() => void markOutForDelivery(order.rawOrderId)}
      >
        {order.status === "OUT_FOR_DELIVERY" ? "Pedido em rota" : "Sai para entrega"}
      </Button>

      <View style={courierStyles.codeCard}>
        <Text style={courierStyles.codeTitle}>Codigo de confirmacao</Text>
        <Text style={courierStyles.codeHint}>Peca ao cliente os 4 digitos para confirmar a entrega</Text>

        <Pressable style={courierStyles.codeBoxes} onPress={() => codeInputRef.current?.focus()}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={courierStyles.codeBox}>
              <Text style={courierStyles.codeBoxText}>{code[index] ?? ""}</Text>
            </View>
          ))}
        </Pressable>

        <NativeTextInput
          ref={codeInputRef}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          style={courierStyles.hiddenCodeInput}
        />
      </View>

      <DeliveryConfirmSlider
        enabled={canConfirm}
        loading={isLoading && order.status === "OUT_FOR_DELIVERY"}
        completed={isDelivered}
        label={sliderLabel}
        onComplete={() => confirmDelivery(order.rawOrderId, code)}
      />
    </ScrollView>
  );
}

function CourierProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const signOut = useAppStore((state) => state.signOut);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const changePassword = useAppStore((state) => state.changePassword);
  const isLoading = useAppStore((state) => state.isLoading);
  const orders = useCourierStore((state) => state.orders);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileEditorDraft>({
    fullName: "",
    phone: "",
    cpf: "",
    avatarUrl: "",
    vehicleType: "",
    vehiclePlate: "",
    driverLicense: "",
  });
  const [passwordDraft, setPasswordDraft] = useState<PasswordEditorDraft>({
    password: "",
    confirmPassword: "",
  });
  const [pendingAvatar, setPendingAvatar] = useState<UploadableProfileAvatar | null>(null);

  const openProfileEditor = () => {
    setProfileDraft({
      fullName: profile?.fullName ?? "",
      phone: profile?.phone ?? "",
      cpf: profile?.cpf ?? "",
      avatarUrl: profile?.avatarUrl ?? "",
      vehicleType: profile?.vehicleType ?? "",
      vehiclePlate: profile?.vehiclePlate ?? "",
      driverLicense: profile?.driverLicense ?? "",
    });
    setPendingAvatar(null);
    setIsProfileModalOpen(true);
  };

  const closeProfileEditor = () => {
    setPendingAvatar(null);
    setIsProfileModalOpen(false);
  };

  const openPasswordEditor = () => {
    setPasswordDraft({ password: "", confirmPassword: "" });
    setIsPasswordModalOpen(true);
  };

  const closePasswordEditor = () => {
    setIsPasswordModalOpen(false);
  };

  const pickAvatarFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      useAppStore.setState({ errorMessage: "Nao foi possivel ler a foto selecionada." });
      return;
    }

    setPendingAvatar({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });
  };

  const removeAvatarSelection = () => {
    setPendingAvatar(null);
    setProfileDraft((current) => ({ ...current, avatarUrl: "" }));
  };

  const avatarPreviewUri = pendingAvatar?.uri ?? profileDraft.avatarUrl;
  const deliveredToday = orders.filter((order) => isSameDay(order.deliveredAt, new Date())).length;
  const rating = profile?.rating ?? 4.9;

  return (
    <>
      <ScrollView contentContainerStyle={courierStyles.content}>
        <View style={courierStyles.profileHero}>
          <Text style={courierStyles.profileHeroTitle}>Meu Perfil</Text>
        </View>

        <View style={courierStyles.profileSummaryCard}>
          <View style={courierStyles.profileAvatarWrap}>
            <View style={courierStyles.profileAvatarCircle}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={courierStyles.profileAvatarImage} />
              ) : (
                <Text style={courierStyles.profileAvatarInitials}>{getCourierInitials(profile?.fullName)}</Text>
              )}
            </View>
            <Pressable style={courierStyles.profileAvatarEdit} onPress={openProfileEditor}>
              <Feather name="edit-2" size={16} color="#fff" />
            </Pressable>
          </View>

          <Text style={courierStyles.profileName}>{profile?.fullName ?? "Entregador Verdeja"}</Text>
          <Text style={courierStyles.profileRole}>{profile ? roleLabels[profile.role] : "Entregador"}</Text>
          <Text style={courierStyles.profileRating}>★ {rating.toFixed(1)} • {deliveredToday} entregas hoje</Text>
        </View>

        <View style={courierStyles.profileInfoCard}>
          <CourierInfoRow iconName="truck" label="Veiculo" value={profile?.vehicleType || "Nao informado"} />
          <CourierInfoRow iconName="hash" label="Placa" value={profile?.vehiclePlate || "Nao informada"} />
          <CourierInfoRow iconName="credit-card" label="CNH" value={profile?.driverLicense || "Nao informada"} />
          <CourierInfoRow iconName="phone" label="Telefone" value={profile?.phone || "Nao informado"} />
          <CourierInfoRow iconName="file-text" label="CPF" value={profile?.cpf || "Nao informado"} />
        </View>

        <CourierProfileAction iconName="edit-3" label="Editar perfil" active onPress={openProfileEditor} />
        <CourierProfileAction iconName="key" label="Alterar senha" onPress={openPasswordEditor} />
        <CourierProfileAction svgIcon={svgIcons.LogoutIcon} label="Sair" danger onPress={() => void signOut()} />
      </ScrollView>

      <Portal>
        <Modal visible={isProfileModalOpen} onDismiss={closeProfileEditor} contentContainerStyle={sharedStyles.accountModalContainer}>
          <View style={sharedStyles.accountModalCard}>
            <ScrollView
              style={sharedStyles.accountModalScroll}
              contentContainerStyle={sharedStyles.accountModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={sharedStyles.accountModalHeader}>
                <Text style={sharedStyles.accountModalTitle}>Editar perfil</Text>
                <Pressable onPress={closeProfileEditor}>
                  <Feather name="x" size={24} color={palette.muted} />
                </Pressable>
              </View>
              <Text style={sharedStyles.accountModalSubtitle}>
                Atualize sua foto, dados pessoais e informacoes do veiculo.
              </Text>
              <ProfileEditorFields
                draft={profileDraft}
                avatarPreviewUri={avatarPreviewUri}
                loading={isLoading}
                showCourierFields
                onPickAvatar={() => void pickAvatarFromGallery()}
                onRemoveAvatar={removeAvatarSelection}
                onChange={setProfileDraft}
              />
              <View style={sharedStyles.accountModalFooter}>
                <Button
                  mode="contained-tonal"
                  buttonColor={palette.cardSoft}
                  textColor={palette.text}
                  style={sharedStyles.accountModalSecondaryButton}
                  onPress={closeProfileEditor}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  loading={isLoading}
                  disabled={isLoading}
                  buttonColor={palette.green}
                  textColor={palette.onAccent}
                  style={sharedStyles.accountModalPrimaryButton}
                  onPress={async () => {
                    let nextAvatarUrl = profileDraft.avatarUrl;
                    let uploadedAvatarUrl: string | undefined;
                    const previousAvatarUrl = profile?.avatarUrl;

                    if (pendingAvatar) {
                      uploadedAvatarUrl = await uploadProfileAvatar(pendingAvatar);
                      nextAvatarUrl = uploadedAvatarUrl;
                    }

                    await updateProfile({
                      ...profileDraft,
                      avatarUrl: nextAvatarUrl,
                    });

                    if (uploadedAvatarUrl && useAppStore.getState().errorMessage) {
                      await removeProfileAvatarByUrl(uploadedAvatarUrl);
                    }

                    if (
                      !useAppStore.getState().errorMessage &&
                      previousAvatarUrl &&
                      previousAvatarUrl !== nextAvatarUrl
                    ) {
                      await removeProfileAvatarByUrl(previousAvatarUrl);
                    }

                    if (!useAppStore.getState().errorMessage) {
                      closeProfileEditor();
                    }
                  }}
                >
                  Salvar
                </Button>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={isPasswordModalOpen} onDismiss={closePasswordEditor} contentContainerStyle={sharedStyles.accountModalContainer}>
          <View style={sharedStyles.accountModalCard}>
            <ScrollView
              style={sharedStyles.accountModalScroll}
              contentContainerStyle={sharedStyles.accountModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={sharedStyles.accountModalHeader}>
                <Text style={sharedStyles.accountModalTitle}>Alterar senha</Text>
                <Pressable onPress={closePasswordEditor}>
                  <Feather name="x" size={24} color={palette.muted} />
                </Pressable>
              </View>
              <Text style={sharedStyles.accountModalSubtitle}>Defina uma nova senha para sua conta de entregador.</Text>
              <PasswordEditorFields draft={passwordDraft} onChange={setPasswordDraft} />
              <View style={sharedStyles.accountModalFooter}>
                <Button
                  mode="contained-tonal"
                  buttonColor={palette.cardSoft}
                  textColor={palette.text}
                  style={sharedStyles.accountModalSecondaryButton}
                  onPress={closePasswordEditor}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  loading={isLoading}
                  disabled={isLoading}
                  buttonColor={palette.green}
                  textColor={palette.onAccent}
                  style={sharedStyles.accountModalPrimaryButton}
                  onPress={async () => {
                    await changePassword(passwordDraft.password, passwordDraft.confirmPassword);
                    if (!useAppStore.getState().errorMessage) {
                      closePasswordEditor();
                    }
                  }}
                >
                  Salvar
                </Button>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

function CourierStatCard({
  icon,
  iconName,
  value,
  label,
}: {
  icon?: typeof svgIcons.AdminOrdersIcon;
  iconName?: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={courierStyles.statCard}>
      {icon ? <AppSvgIcon Icon={icon} size={18} color="#fff" /> : null}
      {iconName ? <Feather name={iconName} size={18} color="#fff" /> : null}
      <Text style={courierStyles.statValue}>{value}</Text>
      <Text style={courierStyles.statLabel}>{label}</Text>
    </View>
  );
}

function CourierBottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: CourierTab;
  onChange: (tab: CourierTab) => void;
}) {
  return (
    <View style={courierStyles.bottomTabs}>
      <CourierTabButton
        label="Pedidos"
        active={activeTab === "orders"}
        onPress={() => onChange("orders")}
        icon={svgIcons.AdminOrdersIcon}
      />
      <CourierTabButton
        label="Perfil"
        active={activeTab === "profile"}
        onPress={() => onChange("profile")}
        icon={svgIcons.ProfileIcon}
      />
    </View>
  );
}

function CourierTabButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: typeof svgIcons.ProfileIcon;
}) {
  return (
    <Pressable style={courierStyles.tabButton} onPress={onPress}>
      <View style={[courierStyles.tabIconWrap, active && courierStyles.tabIconWrapActive]}>
        <AppSvgIcon Icon={icon} size={22} color={active ? palette.green : "#897d7f"} />
      </View>
      <Text style={[courierStyles.tabLabel, active && courierStyles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function CourierInfoRow({
  label,
  value,
  iconName,
}: {
  label: string;
  value: string;
  iconName?: keyof typeof Feather.glyphMap;
}) {
  return (
    <View style={courierStyles.infoRow}>
      <View style={courierStyles.infoIconBox}>
        {iconName ? (
          <Feather name={iconName} size={22} color={palette.green} />
        ) : null}
      </View>
      <View style={courierStyles.flex}>
        <Text style={courierStyles.infoLabel}>{label}</Text>
        <Text style={courierStyles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function CourierProfileAction({
  label,
  iconName,
  svgIcon,
  active,
  danger,
  onPress,
}: {
  label: string;
  iconName?: keyof typeof Feather.glyphMap;
  svgIcon?: typeof svgIcons.LogoutIcon;
  active?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[
        courierStyles.profileAction,
        active && courierStyles.profileActionActive,
        danger && courierStyles.profileActionDanger,
      ]}
      onPress={onPress}
    >
      <View style={courierStyles.profileActionIcon}>
        {svgIcon ? (
          <AppSvgIcon Icon={svgIcon} size={22} color={danger ? palette.green : "#1f1516"} />
        ) : iconName ? (
          <Feather name={iconName} size={22} color="#1f1516" />
        ) : null}
      </View>
      <Text style={[courierStyles.profileActionText, danger && courierStyles.profileActionTextDanger]}>
        {label}
      </Text>
      <Feather name="chevron-right" size={22} color="#8b7e80" />
    </Pressable>
  );
}

const courierStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff8f8",
  },
  accountStateRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff8f8",
  },
  accountStateCard: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  accountStateIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  accountStateTitle: {
    color: "#26191a",
    fontSize: 24,
    marginTop: 18,
    textAlign: "center",
  },
  accountStateDescription: {
    color: "#705c61",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    textAlign: "center",
  },
  accountStatePrimaryButton: {
    alignSelf: "stretch",
    borderRadius: 18,
    marginTop: 22,
  },
  accountStatePrimaryButtonContent: {
    height: 54,
  },
  accountStateGhostButton: {
    alignSelf: "stretch",
    borderRadius: 18,
    marginTop: 12,
    borderColor: "#eadcdb",
  },
  flex: {
    flex: 1,
  },
  content: {
    backgroundColor: "#fff8f8",
    paddingBottom: 150,
  },
  hero: {
    backgroundColor: palette.green,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroKicker: {
    color: "#ffe7e7",
    fontSize: 16,
  },
  heroName: {
    color: "#fff",
    fontSize: 24,
    marginTop: 6,
  },
  heroAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 26,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  heroAvatarImage: {
    height: "100%",
    width: "100%",
  },
  heroAvatarText: {
    color: "#fff",
    fontSize: 24,
  },
  statGrid: {
    flexDirection: "row",
    gap: 14,
    marginTop: 26,
  },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    flex: 1,
    gap: 6,
    minHeight: 98,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
  },
  statLabel: {
    color: "#ffe7e7",
    fontSize: 15,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: "#1f1516",
    fontSize: 22,
  },
  activePill: {
    backgroundColor: "#f0ebeb",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activePillText: {
    color: "#3c2728",
    fontSize: 14,
  },
  orderList: {
    gap: 16,
    marginTop: 18,
    paddingHorizontal: 24,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderColor: "#eedddd",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  orderCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderMetaBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  orderIdText: {
    color: palette.green,
    fontSize: 18,
  },
  orderTimeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  orderTimeText: {
    color: "#746266",
    fontSize: 16,
  },
  customerName: {
    color: "#1f1516",
    fontSize: 20,
    marginTop: 14,
  },
  customerLocation: {
    color: "#7b6d70",
    fontSize: 16,
    marginTop: 10,
  },
  orderDivider: {
    backgroundColor: "#efe5e5",
    height: 1,
    marginTop: 14,
  },
  orderFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  orderFooterMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    alignItems: "center",
    backgroundColor: "#f7f1f1",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    color: "#3a2a2c",
    fontSize: 14,
  },
  orderTotal: {
    color: palette.green,
    fontSize: 18,
  },
  detailHero: {
    backgroundColor: palette.green,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  detailHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  detailBackButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
  },
  detailKicker: {
    color: "#ffe6e6",
    fontSize: 15,
  },
  detailTitle: {
    color: "#fff",
    fontSize: 24,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: "#fff",
    borderColor: "#eedddd",
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 18,
    padding: 18,
  },
  customerIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  customerInitialCircle: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  customerInitialText: {
    color: "#fff",
    fontSize: 24,
  },
  detailRowStart: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  detailIconBox: {
    alignItems: "center",
    backgroundColor: "#fde9ea",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  detailLabel: {
    color: "#7a6669",
    fontSize: 16,
  },
  detailStrong: {
    color: "#171112",
    fontSize: 18,
    marginTop: 4,
  },
  detailMuted: {
    color: "#7a6669",
    fontSize: 16,
    marginTop: 6,
  },
  mapButton: {
    alignItems: "center",
    borderColor: "#ead9da",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 44,
  },
  mapButtonText: {
    color: "#211516",
    fontSize: 18,
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  cardTitle: {
    color: "#1a1112",
    fontSize: 18,
  },
  itemsList: {
    marginTop: 16,
  },
  itemRow: {
    alignItems: "center",
    borderBottomColor: "#eee3e3",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  itemName: {
    color: "#1f1516",
    flex: 1,
    fontSize: 16,
    paddingRight: 12,
  },
  itemQuantity: {
    color: "#736467",
    fontSize: 16,
  },
  noteCard: {
    backgroundColor: "#fff6ec",
    borderColor: "#f2c89a",
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 18,
    padding: 18,
  },
  noteText: {
    color: "#6d4a13",
    fontSize: 16,
    lineHeight: 24,
  },
  paymentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  paymentLabel: {
    color: "#756568",
    fontSize: 16,
  },
  paymentValue: {
    color: "#171112",
    fontSize: 16,
  },
  paymentLabelAccent: {
    color: "#f08d1c",
    fontSize: 16,
  },
  paymentValueAccent: {
    color: "#f08d1c",
    fontSize: 16,
  },
  paymentDivider: {
    backgroundColor: "#eee3e3",
    height: 1,
    marginTop: 18,
  },
  paymentTotalLabel: {
    color: "#171112",
    fontSize: 18,
  },
  paymentTotalValue: {
    color: palette.green,
    fontSize: 18,
  },
  primaryActionButton: {
    borderRadius: 18,
    marginHorizontal: 24,
    marginTop: 18,
  },
  primaryActionContent: {
    minHeight: 58,
  },
  codeCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#eedddd",
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  codeTitle: {
    color: "#191012",
    fontSize: 20,
  },
  codeHint: {
    color: "#76686b",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  codeBoxes: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  codeBox: {
    alignItems: "center",
    borderColor: "#eadede",
    borderRadius: 14,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  codeBoxText: {
    color: "#171112",
    fontSize: 24,
  },
  hiddenCodeInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
  },
  confirmSliderTrack: {
    alignItems: "center",
    backgroundColor: "#f5f2f2",
    borderColor: "#e7dcdc",
    borderRadius: 28,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    marginHorizontal: 24,
    marginTop: 20,
    overflow: "hidden",
    paddingHorizontal: 28,
    position: "relative",
  },
  confirmSliderTrackDisabled: {
    backgroundColor: "#ebe6e6",
  },
  confirmSliderTrackCompleted: {
    backgroundColor: "#eef9ef",
    borderColor: "#d6ebd8",
  },
  confirmSliderText: {
    color: "#a5a0a0",
    fontSize: 20,
    textAlign: "center",
  },
  confirmSliderTextEnabled: {
    color: "#85787a",
  },
  confirmSliderTextCompleted: {
    color: "#2f7d32",
  },
  confirmSliderThumb: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    left: 6,
    position: "absolute",
    shadowColor: "#d7cdcd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    top: 6,
    width: 60,
  },
  confirmSliderThumbCompleted: {
    backgroundColor: palette.green,
  },
  confirmDeliveryButton: {
    borderRadius: 26,
    marginHorizontal: 24,
    marginTop: 20,
  },
  confirmDeliveryContent: {
    minHeight: 62,
  },
  profileHero: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    paddingBottom: 24,
    paddingTop: 28,
  },
  profileHeroTitle: {
    color: "#fff",
    fontSize: 24,
  },
  profileSummaryCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#eedddd",
    borderRadius: 26,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: -10,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  profileAvatarWrap: {
    marginBottom: 18,
  },
  profileAvatarCircle: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderRadius: 60,
    height: 120,
    justifyContent: "center",
    overflow: "hidden",
    width: 120,
  },
  profileAvatarImage: {
    height: "100%",
    width: "100%",
  },
  profileAvatarInitials: {
    color: "#fff",
    fontSize: 34,
  },
  profileAvatarEdit: {
    alignItems: "center",
    backgroundColor: palette.green,
    borderColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    bottom: 0,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 40,
  },
  profileName: {
    color: "#1a1112",
    fontSize: 22,
  },
  profileRole: {
    color: "#756568",
    fontSize: 17,
    marginTop: 8,
  },
  profileRating: {
    color: "#3f2d2f",
    fontSize: 18,
    marginTop: 12,
  },
  profileInfoCard: {
    backgroundColor: "#fff",
    borderColor: "#eedddd",
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 20,
    overflow: "hidden",
    paddingHorizontal: 18,
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: "#efe3e3",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingVertical: 16,
  },
  infoIconBox: {
    alignItems: "center",
    backgroundColor: "#fde9ea",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  infoLabel: {
    color: "#7c696b",
    fontSize: 15,
  },
  infoValue: {
    color: "#151011",
    fontSize: 18,
    marginTop: 4,
  },
  profileAction: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#eadede",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    marginHorizontal: 24,
    marginTop: 16,
    minHeight: 84,
    paddingHorizontal: 18,
  },
  profileActionActive: {
    borderColor: "#f3b7bb",
  },
  profileActionDanger: {
    marginBottom: 12,
  },
  profileActionIcon: {
    alignItems: "center",
    backgroundColor: "#f5f3f3",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  profileActionText: {
    color: "#161011",
    flex: 1,
    fontSize: 20,
  },
  profileActionTextDanger: {
    color: palette.green,
  },
  bottomTabs: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopColor: "#f1e4e4",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    paddingBottom: 28,
    paddingTop: 14,
    position: "absolute",
    right: 0,
  },
  tabButton: {
    alignItems: "center",
    gap: 8,
  },
  tabIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  tabIconWrapActive: {
    backgroundColor: "#fde9ea",
  },
  tabLabel: {
    color: "#6f6265",
    fontSize: 14,
  },
  tabLabelActive: {
    color: palette.green,
  },
});
