import { FALLBACK_SERVER_URL } from "../config";
import type { TriageResult } from "../types";

// server/index.js returns JSON errors ({ error, detail }), but a failure
// can also come from infrastructure in front of it — a platform error page,
// a proxy timeout — which is HTML, not JSON. Surfacing that raw would dump
// an entire HTML document (once literally including embedded base64 font
// data) into the UI, so only ever show text that's either our own JSON
// error or a short, known-safe fallback line.
async function describeFailure(response: Response): Promise<string> {
  if ((response.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      const data = await response.json();
      if (typeof data.error === "string") return data.error;
    } catch {
      // fall through to the generic message below
    }
  }
  if (response.status === 502 || response.status === 503) {
    return "The server is waking up (this host spins down when idle) — try again in a moment.";
  }
  return `The server returned an unexpected error (HTTP ${response.status}).`;
}

export async function classifyWithLlmFallback(
  text: string,
  onDeviceLabel?: string,
  onDeviceConfidence?: number
): Promise<TriageResult> {
  const startedAt = performance.now();

  const response = await fetch(`${FALLBACK_SERVER_URL}/triage/fallback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, onDeviceLabel, onDeviceConfidence }),
  });

  if (!response.ok) {
    throw new Error(await describeFailure(response));
  }

  const data = await response.json();
  return {
    label: data.label,
    confidence: data.confidence,
    explanation: data.explanation,
    source: "llm_fallback",
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
