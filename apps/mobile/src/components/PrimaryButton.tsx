import { Feather } from "@expo/vector-icons";
import { Button } from "react-native-paper";
import { palette, type FeatherName } from "../app-shell/constants";
import { styles } from "../app-shell/styles";

export function PrimaryButton({
  label,
  icon = "arrow-right",
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      mode="contained"
      loading={loading}
      disabled={disabled}
      contentStyle={styles.primaryButtonContent}
      labelStyle={styles.primaryButtonLabel}
      style={styles.primaryButton}
      buttonColor={palette.green}
      textColor={palette.onAccent}
      onPress={onPress}
      icon={({ color, size }) => <Feather name={icon} color={color} size={size} />}
    >
      {label}
    </Button>
  );
}
