import { onDeviceClassifier } from "../ml/onnxClassifier";
import { ALWAYS_VERIFY_LABELS, CONFIDENCE_THRESHOLD, FALLBACK_SERVER_URL } from "../config";
import type { TriageResult } from "../types";
import { classifyWithLlmFallback } from "./fallbackClient";

// Shared by App.tsx (to decide whether to ask clarifying questions before
// finalizing) and triage() below (to decide whether to call the LLM) — the
// same condition, evaluated from two different call sites.
export function needsFollowUp(label: string, confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLD || ALWAYS_VERIFY_LABELS.includes(label);
}

// The core latency/cost tradeoff this project demonstrates: only pay for an
// LLM call when the cheap, fast, offline-capable on-device model isn't
// confident enough to trust on its own.
export async function triage(text: string): Promise<TriageResult> {
  const onDeviceResult = await onDeviceClassifier.classify(text);

  const needsVerification = needsFollowUp(onDeviceResult.label, onDeviceResult.confidence);

  if (!needsVerification) {
    return {
      label: onDeviceResult.label,
      confidence: onDeviceResult.confidence,
      source: "on_device",
      latencyMs: onDeviceResult.latencyMs,
    };
  }

  if (!FALLBACK_SERVER_URL) {
    return {
      label: onDeviceResult.label,
      confidence: onDeviceResult.confidence,
      source: "on_device",
      latencyMs: onDeviceResult.latencyMs,
      fallbackUnavailable: true,
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
