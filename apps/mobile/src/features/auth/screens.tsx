import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { palette, type FeatherName } from "../../app-shell/constants";
import type { PublicScreen, RegistrationKind } from "../../app-shell/navigation-types";
import { styles } from "../../app-shell/styles";
import { AppInput } from "../../components/AppInput";
import { Logo } from "../../components/Logo";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAppStore } from "../../state/app-store";

export function LandingScreen({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.publicContent}>
      <View style={styles.landingTop}>
        <Logo />
        <Pressable onPress={onLogin}>
          <Text style={styles.loginLink}>Entrar</Text>
        </Pressable>
      </View>

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

export function AuthScreen({
  mode,
  registrationKind = "customer",
  onModeChange,
}: {
  mode: "login" | "register";
  registrationKind?: RegistrationKind;
  onModeChange: (mode: PublicScreen) => void;
}) {
  const signIn = useAppStore((state) => state.signIn);
  const signUp = useAppStore((state) => state.signUp);
  const isLoading = useAppStore((state) => state.isLoading);
  const isCourierRegistration = mode === "register" && registrationKind === "courier";
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    cpf: "",
    phone: "",
    vehiclePlate: "",
    driverLicense: "",
  });

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    if (mode === "login") {
      void signIn(form);
      return;
    }

    void signUp({
      ...form,
      accountRole: isCourierRegistration ? "COURIER" : "CUSTOMER",
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.backButton} onPress={() => onModeChange("landing")}>
        <Feather name="arrow-left" size={22} color={palette.text} />
      </Pressable>
      <Logo />
      <Text style={styles.authTitle}>
        {mode === "login"
          ? "Bem-vindo de volta"
          : isCourierRegistration
            ? "Criar conta de entregador"
            : "Criar sua conta"}
      </Text>
      <Text style={styles.authSubtitle}>
        {mode === "login"
          ? "Entre para continuar suas compras"
          : isCourierRegistration
            ? "Preencha seus dados para solicitar acesso como entregador"
            : "Leva menos de um minuto"}
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
            <Text style={styles.inputHint}>Os 4 últimos dígitos do telefone serão seu código de entrega</Text>
            {isCourierRegistration ? (
              <>
                <AppInput
                  label="Placa"
                  icon="truck"
                  value={form.vehiclePlate}
                  placeholder="ABC1D23"
                  onChangeText={(value) => updateForm("vehiclePlate", value.toUpperCase())}
                />
                <AppInput
                  label="CNH"
                  icon="file-text"
                  value={form.driverLicense}
                  placeholder="00000000000"
                  keyboardType="number-pad"
                  onChangeText={(value) => updateForm("driverLicense", value)}
                />
                <Text style={styles.inputHint}>Esses dados serão usados para validar sua conta de entregador</Text>
              </>
            ) : null}
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
          placeholder={mode === "login" ? "********" : "mínimo 8 caracteres"}
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
        label={mode === "login" ? "Entrar" : isCourierRegistration ? "Criar conta de entregador" : "Criar conta"}
        loading={isLoading}
        disabled={isLoading}
        onPress={submit}
      />

      {mode === "register" && !isCourierRegistration ? (
        <Button
          mode="contained-tonal"
          textColor={palette.text}
          buttonColor={palette.cardSoft}
          contentStyle={styles.courierSignupContent}
          style={styles.courierSignupButton}
          onPress={() => onModeChange("register-courier")}
        >
          Criar conta como entregador
        </Button>
      ) : null}

      {mode === "register" && isCourierRegistration ? (
        <Pressable style={styles.authSwitch} onPress={() => onModeChange("register")}>
          <Text style={styles.authSwitchText}>
            Quero comprar no app. <Text style={styles.greenText}>Criar conta de cliente</Text>
          </Text>
        </Pressable>
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
