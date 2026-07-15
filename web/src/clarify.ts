// Follow-up questions asked before finalizing any result the initial pass
// wasn't confident about (or that leans emergency). A real triage nurse
// doesn't stop at "how long and how bad" — they also ask whether it's
// getting better or worse and whether it's stopping you from functioning,
// because those are what actually separate "watch and wait" from "go in
// today" from "go in now." Five fixed, fast-to-answer questions rather than
// open-ended multi-turn chat, so it stays a couple of taps, not a
// conversation — but enough signal to differentiate all four categories,
// not just gate on one emergency/not-emergency checkbox.

export type Duration = "just_started" | "hours" | "day_or_more" | "over_a_week";
export type Severity = "mild" | "moderate" | "severe";
export type Trajectory = "improving" | "same" | "worsening";

export const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: "just_started", label: "Just started" },
  { value: "hours", label: "A few hours" },
  { value: "day_or_more", label: "A day or more" },
  { value: "over_a_week", label: "Over a week" },
];

export const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

export const TRAJECTORY_OPTIONS: { value: Trajectory; label: string }[] = [
  { value: "improving", label: "Getting better" },
  { value: "same", label: "About the same" },
  { value: "worsening", label: "Getting worse" },
];

// Multi-select rather than the old single yes/no — each one is independently
// a reason to escalate, and letting several be true at once (and naming
// which ones) gives both the enriched text and the explanation shown to the
// user more to work with than a single boolean did.
export const RED_FLAG_OPTIONS: { value: string; label: string }[] = [
  { value: "breathing", label: "Trouble breathing" },
  { value: "chest_pain", label: "Chest pain or pressure" },
  { value: "confusion", label: "Confusion or trouble staying awake" },
  { value: "bleeding", label: "Uncontrolled bleeding" },
  { value: "sudden_severe_pain", label: "Sudden, severe pain" },
  { value: "fainted", label: "Fainted or lost consciousness" },
];
const RED_FLAG_LABELS = Object.fromEntries(RED_FLAG_OPTIONS.map((o) => [o.value, o.label]));

const DURATION_TEXT: Record<Duration, string> = {
  just_started: "it just started",
  hours: "it has been going on for a few hours",
  day_or_more: "it has been going on for a day or more",
  over_a_week: "it has been going on for over a week",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  mild: "it feels mild",
  moderate: "it feels moderate",
  severe: "it feels severe",
};

const TRAJECTORY_TEXT: Record<Trajectory, string> = {
  improving: "it seems to be getting better",
  same: "it hasn't changed much",
  worsening: "it seems to be getting worse",
};

export interface ClarifyAnswers {
  duration: Duration;
  severity: Severity;
  trajectory: Trajectory;
  affectsDailyLife: boolean;
  redFlags: string[]; // values from RED_FLAG_OPTIONS
}

export function redFlagLabels(redFlags: string[]): string[] {
  return redFlags.map((id) => RED_FLAG_LABELS[id] ?? id);
}

// Folds every follow-up answer back into plain text so the *same* on-device
// model + LLM fallback pipeline can reconsider with more signal, instead of
// needing a second model or a hand-coded scoring rule.
export function buildEnrichedText(original: string, answers: ClarifyAnswers): string {
  const parts = [
    DURATION_TEXT[answers.duration],
    SEVERITY_TEXT[answers.severity],
    TRAJECTORY_TEXT[answers.trajectory],
    answers.affectsDailyLife
      ? "it's stopping me from doing normal daily activities"
      : "it's not really stopping me from doing normal daily activities",
  ];
  if (answers.redFlags.length > 0) {
    parts.push(`I also have: ${redFlagLabels(answers.redFlags).join(", ").toLowerCase()}`);
  }
  return `${original.trim()}. Additional detail: ${parts.join("; ")}.`;
}
