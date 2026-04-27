import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { AppRole, OrderStatus } from "@mercado/shared/domain/models";
import HomeIcon from "../../assets/images/icone-home.svg";
import CartIcon from "../../assets/images/icone-carrinho.svg";
import ProfileIcon from "../../assets/images/icone-perfil.svg";
import ProcessingIcon from "../../assets/images/icone-processamento.svg";
import OutForDeliveryIcon from "../../assets/images/icone-saiu-entrega.svg";
import LogoutIcon from "../../assets/images/icone-sair.svg";
import AdminProductsIcon from "../../assets/images/icone-produtos.svg";
import AdminCouriersIcon from "../../assets/images/icone-entregadores.svg";
import AdminOrdersIcon from "../../assets/images/icone-pedidos.svg";

export type FeatherName = keyof typeof Feather.glyphMap;
export type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;
export type SvgIconComponent = typeof HomeIcon;

export const palette = {
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

export const roleLabels: Record<AppRole, string> = {
  CUSTOMER: "Cliente",
  COURIER: "Entregador",
  ADMIN: "Admin",
  DEVELOPER: "Dev",
};

export const statusLabels: Record<OrderStatus, string> = {
  PLACED: "Pedido realizado",
  PROCESSING: "Em processamento",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  STOCK_ISSUE: "Ajuste de estoque",
};

export const statusTone: Partial<Record<OrderStatus, "success" | "warning" | "danger">> = {
  PROCESSING: "warning",
  OUT_FOR_DELIVERY: "danger",
  DELIVERED: "success",
  CANCELLED: "danger",
  STOCK_ISSUE: "danger",
};

export const logoFullImage = require("../../assets/images/icone-supermercado-completo.png");

export const categoryImages = {
  Todos: require("../../assets/images/icone-todos.png"),
  Bebidas: require("../../assets/images/icone-bebidas.png"),
  "Proteínas": require("../../assets/images/icone-proteinas.png"),
  Frios: require("../../assets/images/icone-frios.png"),
  "Frutas e Verduras": require("../../assets/images/icone-frutas-verduras.png"),
  "Laticínios": require("../../assets/images/icone-laticinios.png"),
} as const;

export type CategoryPillLabel = keyof typeof categoryImages;

export const svgIcons = {
  HomeIcon,
  CartIcon,
  ProfileIcon,
  ProcessingIcon,
  OutForDeliveryIcon,
  LogoutIcon,
  AdminProductsIcon,
  AdminCouriersIcon,
  AdminOrdersIcon,
} as const;
