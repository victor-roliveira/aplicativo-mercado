import { Image, View } from "react-native";
import { logoFullImage } from "../app-shell/constants";
import { styles } from "../app-shell/styles";

export function Logo() {
  return (
    <View style={styles.logoRow}>
      <Image source={logoFullImage} style={styles.logoImage} resizeMode="contain" />
    </View>
  );
}
