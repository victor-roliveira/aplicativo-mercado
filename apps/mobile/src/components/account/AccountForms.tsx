import { Image, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { palette } from "../../app-shell/constants";
import { styles } from "../../app-shell/styles";
import { AppInput } from "../AppInput";

export type ProfileEditorDraft = {
  fullName: string;
  phone: string;
  cpf: string;
  avatarUrl: string;
  vehicleType?: string;
  vehiclePlate?: string;
  driverLicense?: string;
};

export type PasswordEditorDraft = {
  password: string;
  confirmPassword: string;
};

export function ProfileEditorFields({
  draft,
  avatarPreviewUri,
  loading,
  showCourierFields,
  onPickAvatar,
  onRemoveAvatar,
  onChange,
}: {
  draft: ProfileEditorDraft;
  avatarPreviewUri?: string;
  loading?: boolean;
  showCourierFields?: boolean;
  onPickAvatar: () => void;
  onRemoveAvatar: () => void;
  onChange: (draft: ProfileEditorDraft) => void;
}) {
  return (
    <View style={styles.accountFormStack}>
      <View style={styles.accountAvatarCard}>
        <View style={styles.accountAvatarRow}>
          <View style={styles.accountAvatarPreview}>
            {avatarPreviewUri ? (
              <Image source={{ uri: avatarPreviewUri }} style={styles.accountAvatarPreviewImage} />
            ) : (
              <Text style={styles.accountAvatarFallback}>Sem foto</Text>
            )}
          </View>
          <View style={styles.accountAvatarActions}>
            <Text style={styles.accountAvatarTitle}>Foto de perfil</Text>
            <View style={styles.accountAvatarButtons}>
              <Button
                mode="contained"
                buttonColor={palette.green}
                textColor={palette.onAccent}
                style={styles.accountAvatarButton}
                compact
                disabled={loading}
                onPress={onPickAvatar}
              >
                Escolher foto
              </Button>
              {avatarPreviewUri ? (
                <Button
                  mode="text"
                  compact
                  textColor="#ff5b66"
                  disabled={loading}
                  onPress={onRemoveAvatar}
                >
                  Remover
                </Button>
              ) : null}
            </View>
          </View>
        </View>
        <Text style={styles.accountAvatarHint}>
          A foto será enviada ao storage quando você salvar o perfil.
        </Text>
      </View>
      <AppInput
        label="Nome completo"
        icon="user"
        value={draft.fullName}
        placeholder="Maria Silva"
        autoCapitalize="words"
        onChangeText={(value) => onChange({ ...draft, fullName: value })}
      />
      <AppInput
        label="Telefone"
        icon="phone"
        value={draft.phone}
        placeholder="(11) 99999-0000"
        keyboardType="phone-pad"
        onChangeText={(value) => onChange({ ...draft, phone: value })}
      />
      <AppInput
        label="CPF"
        icon="credit-card"
        value={draft.cpf}
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        onChangeText={(value) => onChange({ ...draft, cpf: value })}
      />
      {showCourierFields ? (
        <>
          <AppInput
            label="Veiculo"
            icon="truck"
            value={draft.vehicleType ?? ""}
            placeholder="Honda CG 160 Start"
            autoCapitalize="words"
            onChangeText={(value) => onChange({ ...draft, vehicleType: value })}
          />
          <AppInput
            label="Placa"
            icon="hash"
            value={draft.vehiclePlate ?? ""}
            placeholder="BRA-2E19"
            autoCapitalize="characters"
            onChangeText={(value) => onChange({ ...draft, vehiclePlate: value })}
          />
          <AppInput
            label="CNH"
            icon="file-text"
            value={draft.driverLicense ?? ""}
            placeholder="0123456789"
            keyboardType="number-pad"
            onChangeText={(value) => onChange({ ...draft, driverLicense: value })}
          />
        </>
      ) : null}
      <Text style={styles.accountHelperText}>
        {showCourierFields
          ? "Nome e telefone seguem como base do perfil. O telefone tambem continua sendo usado no codigo de entrega."
          : "Nome e telefone sao os dados principais do perfil. O telefone continua sendo usado no codigo de entrega."}
      </Text>
    </View>
  );
}

export function PasswordEditorFields({
  draft,
  onChange,
}: {
  draft: PasswordEditorDraft;
  onChange: (draft: PasswordEditorDraft) => void;
}) {
  return (
    <View style={styles.accountFormStack}>
      <AppInput
        label="Nova senha"
        icon="lock"
        value={draft.password}
        placeholder="Minimo de 8 caracteres"
        secureTextEntry
        onChangeText={(value) => onChange({ ...draft, password: value })}
      />
      <AppInput
        label="Confirmar nova senha"
        icon="shield"
        value={draft.confirmPassword}
        placeholder="Repita a nova senha"
        secureTextEntry
        onChangeText={(value) => onChange({ ...draft, confirmPassword: value })}
      />
      <Text style={styles.accountHelperText}>
        Use uma senha forte com pelo menos 8 caracteres.
      </Text>
    </View>
  );
}
