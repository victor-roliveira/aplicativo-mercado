import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import type { ProductSummary } from "@mercado/shared/domain/models";
import { categoryImages, logoFullImage, palette, type CategoryPillLabel } from "../../app-shell/constants";
import {
  formatAddressLine,
  formatAddressLocation,
  formatCurrency,
  getCategoryGroup,
  getDiscountPercent,
  getEffectivePrice,
  getPrimaryAddress,
  getProductImage,
} from "../../app-shell/helpers";
import { styles } from "../../app-shell/styles";
import { useAppStore } from "../../state/app-store";

export function HomeScreen({
  onCart,
  onProduct,
}: {
  onCart: () => void;
  onProduct: (productId: string) => void;
}) {
  const addresses = useAppStore((state) => state.addresses);
  const products = useAppStore((state) => state.products);
  const cart = useAppStore((state) => state.cart);
  const isLoading = useAppStore((state) => state.isLoading);
  const addToCart = useAppStore((state) => state.addToCart);
  const markAddressAsLastUsed = useAppStore((state) => state.markAddressAsLastUsed);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const primaryAddress = getPrimaryAddress(addresses);
  const productGroups = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          getCategoryGroup(product.categoryName),
        ]),
      ),
    [products],
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => getCategoryGroup(product.categoryName))));
    return ["Todos", ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "Todos" || productGroups.get(product.id) === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        product.name,
        product.description,
        String(productGroups.get(product.id) ?? product.categoryName),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [productGroups, products, searchQuery, selectedCategory]);

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.homeHeader}>
        <Pressable
          style={styles.homeAddressTrigger}
          onPress={() => setIsAddressSelectorOpen((current) => !current)}
        >
          <Text style={styles.mutedSmall}>Entregar em</Text>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={18} color={palette.green} />
            <Text style={styles.addressText}>
              {primaryAddress ? formatAddressLine(primaryAddress) : "Escolher endereço"}
            </Text>
            <Feather
              name={isAddressSelectorOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={palette.muted}
            />
          </View>
          <Text style={styles.addressCaption}>
            {primaryAddress ? formatAddressLocation(primaryAddress) : "Selecione um endereço cadastrado"}
          </Text>
        </Pressable>
        <Pressable style={styles.notificationButton}>
          <Feather name="bell" size={22} color={palette.text} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>

      {isAddressSelectorOpen ? (
        <View style={styles.homeAddressSelector}>
          {addresses.length > 0 ? (
            addresses.map((address) => {
              const isSelected = address.id === primaryAddress?.id;

              return (
                <Pressable
                  key={address.id}
                  style={[
                    styles.homeAddressOption,
                    isSelected && styles.homeAddressOptionActive,
                  ]}
                  onPress={() => {
                    if (!isSelected) {
                      void markAddressAsLastUsed(address.id);
                    }
                    setIsAddressSelectorOpen(false);
                  }}
                >
                  <View style={styles.homeAddressOptionInfo}>
                    <Text style={styles.homeAddressOptionTitle}>{address.label}</Text>
                    <Text style={styles.homeAddressOptionText}>{formatAddressLine(address)}</Text>
                    <Text style={styles.homeAddressOptionSubtext}>{formatAddressLocation(address)}</Text>
                  </View>
                  {isSelected ? <Feather name="check" size={18} color={palette.green} /> : null}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.homeAddressEmpty}>
              <Text style={styles.homeAddressEmptyTitle}>Nenhum endereço cadastrado</Text>
              <Text style={styles.homeAddressEmptyText}>
                Adicione um endereço no perfil para escolher onde deseja receber.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.searchBox}>
        <Feather name="search" size={23} color={palette.muted} />
        <TextInput
          mode="flat"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar produtos..."
          placeholderTextColor={palette.muted}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          textColor={palette.text}
          style={styles.searchInput}
          contentStyle={styles.searchInputContent}
          theme={{
            colors: {
              background: "transparent",
              surfaceVariant: "transparent",
            },
          }}
        />
      </View>

      <View style={styles.promoCard}>
        <View>
          <Text style={styles.promoKicker}>HOJE</Text>
          <Text style={styles.promoTitle}>20% off em hortifruti</Text>
          <Text style={styles.promoSubtitle}>Use o código FRESCO20</Text>
        </View>
        <Image source={logoFullImage} style={styles.promoBrandImage} resizeMode="contain" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        {categories.map((category) => {
          const selected = category === selectedCategory;
          const categoryImage = categoryImages[category as CategoryPillLabel] ?? categoryImages.Todos;

          return (
            <Pressable
              key={category}
              style={[styles.categoryPill, selected && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Image source={categoryImage} style={styles.categoryPillImage} resizeMode="contain" />
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

export function ProductDetailScreen({
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
