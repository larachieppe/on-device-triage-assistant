import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";

import TriageScreen from "./src/screens/TriageScreen";

export default function App() {
  return (
    <SafeAreaView style={styles.flex}>
      <TriageScreen />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
