import { Feather } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { palette, svgIcons, type FeatherName, type SvgIconComponent } from "./constants";
import type { AppTab } from "./navigation-types";
import { styles } from "./styles";
import { AppSvgIcon } from "../components/AppSvgIcon";

export function BottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  const tabs: Array<{
    key: AppTab;
    label: string;
    icon?: FeatherName;
    svgIcon?: SvgIconComponent;
  }> = [
    { key: "home", label: "Início", svgIcon: svgIcons.HomeIcon },
    { key: "cart", label: "Carrinho", svgIcon: svgIcons.CartIcon },
    { key: "orders", label: "Pedidos", icon: "list" },
    { key: "profile", label: "Perfil", svgIcon: svgIcons.ProfileIcon },
  ];

  return (
    <View style={styles.bottomTabs}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <Pressable key={tab.key} style={styles.tabButton} onPress={() => onChange(tab.key)}>
            {tab.svgIcon ? (
              <AppSvgIcon Icon={tab.svgIcon} size={23} color={active ? palette.green : palette.muted} />
            ) : (
              <Feather name={tab.icon!} size={23} color={active ? palette.green : palette.muted} />
            )}
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
