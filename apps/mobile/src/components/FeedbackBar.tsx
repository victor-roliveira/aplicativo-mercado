import { useEffect } from "react";
import { View } from "react-native";
import { Chip } from "react-native-paper";
import { styles } from "../app-shell/styles";
import { useAppStore } from "../state/app-store";

export function FeedbackBar() {
  const errorMessage = useAppStore((state) => state.errorMessage);
  const statusMessage = useAppStore((state) => state.statusMessage);
  const clearFeedback = useAppStore((state) => state.clearFeedback);

  useEffect(() => {
    if (!errorMessage && !statusMessage) {
      return undefined;
    }

    const timeout = setTimeout(clearFeedback, errorMessage ? 3500 : 2500);

    return () => clearTimeout(timeout);
  }, [clearFeedback, errorMessage, statusMessage]);

  if (!errorMessage && !statusMessage) {
    return null;
  }

  return (
    <View style={styles.feedbackWrap}>
      <Chip
        icon={errorMessage ? "alert-circle" : "check"}
        onClose={clearFeedback}
        textStyle={styles.feedbackText}
        style={[styles.feedback, errorMessage ? styles.feedbackError : styles.feedbackSuccess]}
      >
        {errorMessage ?? statusMessage}
      </Chip>
    </View>
  );
}
