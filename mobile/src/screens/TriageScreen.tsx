import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { triage } from "../services/triageRouter";
import { LABEL_DESCRIPTIONS, TriageResult } from "../types";

const LABEL_COLORS: Record<string, string> = {
  self_care: "#2e7d32",
  routine_care: "#1565c0",
  urgent_care: "#ef6c00",
  emergency: "#c62828",
};

export default function TriageScreen() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await triage(text.trim());
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>On-Device Triage Assistant</Text>
        <Text style={styles.disclaimer}>
          Portfolio demo only — not medical advice. Synthetic training data, not clinically
          validated.
        </Text>

        <TextInput
          style={styles.input}
          multiline
          placeholder="Describe what you're experiencing..."
          value={text}
          onChangeText={setText}
        />

        <TouchableOpacity
          style={[styles.button, (!text.trim() || loading) && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Check</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={[styles.resultCard, { borderColor: LABEL_COLORS[result.label] ?? "#333" }]}>
            <Text style={[styles.resultLabel, { color: LABEL_COLORS[result.label] ?? "#333" }]}>
              {result.label.replace("_", " ").toUpperCase()}
            </Text>
            <Text style={styles.resultDescription}>
              {result.explanation ?? LABEL_DESCRIPTIONS[result.label] ?? ""}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </Text>
              <Text style={styles.metaText}>
                Source: {result.source === "on_device" ? "On-device model" : "LLM fallback"}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Latency: {result.latencyMs}ms</Text>
              {result.onDeviceLatencyMs != null && (
                <Text style={styles.metaText}>
                  (on-device pass: {result.onDeviceLatencyMs}ms @{" "}
                  {((result.onDeviceConfidence ?? 0) * 100).toFixed(0)}% conf)
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fafafa",
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111" },
  disclaimer: { fontSize: 12, color: "#777", marginBottom: 8 },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#999" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorBox: {
    backgroundColor: "#fdecea",
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: "#a12a2a", fontSize: 13 },
  resultCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    gap: 8,
  },
  resultLabel: { fontSize: 18, fontWeight: "700" },
  resultDescription: { fontSize: 14, color: "#333" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  metaText: { fontSize: 12, color: "#666" },
});
