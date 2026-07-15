export type TriageLabel = "self_care" | "routine_care" | "urgent_care" | "emergency";

export interface TriageResult {
  label: TriageLabel | string;
  confidence: number;
  explanation?: string;
  source: "on_device" | "llm_fallback" | "safety_override";
  latencyMs: number;
  onDeviceLatencyMs?: number;
  onDeviceConfidence?: number;
}

// Written as calm, direct advice rather than clinical labels — the goal is
// to guide, not alarm. This is deliberately just tone: what someone is told
// to *do* for urgent_care and emergency hasn't gotten any less clear or any
// less urgent, only less like a siren going off.
export const LABEL_DESCRIPTIONS: Record<string, string> = {
  self_care: "This sounds manageable at home — rest, fluids, and over-the-counter care should help. If it lingers or changes, it's worth checking in with a doctor.",
  routine_care: "Nothing urgent here, but it's worth mentioning to a doctor when it's convenient — a routine visit should cover it.",
  urgent_care: "Worth getting looked at today. An urgent care visit or a call to your doctor's office is a good next step.",
  emergency: "Please get medical help right away — this isn't something to wait on. If you can, have someone stay with you, or call emergency services now.",
};
