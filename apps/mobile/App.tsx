import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/app-shell/AppNavigator";
import { AppProviders } from "./src/app-shell/AppProviders";

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <AppNavigator />
    </AppProviders>
  );
}
