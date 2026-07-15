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

// Icons below are used in the How-it-works / Features sections, not the
// triage result itself — same plain-geometry, stroke="currentColor" style.

export function ChipIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <rect x="6" y="6" width="8" height="8" rx="1.4" />
      <path d="M8.5 6V3.5M11.5 6V3.5M8.5 16.5V14M11.5 16.5V14M14 8.5h2.5M14 11.5h2.5M3.5 8.5H6M3.5 11.5H6" />
    </svg>
  );
}

export function QuestionIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <circle cx="10" cy="10" r="6.75" />
      <path d="M7.8 8.2a2.2 2.2 0 1 1 3.3 1.9c-.7.4-1.1.9-1.1 1.7" />
      <circle cx="10" cy="13.6" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M10 3.2 15.8 5.4v4.4c0 3.5-2.4 5.9-5.8 7.1-3.4-1.2-5.8-3.6-5.8-7.1V5.4L10 3.2Z" strokeLinejoin="round" />
      <path d="M7.6 10.1l1.8 1.8 3-3.4" strokeLinejoin="round" />
    </svg>
  );
}

export function CloudIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M6.2 14.2a3.1 3.1 0 0 1 .4-6.2 4 4 0 0 1 7.6-1.4 3.4 3.4 0 0 1 1.6 6.4v.1H6.4Z" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.6" />
      <path d="M6.8 9V6.8a3.2 3.2 0 0 1 6.4 0V9" />
    </svg>
  );
}

export function ScaleIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M10 3.5v13M6 4.8h8M4 8.4l2-3.6 2 3.6a2.1 2.1 0 0 1-4 0ZM12 8.4l2-3.6 2 3.6a2.1 2.1 0 0 1-4 0Z" strokeLinejoin="round" />
    </svg>
  );
}

export function CodeIcon() {
  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M7 6.5 3 10l4 3.5M13 6.5 17 10l-4 3.5M11.3 4.5 8.7 15.5" />
    </svg>
  );
}
