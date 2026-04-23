import { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { mercadoTheme } from "../theme";

const paperTheme = {
  ...MD3LightTheme,
  ...mercadoTheme,
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </SafeAreaProvider>
  );
}
