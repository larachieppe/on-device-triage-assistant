import { FALLBACK_SERVER_URL } from "../config";
import { TriageResult } from "../types";

export async function classifyWithLlmFallback(
  text: string,
  onDeviceLabel?: string,
  onDeviceConfidence?: number
): Promise<TriageResult> {
  const startedAt = Date.now();

  const response = await fetch(`${FALLBACK_SERVER_URL}/triage/fallback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, onDeviceLabel, onDeviceConfidence }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fallback server error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return {
    label: data.label,
    confidence: data.confidence,
    explanation: data.explanation,
    source: "llm_fallback",
    latencyMs: Date.now() - startedAt,
  };
}
