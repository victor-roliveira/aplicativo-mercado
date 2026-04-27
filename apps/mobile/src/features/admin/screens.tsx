import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import { palette, svgIcons, type FeatherName, type SvgIconComponent } from "../../app-shell/constants";
import type { AdminTab } from "../../app-shell/navigation-types";
import { formatCurrency } from "../../app-shell/helpers";
import { AppSvgIcon } from "../../components/AppSvgIcon";
import { useAppStore } from "../../state/app-store";
import { useAdminStore } from "./admin-store";
import type { AdminCourier, AdminCourierForm, AdminOrder, AdminProduct, AdminProductForm } from "../../services/admin-api";

type OrderFilter = "ALL" | "PLACED" | "PROCESSING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

const adminTabs: Array<{
  key: AdminTab;
  label: string;
  icon: SvgIconComponent;
}> = [
  { key: "products", label: "Produtos", icon: svgIcons.AdminProductsIcon },
  { key: "couriers", label: "Entregadores", icon: svgIcons.AdminCouriersIcon },
  { key: "orders", label: "Pedidos", icon: svgIcons.AdminOrdersIcon },
  { key: "profile", label: "Perfil", icon: svgIcons.ProfileIcon },
];

const orderFilterLabels: Record<OrderFilter, string> = {
  ALL: "Todos",
  PLACED: "Pendente",
  PROCESSING: "Em separação",
  OUT_FOR_DELIVERY: "Em entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Recusado",
};

export function AdminNavigator() {
  const bootstrap = useAdminStore((state) => state.bootstrap);
  const [activeTab, setActiveTab] = useState<AdminTab>("products");

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <View style={adminStyles.root}>
      {activeTab === "products" ? <AdminProductsScreen /> : null}
      {activeTab === "couriers" ? <AdminCouriersScreen /> : null}
      {activeTab === "orders" ? <AdminOrdersScreen /> : null}
      {activeTab === "profile" ? <AdminProfileScreen /> : null}
      <AdminBottomTabs activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

function AdminProductsScreen() {
  const categories = useAdminStore((state) => state.categories);
  const products = useAdminStore((state) => state.products);
  const saveProduct = useAdminStore((state) => state.saveProduct);
  const deleteProduct = useAdminStore((state) => state.deleteProduct);
  const isLoading = useAdminStore((state) => state.isLoading);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProductForm | null>(null);

  const categoryOptions = useMemo(
    () => ["Todos", ...categories.map((category) => category.name)],
    [categories],
  );

  const filteredProducts = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === "Todos" || product.categoryName === selectedCategory;
      const matchesSearch =
        !normalized ||
        `${product.name} ${product.sku} ${product.categoryName}`.toLowerCase().includes(normalized);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <>
      <ScrollView contentContainerStyle={adminStyles.content}>
        <AdminHero
          icon={svgIcons.AdminProductsIcon}
          title="Produtos"
          subtitle="Gerencie o catálogo"
        />

        <View style={adminStyles.toolbar}>
          <View style={adminStyles.searchCard}>
            <Feather name="search" size={20} color="#9a7b78" />
            <TextInput
              mode="flat"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar produto..."
              placeholderTextColor="#9a7b78"
              style={adminStyles.searchInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              theme={{ colors: { background: "transparent", surfaceVariant: "transparent" } }}
            />
          </View>
          <Pressable
            style={adminStyles.squareAction}
            onPress={() =>
              setEditingProduct({
                categoryId: categories[0]?.id ?? "",
                name: "",
                sku: "",
                description: "",
                price: "",
                stock: "",
                unitLabel: "un",
                imageUrl: "",
              })
            }
          >
            <Feather name="plus" size={24} color="#fff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={adminStyles.chipRow}>
          {categoryOptions.map((category) => {
            const active = category === selectedCategory;
            return (
              <Pressable
                key={category}
                style={[adminStyles.filterChip, active && adminStyles.filterChipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[adminStyles.filterChipText, active && adminStyles.filterChipTextActive]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={adminStyles.grid}>
          {filteredProducts.map((product) => (
            <Pressable key={product.id} style={adminStyles.productCard} onPress={() => setSelectedProduct(product)}>
              <View style={adminStyles.productPreview}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={adminStyles.productPreviewImage} />
                ) : (
                  <AppSvgIcon Icon={svgIcons.AdminProductsIcon} size={54} color={palette.green} />
                )}
              </View>
              <View style={adminStyles.productMeta}>
                <Text style={adminStyles.softBadge}>{product.categoryName}</Text>
                <Text style={adminStyles.productTitle}>{product.name}</Text>
                <Text style={adminStyles.productPrice}>{formatCurrency(product.priceInCents)}</Text>
                <Text style={adminStyles.productUnit}>/ {product.unitLabel}</Text>
              </View>
              <View style={adminStyles.productActions}>
                <Text style={adminStyles.stockBadge}>{product.stockQuantity}</Text>
                <View style={adminStyles.productActionRow}>
                  <Button
                    mode="contained-tonal"
                    buttonColor="#f8efef"
                    textColor="#2f1d1e"
                    style={adminStyles.editActionButton}
                    icon="pencil-outline"
                    onPress={() =>
                      setEditingProduct({
                        id: product.id,
                        categoryId: product.categoryId,
                        name: product.name,
                        sku: product.sku,
                        description: product.description,
                        price: (product.priceInCents / 100).toFixed(2).replace(".", ","),
                        stock: String(product.stockQuantity),
                        unitLabel: product.unitLabel,
                        imageUrl: product.imageUrl ?? "",
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Pressable
                    style={adminStyles.deleteCircle}
                    onPress={() => void deleteProduct(product.id)}
                    disabled={isLoading}
                  >
                    <Feather name="trash-2" size={18} color={palette.green} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Modal visible={Boolean(selectedProduct)} onDismiss={() => setSelectedProduct(null)} contentContainerStyle={adminStyles.modalCard}>
          {selectedProduct ? (
            <>
              <View style={adminStyles.modalHeaderRow}>
                <Text style={adminStyles.modalTitle}>Detalhes do produto</Text>
                <Pressable onPress={() => setSelectedProduct(null)}>
                  <Feather name="x" size={24} color="#6b5553" />
                </Pressable>
              </View>
              <View style={adminStyles.detailTop}>
                <View style={adminStyles.detailImageBox}>
                  {selectedProduct.imageUrl ? (
                    <Image source={{ uri: selectedProduct.imageUrl }} style={adminStyles.detailImage} />
                  ) : (
                    <AppSvgIcon Icon={svgIcons.AdminProductsIcon} size={46} color={palette.green} />
                  )}
                </View>
                <View style={adminStyles.flexFill}>
                  <Text style={adminStyles.detailName}>{selectedProduct.name}</Text>
                  <Text style={adminStyles.detailSku}>{selectedProduct.sku}</Text>
                  <Text style={adminStyles.softBadge}>{selectedProduct.categoryName}</Text>
                </View>
              </View>
              <View style={adminStyles.detailStatRow}>
                <DetailStat label="Preço" value={formatCurrency(selectedProduct.priceInCents)} accent />
                <DetailStat label="Estoque" value={String(selectedProduct.stockQuantity)} />
                <DetailStat label="Unidade" value={selectedProduct.unitLabel} />
              </View>
              <Text style={adminStyles.detailSection}>DESCRIÇÃO</Text>
              <Text style={adminStyles.detailDescription}>{selectedProduct.description}</Text>
              <Button
                mode="contained"
                buttonColor={palette.green}
                textColor="#fff"
                icon="pencil-outline"
                contentStyle={adminStyles.modalPrimaryAction}
                onPress={() => {
                  setEditingProduct({
                    id: selectedProduct.id,
                    categoryId: selectedProduct.categoryId,
                    name: selectedProduct.name,
                    sku: selectedProduct.sku,
                    description: selectedProduct.description,
                    price: (selectedProduct.priceInCents / 100).toFixed(2).replace(".", ","),
                    stock: String(selectedProduct.stockQuantity),
                    unitLabel: selectedProduct.unitLabel,
                    imageUrl: selectedProduct.imageUrl ?? "",
                  });
                  setSelectedProduct(null);
                }}
              >
                Editar produto
              </Button>
            </>
          ) : null}
        </Modal>

        <Modal visible={Boolean(editingProduct)} onDismiss={() => setEditingProduct(null)} contentContainerStyle={adminStyles.modalCard}>
          {editingProduct ? (
            <AdminProductFormModal
              form={editingProduct}
              categories={categories}
              loading={isLoading}
              onChange={setEditingProduct}
              onCancel={() => setEditingProduct(null)}
              onSave={async () => {
                await saveProduct(editingProduct);
                if (!useAppStore.getState().errorMessage) {
                  setEditingProduct(null);
                }
              }}
            />
          ) : null}
        </Modal>
      </Portal>
    </>
  );
}

function AdminCouriersScreen() {
  const couriers = useAdminStore((state) => state.couriers);
  const saveCourier = useAdminStore((state) => state.saveCourier);
  const deleteCourier = useAdminStore((state) => state.deleteCourier);
  const isLoading = useAdminStore((state) => state.isLoading);
  const [editingCourier, setEditingCourier] = useState<AdminCourierForm | null>(null);

  return (
    <>
      <ScrollView contentContainerStyle={adminStyles.content}>
        <AdminHero
          icon={svgIcons.AdminCouriersIcon}
          title="Entregadores"
          subtitle="Equipe de entregas"
        />

        <View style={adminStyles.listToolbar}>
          <Text style={adminStyles.listCount}>{couriers.length} entregadores</Text>
          <Pressable
            style={adminStyles.primaryPillAction}
            onPress={() =>
              setEditingCourier({
                avatarUrl: "",
                fullName: "",
                phone: "",
                contactEmail: "",
                vehicleType: "Moto",
                vehiclePlate: "",
                status: "AVAILABLE",
              })
            }
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={adminStyles.primaryPillActionText}>Novo</Text>
          </Pressable>
        </View>

        <View style={adminStyles.listColumn}>
          {couriers.map((courier) => (
            <View key={courier.id} style={adminStyles.courierCard}>
              <View style={adminStyles.courierTopRow}>
                <View style={adminStyles.courierAvatarBox}>
                  {courier.avatarUrl ? (
                    <Image source={{ uri: courier.avatarUrl }} style={adminStyles.courierAvatarImage} />
                  ) : (
                    <Text style={adminStyles.courierAvatarFallback}>{courier.fullName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={adminStyles.flexFill}>
                  <View style={adminStyles.courierNameRow}>
                    <Text style={adminStyles.courierName}>{courier.fullName}</Text>
                    <StatusPill status={courier.status} />
                  </View>
                  <Text style={adminStyles.courierMeta}>{courier.phone || "Telefone não informado"}</Text>
                  <Text style={adminStyles.courierMeta}>
                    ★ {(courier.rating ?? 4.8).toFixed(1)}   {courier.deliveriesCount} entregas   •   {courier.vehicleType ?? "Veículo"}
                  </Text>
                </View>
              </View>

              <View style={adminStyles.cardActionRow}>
                <Button
                  mode="contained-tonal"
                  buttonColor="#f8efef"
                  textColor="#2f1d1e"
                  style={adminStyles.editActionButton}
                  icon="pencil-outline"
                  onPress={() =>
                    setEditingCourier({
                      id: courier.id,
                      avatarUrl: courier.avatarUrl ?? "",
                      fullName: courier.fullName,
                      phone: courier.phone ?? "",
                      contactEmail: courier.contactEmail ?? "",
                      vehicleType: courier.vehicleType ?? "Moto",
                      vehiclePlate: courier.vehiclePlate ?? "",
                      status: courier.isActive ? "AVAILABLE" : "INACTIVE",
                    })
                  }
                >
                  Editar
                </Button>
                <Pressable
                  style={adminStyles.deleteCircle}
                  onPress={() => void deleteCourier(courier.id)}
                  disabled={isLoading}
                >
                  <Feather name="trash-2" size={18} color={palette.green} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Modal visible={Boolean(editingCourier)} onDismiss={() => setEditingCourier(null)} contentContainerStyle={adminStyles.modalCard}>
          {editingCourier ? (
            <AdminCourierFormModal
              form={editingCourier}
              loading={isLoading}
              onChange={setEditingCourier}
              onCancel={() => setEditingCourier(null)}
              onSave={async () => {
                await saveCourier(editingCourier);
                if (!useAppStore.getState().errorMessage) {
                  setEditingCourier(null);
                }
              }}
            />
          ) : null}
        </Modal>
      </Portal>
    </>
  );
}

function AdminOrdersScreen() {
  const orders = useAdminStore((state) => state.orders);
  const couriers = useAdminStore((state) => state.couriers);
  const approveOrder = useAdminStore((state) => state.approveOrder);
  const rejectOrder = useAdminStore((state) => state.rejectOrder);
  const advanceOrder = useAdminStore((state) => state.advanceOrder);
  const isLoading = useAdminStore((state) => state.isLoading);
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");

  const filteredOrders = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((order) => order.status === filter)),
    [filter, orders],
  );

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedCourierId("");
      return;
    }

    setSelectedCourierId(selectedOrder.assignedCourierId ?? couriers[0]?.id ?? "");
  }, [couriers, selectedOrder]);

  return (
    <>
      <ScrollView contentContainerStyle={adminStyles.content}>
        <AdminHero
          icon={svgIcons.AdminOrdersIcon}
          title="Pedidos"
          subtitle="Acompanhe os pedidos"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={adminStyles.chipRow}>
          {Object.entries(orderFilterLabels).map(([key, label]) => {
            const active = key === filter;
            return (
              <Pressable
                key={key}
                style={[adminStyles.filterChip, active && adminStyles.filterChipActive]}
                onPress={() => setFilter(key as OrderFilter)}
              >
                <Text style={[adminStyles.filterChipText, active && adminStyles.filterChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={adminStyles.listColumn}>
          {filteredOrders.map((order) => (
            <Pressable key={order.rawOrderId} style={adminStyles.orderCard} onPress={() => setSelectedOrder(order)}>
              <View style={adminStyles.orderHeaderRow}>
                <View>
                  <Text style={adminStyles.orderTitle}>Pedido {order.id}</Text>
                  <Text style={adminStyles.orderSubtitle}>{order.customerName} • {order.items.length} itens</Text>
                </View>
                <OrderStatusPill status={order.status} />
              </View>

              <View style={adminStyles.orderFooterRow}>
                <Text style={adminStyles.orderMeta}>◷ {formatDateTime(order.placedAt)}</Text>
                <Text style={adminStyles.orderTotal}>{formatCurrency(order.totalInCents)}</Text>
              </View>

              {order.status === "PLACED" ? (
                <View style={adminStyles.orderActionRow}>
                  <Button
                    mode="contained"
                    buttonColor="#22a447"
                    textColor="#fff"
                    style={adminStyles.orderPrimaryAction}
                    icon="check"
                    onPress={() => void approveOrder(order.rawOrderId)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    mode="outlined"
                    textColor={palette.green}
                    style={adminStyles.orderSecondaryAction}
                    icon="close"
                    onPress={() => void rejectOrder(order.rawOrderId)}
                  >
                    Recusar
                  </Button>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Modal visible={Boolean(selectedOrder)} onDismiss={() => setSelectedOrder(null)} contentContainerStyle={[adminStyles.modalCard, adminStyles.orderModalCard]}>
          {selectedOrder ? (
            <>
              <View style={adminStyles.modalHeaderRow}>
                <Text style={adminStyles.modalTitle}>Pedido {selectedOrder.id}</Text>
                <View style={adminStyles.modalHeaderRight}>
                  <OrderStatusPill status={selectedOrder.status} />
                  <Pressable onPress={() => setSelectedOrder(null)}>
                    <Feather name="x" size={24} color="#6b5553" />
                  </Pressable>
                </View>
              </View>

              <View style={adminStyles.orderInfoGrid}>
                <InfoCard icon="user" label="Cliente" value={selectedOrder.customerName} />
                <InfoCard icon="phone" label="Telefone" value={selectedOrder.customerPhone || "Não informado"} />
                <InfoCard icon="map-pin" label="Endereço" value={selectedOrder.addressLine || "Retirada no local"} subtitle={selectedOrder.addressLocation} />
                <InfoCard icon="credit-card" label="Pagamento" value={paymentLabel(selectedOrder.paymentMethod)} />
              </View>

              <Text style={adminStyles.sectionLabel}>ITENS DO PEDIDO</Text>
              <View style={adminStyles.orderItemsCard}>
                {selectedOrder.items.map((item) => (
                  <View key={`${selectedOrder.rawOrderId}-${item.productName}`} style={adminStyles.orderItemRow}>
                    <View>
                      <Text style={adminStyles.orderItemName}>{item.productName}</Text>
                      <Text style={adminStyles.orderItemMeta}>
                        {item.quantity} × {formatCurrency(item.unitPriceInCents)}
                      </Text>
                    </View>
                    <Text style={adminStyles.orderItemTotal}>{formatCurrency(item.totalInCents)}</Text>
                  </View>
                ))}
                <View style={adminStyles.orderTotalRow}>
                  <Text style={adminStyles.orderTotalLabel}>Total</Text>
                  <Text style={adminStyles.orderTotalFinal}>{formatCurrency(selectedOrder.totalInCents)}</Text>
                </View>
              </View>

              {selectedOrder.status === "PROCESSING" ? (
                <>
                  <Text style={adminStyles.sectionLabel}>ENTREGADOR</Text>
                  <View style={adminStyles.courierPicker}>
                    {couriers.map((courier) => {
                      const active = courier.id === selectedCourierId;
                      return (
                        <Pressable
                          key={courier.id}
                          style={[adminStyles.courierOption, active && adminStyles.courierOptionActive]}
                          onPress={() => setSelectedCourierId(courier.id)}
                        >
                          <Text style={adminStyles.courierOptionTitle}>{courier.fullName}</Text>
                          <Text style={adminStyles.courierOptionMeta}>{courier.vehicleType ?? "Veículo"} • {courier.phone ?? "Sem telefone"}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <View style={adminStyles.modalActionRow}>
                {selectedOrder.status === "PLACED" ? (
                  <>
                    <Button
                      mode="contained"
                      buttonColor="#22a447"
                      textColor="#fff"
                      style={adminStyles.modalApproveButton}
                      icon="check"
                      loading={isLoading}
                      onPress={async () => {
                        await approveOrder(selectedOrder.rawOrderId);
                        if (!useAppStore.getState().errorMessage) {
                          setSelectedOrder(null);
                        }
                      }}
                    >
                      Aprovar
                    </Button>
                    <Button
                      mode="outlined"
                      textColor={palette.green}
                      style={adminStyles.modalRejectButton}
                      icon="close"
                      loading={isLoading}
                      onPress={async () => {
                        await rejectOrder(selectedOrder.rawOrderId);
                        if (!useAppStore.getState().errorMessage) {
                          setSelectedOrder(null);
                        }
                      }}
                    >
                      Recusar
                    </Button>
                  </>
                ) : selectedOrder.status === "PROCESSING" ? (
                  <Button
                    mode="contained"
                    buttonColor={palette.green}
                    textColor="#fff"
                    style={adminStyles.fullWidthAction}
                    contentStyle={adminStyles.fullWidthActionContent}
                    icon="arrow-right"
                    loading={isLoading}
                    disabled={!selectedCourierId}
                    onPress={async () => {
                      await advanceOrder(selectedOrder.rawOrderId, selectedCourierId);
                      if (!useAppStore.getState().errorMessage) {
                        setSelectedOrder(null);
                      }
                    }}
                  >
                    Próximo status: Saiu para entrega
                  </Button>
                ) : null}
              </View>
            </>
          ) : null}
        </Modal>
      </Portal>
    </>
  );
}

function AdminProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const signOut = useAppStore((state) => state.signOut);
  const products = useAdminStore((state) => state.products);
  const orders = useAdminStore((state) => state.orders);
  const couriers = useAdminStore((state) => state.couriers);
  const [showHint, setShowHint] = useState(false);

  return (
    <ScrollView contentContainerStyle={adminStyles.content}>
      <AdminHero
        icon={svgIcons.ProfileIcon}
        title="Meu Perfil"
        subtitle="Suas informações"
      />

      <View style={adminStyles.profileCard}>
        <View style={adminStyles.profileAvatar}>
          <Text style={adminStyles.profileAvatarText}>{getInitials(profile?.fullName)}</Text>
        </View>
        <Text style={adminStyles.profileName}>{profile?.fullName ?? "Administrador"}</Text>
        <Text style={adminStyles.profileRole}>Administradora Geral</Text>
        <Button
          mode="contained"
          buttonColor={palette.green}
          textColor="#fff"
          icon="pencil-outline"
          style={adminStyles.profileButton}
          onPress={() => setShowHint((current) => !current)}
        >
          Editar perfil
        </Button>
        {showHint ? (
          <Text style={adminStyles.profileHint}>
            A edição completa do perfil administrativo fica para a próxima etapa. Por enquanto deixei a visualização estruturada.
          </Text>
        ) : null}
      </View>

      <View style={adminStyles.statsRow}>
        <StatCard value={String(products.length)} label="Produtos" />
        <StatCard value={orders.length.toLocaleString("pt-BR")} label="Pedidos" />
        <StatCard value={String(couriers.length)} label="Entreg." />
      </View>

      <View style={adminStyles.infoSection}>
        <Text style={adminStyles.sectionTitleDark}>Informações pessoais</Text>
        <ProfileInfoItem icon="mail" label="E-mail" value={profile?.contactEmail || profile?.email || "Não informado"} />
        <ProfileInfoItem icon="phone" label="Telefone" value={profile?.phone || "Não informado"} />
        <ProfileInfoItem icon="map-pin" label="Localização" value="São Paulo, SP" />
        <ProfileInfoItem icon="calendar" label="Membro desde" value={profile?.createdAt ? formatDate(profile.createdAt) : "—"} />
      </View>

      <View style={adminStyles.securitySection}>
        <Text style={adminStyles.sectionTitleDark}>Segurança</Text>
        <Text style={adminStyles.sectionSubtitle}>Mantenha sua conta protegida</Text>
        <View style={adminStyles.securityButton}><Text style={adminStyles.securityButtonText}>Alterar senha</Text></View>
        <View style={adminStyles.securityButton}><Text style={adminStyles.securityButtonText}>Autenticação em duas etapas</Text></View>
        <Pressable style={adminStyles.securityButton} onPress={() => void signOut()}>
          <Text style={adminStyles.securityButtonDanger}>Sair da conta</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function AdminBottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
}) {
  return (
    <View style={adminStyles.bottomTabs}>
      {adminTabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={adminStyles.bottomTabButton} onPress={() => onChange(tab.key)}>
            <AppSvgIcon Icon={tab.icon} size={24} color={active ? palette.green : "#ae8f8b"} />
            <Text style={[adminStyles.bottomTabLabel, active && adminStyles.bottomTabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AdminHero({
  icon,
  title,
  subtitle,
}: {
  icon: SvgIconComponent;
  title: string;
  subtitle: string;
}) {
  const profile = useAppStore((state) => state.profile);
  const firstName = profile?.fullName?.split(" ")[0] ?? "Marina";

  return (
    <View style={adminStyles.heroCard}>
      <View style={adminStyles.heroTop}>
        <View style={adminStyles.heroBrand}>
          <View style={adminStyles.heroBrandIcon}>
            <AppSvgIcon Icon={icon} size={26} color="#fff" />
          </View>
          <View>
            <Text style={adminStyles.heroBrandTitle}>FreshAdmin</Text>
            <Text style={adminStyles.heroGreeting}>Olá, {firstName} 👋</Text>
          </View>
        </View>
        <View style={adminStyles.heroNotification}>
          <Feather name="bell" size={20} color="#fff" />
          <View style={adminStyles.heroNotificationDot} />
        </View>
      </View>
      <Text style={adminStyles.heroTitle}>{title}</Text>
      <Text style={adminStyles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

function AdminProductFormModal({
  form,
  categories,
  loading,
  onChange,
  onCancel,
  onSave,
}: {
  form: AdminProductForm;
  categories: Array<{ id: string; name: string }>;
  loading: boolean;
  onChange: (value: AdminProductForm) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <View style={adminStyles.modalHeaderRow}>
        <Text style={adminStyles.modalTitle}>{form.id ? "Editar produto" : "Novo produto"}</Text>
        <Pressable onPress={onCancel}>
          <Feather name="x" size={24} color="#6b5553" />
        </Pressable>
      </View>
      <View style={adminStyles.productFormRow}>
        <View style={adminStyles.imageField}>
          <Text style={adminStyles.fieldLabel}>Imagem</Text>
          <View style={adminStyles.imageFieldPreview}>
            {form.imageUrl ? (
              <Image source={{ uri: form.imageUrl }} style={adminStyles.imageFieldPreviewImage} />
            ) : (
              <AppSvgIcon Icon={svgIcons.AdminProductsIcon} size={24} color="#9b7b78" />
            )}
          </View>
        </View>
        <View style={adminStyles.flexFill}>
          <AdminField label="URL da imagem" value={form.imageUrl} onChangeText={(value) => onChange({ ...form, imageUrl: value })} />
        </View>
      </View>
      <AdminField label="Nome" value={form.name} onChangeText={(value) => onChange({ ...form, name: value })} />
      <Text style={adminStyles.fieldLabel}>Categoria</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={adminStyles.modalChipRow}>
        {categories.map((category) => {
          const active = category.id === form.categoryId;
          return (
            <Pressable
              key={category.id}
              style={[adminStyles.modalChip, active && adminStyles.modalChipActive]}
              onPress={() => onChange({ ...form, categoryId: category.id })}
            >
              <Text style={[adminStyles.modalChipText, active && adminStyles.modalChipTextActive]}>{category.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={adminStyles.formSplitRow}>
        <View style={adminStyles.flexFill}>
          <AdminField label="SKU" value={form.sku} onChangeText={(value) => onChange({ ...form, sku: value.toUpperCase() })} />
        </View>
      </View>
      <View style={adminStyles.formTripleRow}>
        <View style={adminStyles.flexFill}>
          <AdminField label="Preço (R$)" value={form.price} keyboardType="decimal-pad" onChangeText={(value) => onChange({ ...form, price: value })} />
        </View>
        <View style={adminStyles.flexFill}>
          <AdminField label="Estoque" value={form.stock} keyboardType="number-pad" onChangeText={(value) => onChange({ ...form, stock: value })} />
        </View>
        <View style={adminStyles.unitField}>
          <AdminField label="Unidade" value={form.unitLabel} onChangeText={(value) => onChange({ ...form, unitLabel: value })} />
        </View>
      </View>
      <AdminField
        label="Descrição"
        value={form.description}
        multiline
        numberOfLines={4}
        inputStyle={adminStyles.textArea}
        onChangeText={(value) => onChange({ ...form, description: value })}
      />
      <View style={adminStyles.modalFooterActions}>
        <Button mode="outlined" textColor="#4b3431" style={adminStyles.modalGhostButton} onPress={onCancel}>
          Cancelar
        </Button>
        <Button mode="contained" buttonColor={palette.green} textColor="#fff" style={adminStyles.modalSaveButton} loading={loading} onPress={onSave}>
          Salvar
        </Button>
      </View>
    </>
  );
}

function AdminCourierFormModal({
  form,
  loading,
  onChange,
  onCancel,
  onSave,
}: {
  form: AdminCourierForm;
  loading: boolean;
  onChange: (value: AdminCourierForm) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <View style={adminStyles.modalHeaderRow}>
        <Text style={adminStyles.modalTitle}>{form.id ? "Editar entregador" : "Novo entregador"}</Text>
        <Pressable onPress={onCancel}>
          <Feather name="x" size={24} color="#6b5553" />
        </Pressable>
      </View>
      <Text style={adminStyles.helperText}>
        {form.id ? "Atualize os dados operacionais do entregador." : "Informe o e-mail de uma conta já cadastrada no app para promovê-la a entregador."}
      </Text>
      <View style={adminStyles.productFormRow}>
        <View style={adminStyles.imageField}>
          <Text style={adminStyles.fieldLabel}>Avatar</Text>
          <View style={adminStyles.imageFieldPreview}>
            {form.avatarUrl ? (
              <Image source={{ uri: form.avatarUrl }} style={adminStyles.imageFieldPreviewImage} />
            ) : (
              <Text style={adminStyles.avatarEmoji}>🧑</Text>
            )}
          </View>
        </View>
        <View style={adminStyles.flexFill}>
          <AdminField label="URL do avatar" value={form.avatarUrl} onChangeText={(value) => onChange({ ...form, avatarUrl: value })} />
        </View>
      </View>
      <AdminField label="Nome" value={form.fullName} onChangeText={(value) => onChange({ ...form, fullName: value })} />
      <View style={adminStyles.formSplitRow}>
        <View style={adminStyles.flexFill}>
          <AdminField label="Telefone" value={form.phone} keyboardType="phone-pad" onChangeText={(value) => onChange({ ...form, phone: value })} />
        </View>
        <View style={adminStyles.flexFill}>
          <AdminField label="E-mail" value={form.contactEmail} keyboardType="email-address" onChangeText={(value) => onChange({ ...form, contactEmail: value })} />
        </View>
      </View>
      <View style={adminStyles.formSplitRow}>
        <View style={adminStyles.flexFill}>
          <AdminField label="Veículo" value={form.vehicleType} onChangeText={(value) => onChange({ ...form, vehicleType: value })} />
        </View>
        <View style={adminStyles.flexFill}>
          <AdminField label="Placa" value={form.vehiclePlate} onChangeText={(value) => onChange({ ...form, vehiclePlate: value.toUpperCase() })} />
        </View>
      </View>
      <Text style={adminStyles.fieldLabel}>Status</Text>
      <View style={adminStyles.modalChipRow}>
        {(["AVAILABLE", "INACTIVE"] as const).map((status) => {
          const active = form.status === status;
          return (
            <Pressable
              key={status}
              style={[adminStyles.modalChip, active && adminStyles.modalChipActive]}
              onPress={() => onChange({ ...form, status })}
            >
              <Text style={[adminStyles.modalChipText, active && adminStyles.modalChipTextActive]}>
                {status === "AVAILABLE" ? "Disponível" : "Inativo"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={adminStyles.modalFooterActions}>
        <Button mode="outlined" textColor="#4b3431" style={adminStyles.modalGhostButton} onPress={onCancel}>
          Cancelar
        </Button>
        <Button mode="contained" buttonColor={palette.green} textColor="#fff" style={adminStyles.modalSaveButton} loading={loading} onPress={onSave}>
          Salvar
        </Button>
      </View>
    </>
  );
}

function AdminField({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  numberOfLines,
  inputStyle,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad" | "decimal-pad";
  multiline?: boolean;
  numberOfLines?: number;
  inputStyle?: object;
}) {
  return (
    <View style={adminStyles.fieldBlock}>
      <Text style={adminStyles.fieldLabel}>{label}</Text>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        outlineColor="#eadcdb"
        activeOutlineColor={palette.green}
        textColor="#311f20"
        style={[adminStyles.fieldInput, inputStyle]}
        theme={{ roundness: 16, colors: { background: "#fff" } }}
      />
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: FeatherName;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <View style={adminStyles.infoCard}>
      <View style={adminStyles.infoLabelRow}>
        <Feather name={icon} size={18} color={palette.green} />
        <Text style={adminStyles.infoLabel}>{label}</Text>
      </View>
      <Text style={adminStyles.infoValue}>{value}</Text>
      {subtitle ? <Text style={adminStyles.infoSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function DetailStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={adminStyles.detailStatCard}>
      <Text style={adminStyles.detailStatLabel}>{label}</Text>
      <Text style={[adminStyles.detailStatValue, accent && adminStyles.detailStatValueAccent]}>{value}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: AdminCourier["status"] }) {
  const config =
    status === "DELIVERING"
      ? { text: "Em entrega", backgroundColor: "#fff1dc", color: "#f09b1b" }
      : status === "AVAILABLE"
        ? { text: "Disponível", backgroundColor: "#e8f8eb", color: "#1aa34a" }
        : { text: "Inativo", backgroundColor: "#f5e6e6", color: "#a66c6c" };

  return (
    <View style={[adminStyles.statusPill, { backgroundColor: config.backgroundColor }]}>
      <Text style={[adminStyles.statusPillText, { color: config.color }]}>• {config.text}</Text>
    </View>
  );
}

function OrderStatusPill({ status }: { status: AdminOrder["status"] }) {
  const config =
    status === "PLACED"
      ? { text: "Pendente", backgroundColor: "#fff1dc", color: "#f09b1b" }
      : status === "PROCESSING"
        ? { text: "Em separação", backgroundColor: "#fde1df", color: palette.green }
        : status === "OUT_FOR_DELIVERY"
          ? { text: "Saiu para entrega", backgroundColor: "#fde1df", color: palette.green }
          : status === "DELIVERED"
            ? { text: "Entregue", backgroundColor: "#e8f8eb", color: "#1aa34a" }
            : { text: "Recusado", backgroundColor: "#f5e6e6", color: "#a66c6c" };

  return (
    <View style={[adminStyles.statusPill, { backgroundColor: config.backgroundColor }]}>
      <Text style={[adminStyles.statusPillText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={adminStyles.statCard}>
      <Text style={adminStyles.statValue}>{value}</Text>
      <Text style={adminStyles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileInfoItem({ icon, label, value }: { icon: FeatherName; label: string; value: string }) {
  return (
    <View style={adminStyles.profileInfoItem}>
      <View style={adminStyles.infoLabelRow}>
        <Feather name={icon} size={18} color="#947370" />
        <Text style={adminStyles.profileInfoLabel}>{label}</Text>
      </View>
      <Text style={adminStyles.profileInfoValue}>{value}</Text>
    </View>
  );
}

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    PIX: "PIX",
    CASH: "Dinheiro",
    CARD_ON_DELIVERY: "Cartão na entrega",
    CARD_ONLINE: "Cartão online",
  };

  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function getInitials(name?: string) {
  if (!name) {
    return "AD";
  }

  const [first, second] = name.trim().split(" ");
  return `${first?.[0] ?? ""}${second?.[0] ?? first?.[1] ?? ""}`.toUpperCase();
}

const adminStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fcf8f8",
  },
  content: {
    paddingBottom: 112,
  },
  heroCard: {
    backgroundColor: palette.green,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 34,
    shadowColor: palette.green,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroBrandIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBrandTitle: {
    color: "#ffecec",
    fontSize: 18,
  },
  heroGreeting: {
    color: "#fff",
    fontSize: 18,
  },
  heroNotification: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroNotificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffc44d",
    position: "absolute",
    top: 12,
    right: 12,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 34,
    marginTop: 28,
  },
  heroSubtitle: {
    color: "#ffe3e4",
    fontSize: 17,
    marginTop: 6,
  },
  toolbar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 22,
    marginTop: 24,
    alignItems: "center",
  },
  searchCard: {
    flex: 1,
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0dddd",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent",
  },
  squareAction: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    paddingHorizontal: 22,
    gap: 10,
    paddingTop: 18,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#efdddd",
  },
  filterChipActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  filterChipText: {
    color: "#402d2d",
    fontSize: 16,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  grid: {
    paddingHorizontal: 22,
    paddingTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  productCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 14,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  productPreview: {
    height: 180,
    borderRadius: 22,
    backgroundColor: "#f8f2f2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productPreviewImage: {
    width: "100%",
    height: "100%",
  },
  productMeta: {
    marginTop: 14,
  },
  softBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fbf1f1",
    color: "#6f5755",
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  productTitle: {
    fontSize: 18,
    color: "#2f1d1e",
    marginTop: 8,
  },
  productPrice: {
    fontSize: 22,
    color: palette.green,
    marginTop: 8,
  },
  productUnit: {
    fontSize: 14,
    color: "#7a5f5e",
    marginTop: 2,
  },
  productActions: {
    marginTop: 12,
    gap: 12,
  },
  stockBadge: {
    alignSelf: "flex-end",
    backgroundColor: "#def5e4",
    color: "#19a34a",
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  productActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editActionButton: {
    flex: 1,
    borderRadius: 18,
  },
  deleteCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffe9e9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 28,
    color: "#2d1b1c",
  },
  detailTop: {
    flexDirection: "row",
    gap: 16,
    marginTop: 22,
    alignItems: "center",
  },
  detailImageBox: {
    width: 102,
    height: 102,
    borderRadius: 22,
    backgroundColor: "#f8f2f2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  detailImage: {
    width: "100%",
    height: "100%",
  },
  flexFill: {
    flex: 1,
  },
  detailName: {
    fontSize: 22,
    color: "#2d1b1c",
  },
  detailSku: {
    fontSize: 16,
    color: "#8b7270",
    marginTop: 2,
  },
  detailStatRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  detailStatCard: {
    flex: 1,
    backgroundColor: "#f8f2f2",
    borderRadius: 18,
    padding: 16,
  },
  detailStatLabel: {
    color: "#8b7270",
    fontSize: 16,
  },
  detailStatValue: {
    color: "#2d1b1c",
    fontSize: 18,
    marginTop: 8,
  },
  detailStatValueAccent: {
    color: palette.green,
  },
  detailSection: {
    color: "#8b7270",
    fontSize: 16,
    marginTop: 24,
  },
  detailDescription: {
    color: "#342324",
    fontSize: 17,
    lineHeight: 28,
    marginTop: 12,
    marginBottom: 24,
  },
  modalPrimaryAction: {
    height: 54,
  },
  productFormRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 16,
    alignItems: "flex-end",
  },
  imageField: {
    width: 110,
  },
  imageFieldPreview: {
    height: 84,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eadcdb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  imageFieldPreviewImage: {
    width: "100%",
    height: "100%",
  },
  fieldBlock: {
    marginTop: 16,
  },
  fieldLabel: {
    color: "#6f5755",
    fontSize: 15,
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: "#fff",
  },
  modalChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#efdddd",
  },
  modalChipActive: {
    backgroundColor: "#fde1df",
    borderColor: palette.green,
  },
  modalChipText: {
    color: "#4a3534",
  },
  modalChipTextActive: {
    color: palette.green,
  },
  formSplitRow: {
    flexDirection: "row",
    gap: 14,
  },
  formTripleRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-end",
  },
  unitField: {
    width: 108,
  },
  textArea: {
    minHeight: 120,
  },
  modalFooterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 22,
  },
  modalGhostButton: {
    borderColor: "#eadcdb",
    borderRadius: 16,
  },
  modalSaveButton: {
    borderRadius: 16,
  },
  listToolbar: {
    paddingHorizontal: 22,
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listCount: {
    color: "#6f5755",
    fontSize: 17,
  },
  primaryPillAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: palette.green,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
  },
  primaryPillActionText: {
    color: "#fff",
    fontSize: 18,
  },
  listColumn: {
    paddingHorizontal: 22,
    paddingTop: 18,
    gap: 18,
  },
  courierCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 18,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  courierTopRow: {
    flexDirection: "row",
    gap: 14,
  },
  courierAvatarBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  courierAvatarImage: {
    width: "100%",
    height: "100%",
  },
  courierAvatarFallback: {
    color: "#fff",
    fontSize: 28,
  },
  courierNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  courierName: {
    color: "#2d1b1c",
    fontSize: 18,
    flex: 1,
  },
  courierMeta: {
    color: "#7d6463",
    fontSize: 15,
    marginTop: 5,
  },
  statusPill: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 13,
  },
  cardActionRow: {
    borderTopWidth: 1,
    borderTopColor: "#f1e3e2",
    marginTop: 16,
    paddingTop: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  helperText: {
    color: "#7d6463",
    fontSize: 14,
    marginTop: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 18,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  orderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  orderTitle: {
    color: "#2d1b1c",
    fontSize: 20,
  },
  orderSubtitle: {
    color: "#7d6463",
    fontSize: 16,
    marginTop: 4,
  },
  orderFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "#f1e3e2",
    marginTop: 14,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderMeta: {
    color: "#7d6463",
    fontSize: 15,
  },
  orderTotal: {
    color: palette.green,
    fontSize: 18,
  },
  orderActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  orderPrimaryAction: {
    flex: 1,
    borderRadius: 16,
  },
  orderSecondaryAction: {
    flex: 1,
    borderRadius: 16,
    borderColor: "#ffb2b6",
  },
  orderModalCard: {
    maxHeight: "92%",
  },
  orderInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#f8f2f2",
    borderRadius: 18,
    padding: 16,
  },
  infoLabelRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  infoLabel: {
    color: "#8b7270",
    fontSize: 16,
  },
  infoValue: {
    color: "#2d1b1c",
    fontSize: 17,
    marginTop: 8,
  },
  infoSubtitle: {
    color: "#7d6463",
    fontSize: 14,
    marginTop: 4,
  },
  sectionLabel: {
    color: "#8b7270",
    fontSize: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  orderItemsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f0e1e1",
    overflow: "hidden",
  },
  orderItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f4e8e8",
  },
  orderItemName: {
    color: "#2d1b1c",
    fontSize: 17,
  },
  orderItemMeta: {
    color: "#7d6463",
    fontSize: 15,
    marginTop: 4,
  },
  orderItemTotal: {
    color: "#2d1b1c",
    fontSize: 17,
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  orderTotalLabel: {
    color: "#2d1b1c",
    fontSize: 18,
  },
  orderTotalFinal: {
    color: palette.green,
    fontSize: 20,
  },
  courierPicker: {
    gap: 10,
  },
  courierOption: {
    borderWidth: 1,
    borderColor: "#efdddd",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
  },
  courierOptionActive: {
    borderColor: palette.green,
    backgroundColor: "#fff5f5",
  },
  courierOptionTitle: {
    color: "#2d1b1c",
    fontSize: 16,
  },
  courierOptionMeta: {
    color: "#7d6463",
    fontSize: 14,
    marginTop: 4,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  modalApproveButton: {
    flex: 1,
    borderRadius: 16,
  },
  modalRejectButton: {
    flex: 1,
    borderRadius: 16,
    borderColor: "#ffb2b6",
  },
  fullWidthAction: {
    flex: 1,
    borderRadius: 18,
  },
  fullWidthActionContent: {
    height: 54,
  },
  profileCard: {
    backgroundColor: "#fff",
    marginHorizontal: 22,
    marginTop: 26,
    borderRadius: 28,
    alignItems: "center",
    padding: 24,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#fff",
    fontSize: 42,
  },
  profileName: {
    color: "#2d1b1c",
    fontSize: 22,
    marginTop: 18,
  },
  profileRole: {
    color: "#8b7270",
    fontSize: 18,
    marginTop: 6,
  },
  profileButton: {
    marginTop: 18,
    borderRadius: 18,
  },
  profileHint: {
    color: "#7d6463",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 22,
    alignItems: "center",
    paddingVertical: 18,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  statValue: {
    color: palette.green,
    fontSize: 20,
  },
  statLabel: {
    color: "#8b7270",
    fontSize: 16,
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: "#fff",
    marginHorizontal: 22,
    marginTop: 18,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionTitleDark: {
    color: "#2d1b1c",
    fontSize: 18,
  },
  profileInfoItem: {
    marginTop: 22,
  },
  profileInfoLabel: {
    color: "#8b7270",
    fontSize: 16,
    textTransform: "uppercase",
  },
  profileInfoValue: {
    color: "#2d1b1c",
    fontSize: 18,
    marginTop: 10,
  },
  securitySection: {
    backgroundColor: "#fff",
    marginHorizontal: 22,
    marginTop: 18,
    marginBottom: 22,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#e4c9c9",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionSubtitle: {
    color: "#8b7270",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 16,
  },
  securityButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#efdddd",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 12,
  },
  securityButtonText: {
    color: "#2d1b1c",
    fontSize: 16,
  },
  securityButtonDanger: {
    color: palette.green,
    fontSize: 16,
  },
  bottomTabs: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    backgroundColor: "#fff",
    borderRadius: 26,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    shadowColor: "#d5baba",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  bottomTabButton: {
    alignItems: "center",
    gap: 6,
  },
  bottomTabLabel: {
    color: "#ae8f8b",
    fontSize: 12,
  },
  bottomTabLabelActive: {
    color: palette.green,
  },
});
