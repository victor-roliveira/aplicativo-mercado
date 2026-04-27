import type { AddressRecord, ProductSummary } from "@mercado/shared/domain/models";
import type { CategoryPillLabel } from "./constants";

export function getCategoryGroup(categoryName: string): CategoryPillLabel | string {
  const normalized = categoryName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (
    normalized.includes("hortifruti") ||
    normalized.includes("fruta") ||
    normalized.includes("verdura") ||
    normalized.includes("legume") ||
    normalized.includes("mercearia")
  ) {
    return "Frutas e Verduras";
  }

  if (
    normalized.includes("carne") ||
    normalized.includes("frango") ||
    normalized.includes("peixe") ||
    normalized.includes("fruto do mar") ||
    normalized.includes("frutos do mar") ||
    normalized.includes("proteina")
  ) {
    return "Proteínas";
  }

  if (
    normalized.includes("frios") ||
    normalized.includes("presunto") ||
    normalized.includes("salame") ||
    normalized.includes("embutido") ||
    normalized.includes("queijo")
  ) {
    return "Frios";
  }

  if (
    normalized.includes("leite") ||
    normalized.includes("iogurte") ||
    normalized.includes("manteiga") ||
    normalized.includes("laticinio")
  ) {
    return "Laticínios";
  }

  if (normalized.includes("bebida") || normalized.includes("suco") || normalized.includes("agua")) {
    return "Bebidas";
  }

  return categoryName;
}

export function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function getDiscountPercent(product: ProductSummary) {
  if (!product.discountInCents || product.priceInCents <= 0) {
    return 0;
  }

  return Math.round((product.discountInCents / product.priceInCents) * 100);
}

export function getProductImage(product?: ProductSummary) {
  return product?.imageUrl ?? "https://images.unsplash.com/photo-1542838132-92c53300491e";
}

export function getEffectivePrice(product: ProductSummary) {
  return product.priceInCents - product.discountInCents;
}

export function getPrimaryAddress(addresses: AddressRecord[]) {
  return addresses[0];
}

export function formatAddressLine(address?: AddressRecord | null) {
  if (!address) {
    return "Cadastre um endereço para receber em casa.";
  }

  const complement = address.complement?.trim() ? ` - ${address.complement.trim()}` : "";
  return `${address.street}, ${address.number}${complement}`;
}

export function formatAddressLocation(address?: AddressRecord | null) {
  if (!address) {
    return "Você pode adicionar e editar endereços no seu perfil.";
  }

  return `${address.neighborhood} - ${address.city}/${address.state}`;
}

export function formatOrderTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
