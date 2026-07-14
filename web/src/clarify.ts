// Follow-up questions asked before finalizing any result the initial pass
// wasn't confident about (or that leans emergency). A real triage nurse
// doesn't escalate off one sentence — they ask a few questions first. This
// is the minimal version of that: three fixed, fast-to-answer questions
// rather than open-ended multi-turn chat, so it stays a couple of taps, not
// a conversation.

export type Duration = "just_started" | "hours" | "day_or_more";
export type Severity = "mild" | "moderate" | "severe";

export const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: "just_started", label: "Just started" },
  { value: "hours", label: "A few hours" },
  { value: "day_or_more", label: "A day or more" },
];

export const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

const DURATION_TEXT: Record<Duration, string> = {
  just_started: "it just started",
  hours: "it has been going on for a few hours",
  day_or_more: "it has been going on for a day or more",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  mild: "it feels mild",
  moderate: "it feels moderate",
  severe: "it feels severe",
};

// Folds the follow-up answers back into plain text so the *same* on-device
// model + LLM fallback pipeline can reconsider with more signal, instead of
// needing a second model or a hand-coded scoring rule.
export function buildEnrichedText(original: string, duration: Duration, severity: Severity): string {
  return `${original.trim()}. Additional detail: ${DURATION_TEXT[duration]}, and ${SEVERITY_TEXT[severity]}.`;
}
