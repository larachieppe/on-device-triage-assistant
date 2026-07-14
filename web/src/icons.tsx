// Small stroke icons, one per triage severity. Deliberately plain geometry
// (no icon library dependency) — stroke="currentColor" so the chip that
// wraps each one controls ink color (see StatusChip in App.tsx, which picks
// white or dark ink per status color so it always clears contrast, per the
// dataviz skill's "pick white or ink by the fill's luminance" rule).

const commonProps = {
  viewBox: "0 0 20 20",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CheckIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <circle cx="10" cy="10" r="6.75" />
      <path d="M10 6.5v3.7l2.6 1.5" />
    </svg>
  );
}

export function AlertTriangleIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M10 4.3 16.8 15.5H3.2L10 4.3Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.2" />
      <circle cx="10" cy="13.6" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlertOctagonIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path
        d="M6.6 3.4h6.8l4.2 4.2v6.8l-4.2 4.2H6.6l-4.2-4.2V7.6l4.2-4.2Z"
        strokeLinejoin="round"
      />
      <path d="M10 6.8v4.4" />
      <circle cx="10" cy="13.8" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
