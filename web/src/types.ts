export type TriageLabel = "self_care" | "routine_care" | "urgent_care" | "emergency";

export interface TriageResult {
  label: TriageLabel | string;
  confidence: number;
  explanation?: string;
  source: "on_device" | "llm_fallback";
  latencyMs: number;
  onDeviceLatencyMs?: number;
  onDeviceConfidence?: number;
}

export const LABEL_DESCRIPTIONS: Record<string, string> = {
  self_care: "Likely manageable at home with rest, fluids, or OTC remedies.",
  routine_care: "Worth a routine doctor's visit, not time-critical.",
  urgent_care: "See a clinician same-day or within a few hours.",
  emergency: "Seek emergency care immediately.",
};
