import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";
import type { AddressRecord } from "@mercado/shared/domain/models";
import { palette, roleLabels, svgIcons, type FeatherName } from "../../app-shell/constants";
import { formatAddressLine, formatAddressLocation, getPrimaryAddress } from "../../app-shell/helpers";
import { styles } from "../../app-shell/styles";
import { AppInput } from "../../components/AppInput";
import {
  PasswordEditorFields,
  ProfileEditorFields,
  type PasswordEditorDraft,
  type ProfileEditorDraft,
} from "../../components/account/AccountForms";
import { AppSvgIcon } from "../../components/AppSvgIcon";
import type { AddressFormData } from "../../services/market-api";
import {
  removeProfileAvatarByUrl,
  uploadProfileAvatar,
  type UploadableProfileAvatar,
} from "../../services/storage-api";
import { useAppStore } from "../../state/app-store";

export function AddressesScreen({ onBack }: { onBack: () => void }) {
  const addresses = useAppStore((state) => state.addresses);
  const isLoading = useAppStore((state) => state.isLoading);
  const createAddress = useAppStore((state) => state.createAddress);
  const updateAddress = useAppStore((state) => state.updateAddress);
  const deleteAddress = useAppStore((state) => state.deleteAddress);
  const markAddressAsLastUsed = useAppStore((state) => state.markAddressAsLastUsed);
  const [editingAddressId, setEditingAddressId] = useState<string>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<AddressFormData>({
    label: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const resetForm = () => {
    setForm({
      label: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    });
    setEditingAddressId(undefined);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingAddressId(undefined);
    setForm({
      label: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    });
    setIsFormOpen(true);
  };

  const openEditForm = (address: AddressRecord) => {
    setEditingAddressId(address.id);
    setForm({
      label: address.label,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    });
    setIsFormOpen(true);
  };

  const updateField = (field: keyof AddressFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.label.trim() || !form.street.trim() || !form.number.trim() || !form.neighborhood.trim() || !form.city.trim() || !form.state.trim() || !form.zipCode.trim()) {
      useAppStore.setState({ errorMessage: "Preencha os campos obrigatórios do endereço." });
      return;
    }

    if (editingAddressId) {
      await updateAddress(editingAddressId, form);
    } else {
      await createAddress(form);
    }

    if (!useAppStore.getState().errorMessage) {
      resetForm();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.checkoutHeader}>
        <Pressable style={styles.backCircle} onPress={onBack}>
          <Feather name="arrow-left" size={22} color={palette.text} />
        </Pressable>
        <Text style={styles.screenTitleCompact}>Endereços</Text>
      </View>

      <Text style={styles.mutedText}>Gerencie seus endereços de entrega e retirada.</Text>

      <Button
        mode="contained"
        buttonColor={palette.green}
        textColor={palette.onAccent}
        style={styles.addressPrimaryButton}
        contentStyle={styles.addressPrimaryButtonContent}
        labelStyle={styles.primaryButtonLabel}
        icon={({ color, size }) => <Feather name="plus" color={color} size={size} />}
        onPress={openCreateForm}
      >
        Adicionar endereço
      </Button>

      {isFormOpen ? (
        <View style={styles.addressEditorCard}>
          <Text style={styles.addressEditorTitle}>
            {editingAddressId ? "Editar endereço" : "Novo endereço"}
          </Text>
          <View style={styles.addressFormGrid}>
            <AppInput
              label="Apelido"
              icon="map-pin"
              value={form.label}
              placeholder="Casa"
              autoCapitalize="words"
              onChangeText={(value) => updateField("label", value)}
            />
            <AppInput
              label="Rua"
              icon="navigation"
              value={form.street}
              placeholder="Rua das Flores"
              autoCapitalize="words"
              onChangeText={(value) => updateField("street", value)}
            />
            <AppInput
              label="Número"
              icon="hash"
              value={form.number}
              placeholder="120"
              onChangeText={(value) => updateField("number", value)}
            />
            <AppInput
              label="Complemento"
              icon="home"
              value={form.complement ?? ""}
              placeholder="Apto 42"
              autoCapitalize="words"
              onChangeText={(value) => updateField("complement", value)}
            />
            <AppInput
              label="Bairro"
              icon="map"
              value={form.neighborhood}
              placeholder="Centro"
              autoCapitalize="words"
              onChangeText={(value) => updateField("neighborhood", value)}
            />
            <AppInput
              label="Cidade"
              icon="map"
              value={form.city}
              placeholder="São Paulo"
              autoCapitalize="words"
              onChangeText={(value) => updateField("city", value)}
            />
            <View style={styles.addressFormRow}>
              <View style={styles.addressFormSmallField}>
                <AppInput
                  label="UF"
                  icon="flag"
                  value={form.state}
                  placeholder="SP"
                  autoCapitalize="characters"
                  onChangeText={(value) => updateField("state", value)}
                />
              </View>
              <View style={styles.flex}>
                <AppInput
                  label="CEP"
                  icon="mail"
                  value={form.zipCode}
                  placeholder="00000-000"
                  keyboardType="number-pad"
                  onChangeText={(value) => updateField("zipCode", value)}
                />
              </View>
            </View>
          </View>

          <View style={styles.addressEditorActions}>
            <Button
              mode="contained-tonal"
              buttonColor={palette.cardSoft}
              textColor={palette.text}
              style={styles.addressSecondaryButton}
              contentStyle={styles.addressSecondaryButtonContent}
              onPress={resetForm}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              loading={isLoading}
              disabled={isLoading}
              buttonColor={palette.green}
              textColor={palette.onAccent}
              style={styles.addressSaveButton}
              contentStyle={styles.addressSecondaryButtonContent}
              onPress={() => void handleSubmit()}
            >
              {editingAddressId ? "Salvar" : "Adicionar"}
            </Button>
          </View>
        </View>
      ) : null}

      <View style={styles.addressList}>
        {addresses.map((address) => {
          const isLastUsed = address.id === getPrimaryAddress(addresses)?.id;

          return (
            <View
              key={address.id}
              style={[
                styles.userAddressCard,
                isLastUsed ? styles.userAddressCardActive : styles.userAddressCardInactive,
              ]}
            >
              <View style={styles.addressCardHeader}>
                <View style={styles.addressCardInfo}>
                  <Text style={styles.addressCardTitle}>{address.label}</Text>
                  <Text style={styles.addressCardText}>{formatAddressLine(address)}</Text>
                  <Text style={styles.addressCardSubtext}>{formatAddressLocation(address)}</Text>
                </View>
                {isLastUsed ? (
                  <View style={styles.lastUsedBadge}>
                    <Text style={styles.lastUsedBadgeText}>Último utilizado</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.addressZipText}>CEP {address.zipCode}</Text>

              <View style={styles.addressActionRow}>
                {!isLastUsed ? (
                  <Button
                    mode="contained-tonal"
                    buttonColor={palette.cardSoft}
                    textColor={palette.text}
                    compact
                    onPress={() => void markAddressAsLastUsed(address.id)}
                  >
                    Usar este
                  </Button>
                ) : null}
                <Button
                  mode="text"
                  compact
                  textColor={palette.text}
                  onPress={() => openEditForm(address)}
                >
                  Editar
                </Button>
                <Button
                  mode="text"
                  compact
                  textColor={palette.danger}
                  onPress={() => void deleteAddress(address.id)}
                >
                  Excluir
                </Button>
              </View>
            </View>
          );
        })}
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="map-pin" size={32} color={palette.green} />
          <Text style={styles.emptyTitle}>Nenhum endereço cadastrado</Text>
          <Text style={styles.emptyText}>Adicione seu primeiro endereço para facilitar o checkout.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function ProfileScreen({ onOpenAddresses }: { onOpenAddresses: () => void }) {
  const profile = useAppStore((state) => state.profile);
  const signOut = useAppStore((state) => state.signOut);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const changePassword = useAppStore((state) => state.changePassword);
  const isLoading = useAppStore((state) => state.isLoading);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileEditorDraft>({
    fullName: "",
    phone: "",
    cpf: "",
    avatarUrl: "",
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
    });
    setPendingAvatar(null);
    setIsProfileModalOpen(true);
  };

  const closeProfileEditor = () => {
    setPendingAvatar(null);
    setIsProfileModalOpen(false);
  };

  const openPasswordEditor = () => {
    setPasswordDraft({
      password: "",
      confirmPassword: "",
    });
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

  return (
    <>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <Text style={styles.screenTitle}>Perfil</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.courierPhoto} />
            ) : (
              <Text style={styles.avatarText}>{profile?.fullName?.charAt(0).toUpperCase() ?? "V"}</Text>
            )}
          </View>
          <View>
            <Text style={styles.profileName}>{profile?.fullName ?? "Cliente Verdejá"}</Text>
            <Text style={styles.profileEmail}>{profile?.phone || "Telefone não informado"}</Text>
            <Text style={styles.profileEmail}>{profile?.cpf || "CPF não informado"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{profile ? roleLabels[profile.role] : "Cliente"}</Text>
            </View>
          </View>
        </View>

        <ProfileAction icon="edit-3" label="Editar perfil" onPress={openProfileEditor} />
        <ProfileAction icon="lock" label="Alterar senha" onPress={openPasswordEditor} />
        <ProfileAction icon="map-pin" label="Endereços" onPress={onOpenAddresses} />
        <ProfileAction icon="credit-card" label="Pagamentos" />
        <ProfileAction icon="bell" label="Notificações" />
        <ProfileAction icon="help-circle" label="Ajuda" />
        <Pressable style={[styles.profileAction, styles.logoutAction]} onPress={() => void signOut()}>
          <View style={[styles.profileActionIcon, styles.logoutIcon]}>
            <AppSvgIcon Icon={svgIcons.LogoutIcon} size={22} color={palette.danger} />
          </View>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </ScrollView>

      <Portal>
        <Modal visible={isProfileModalOpen} onDismiss={closeProfileEditor} contentContainerStyle={styles.accountModalContainer}>
          <View style={styles.accountModalCard}>
          <ScrollView
            style={styles.accountModalScroll}
            contentContainerStyle={styles.accountModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View style={styles.accountModalHeader}>
              <Text style={styles.accountModalTitle}>Editar perfil</Text>
              <Pressable onPress={closeProfileEditor}>
                <Feather name="x" size={24} color={palette.muted} />
              </Pressable>
            </View>
            <Text style={styles.accountModalSubtitle}>
              Atualize ou complemente os dados do seu perfil.
            </Text>
            <ProfileEditorFields
              draft={profileDraft}
              avatarPreviewUri={avatarPreviewUri}
              loading={isLoading}
              onPickAvatar={() => void pickAvatarFromGallery()}
              onRemoveAvatar={removeAvatarSelection}
              onChange={setProfileDraft}
            />
            <View style={styles.accountModalFooter}>
              <Button
                mode="contained-tonal"
                buttonColor={palette.cardSoft}
                textColor={palette.text}
                style={styles.accountModalSecondaryButton}
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
                style={styles.accountModalPrimaryButton}
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

        <Modal visible={isPasswordModalOpen} onDismiss={closePasswordEditor} contentContainerStyle={styles.accountModalContainer}>
          <View style={styles.accountModalCard}>
          <ScrollView
            style={styles.accountModalScroll}
            contentContainerStyle={styles.accountModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View style={styles.accountModalHeader}>
              <Text style={styles.accountModalTitle}>Alterar senha</Text>
              <Pressable onPress={closePasswordEditor}>
                <Feather name="x" size={24} color={palette.muted} />
              </Pressable>
            </View>
            <Text style={styles.accountModalSubtitle}>Defina uma nova senha para a sua conta.</Text>
            <PasswordEditorFields draft={passwordDraft} onChange={setPasswordDraft} />
            <View style={styles.accountModalFooter}>
              <Button
                mode="contained-tonal"
                buttonColor={palette.cardSoft}
                textColor={palette.text}
                style={styles.accountModalSecondaryButton}
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
                style={styles.accountModalPrimaryButton}
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

function ProfileAction({
  icon,
  label,
  active,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.profileAction, active && styles.profileActionActive]} onPress={onPress}>
      <View style={styles.profileActionIcon}>
        <Feather name={icon} size={22} color={palette.muted} />
      </View>
      <Text style={styles.profileActionText}>{label}</Text>
      <Feather name="chevron-right" size={22} color={palette.muted} />
    </Pressable>
  );
}
