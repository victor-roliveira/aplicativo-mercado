import { Feather } from "@expo/vector-icons";
import { View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { palette, type FeatherName } from "../app-shell/constants";
import { styles } from "../app-shell/styles";

export function AppInput({
  label,
  icon,
  value,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  onChangeText,
}: {
  label: string;
  icon: FeatherName;
  value: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        mode="outlined"
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        left={<TextInput.Icon icon={() => <Feather name={icon} size={20} color={palette.muted} />} />}
        outlineColor={palette.border}
        activeOutlineColor={palette.green}
        textColor={palette.text}
        style={styles.textInput}
        theme={{ roundness: 16 }}
        onChangeText={onChangeText}
      />
    </View>
  );
}
