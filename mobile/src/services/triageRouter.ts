import { onDeviceClassifier } from "../ml/onnxClassifier";
import { ALWAYS_VERIFY_LABELS, CONFIDENCE_THRESHOLD } from "../config";
import { TriageResult } from "../types";
import { classifyWithLlmFallback } from "./fallbackClient";

// The core latency/cost tradeoff this project demonstrates: only pay for an
// LLM call when the cheap, fast, offline-capable on-device model isn't
// confident enough to trust on its own.
export async function triage(text: string): Promise<TriageResult> {
  const onDeviceResult = await onDeviceClassifier.classify(text);

  const needsVerification =
    onDeviceResult.confidence < CONFIDENCE_THRESHOLD ||
    ALWAYS_VERIFY_LABELS.includes(onDeviceResult.label);

  if (!needsVerification) {
    return {
      label: onDeviceResult.label,
      confidence: onDeviceResult.confidence,
      source: "on_device",
      latencyMs: onDeviceResult.latencyMs,
    };
  }

  const fallbackResult = await classifyWithLlmFallback(
    text,
    onDeviceResult.label,
    onDeviceResult.confidence
  );

  return {
    ...fallbackResult,
    onDeviceLatencyMs: onDeviceResult.latencyMs,
    onDeviceConfidence: onDeviceResult.confidence,
  };
}
