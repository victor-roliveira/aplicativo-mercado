import { PropsWithChildren, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MD3DarkTheme, PaperProvider } from "react-native-paper";
import { mercadoTheme } from "../theme";

export function AppProviders({ children }: PropsWithChildren) {
  const paperTheme = useMemo(
    () => ({
      ...MD3DarkTheme,
      ...mercadoTheme,
    }),
    [],
  );

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </SafeAreaProvider>
  );
}
