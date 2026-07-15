const ARCHITECTURE_DOC =
  "https://github.com/larachieppe/on-device-triage-assistant/blob/main/docs/ARCHITECTURE.md";

const STATS: { value: string; label: string; note?: string }[] = [
  { value: "26.5MB", label: "quantized model size", note: "int8, down from 99MB fp32" },
  { value: "<100ms", label: "typical on-device inference", note: "once the model is loaded" },
  { value: "100% → 66%", label: "accuracy, templated vs. real phrasing", note: "the honest number" },
  { value: "77%", label: "accuracy even at ≥95% confidence", note: "why the threshold is 0.95, not a guess" },
  { value: "0.95", label: "confidence threshold", note: "measured from the eval below, not assumed" },
  { value: "4", label: "triage categories", note: "self care → routine → urgent → emergency" },
];

export default function Stats() {
  return (
    <section id="numbers" className="section">
      <div className="section-head">
        <span className="eyebrow eyebrow--muted">Numbers</span>
        <h2>Measured, not asserted</h2>
        <p className="section-sub">
          The most interesting number here isn't the accuracy — it's how much accuracy drops the
          moment the phrasing stops matching the training data.
        </p>
      </div>

      <div className="stats-grid">
        {STATS.map((stat) => (
          <div className="stat-tile" key={stat.label}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            {stat.note && <div className="stat-note">{stat.note}</div>}
          </div>
        ))}
      </div>

      <p className="stats-footnote">
        Full writeup — the templated eval set, the hand-written hard eval set, and why confidence
        turned out to be poorly calibrated —{" "}
        <a href={ARCHITECTURE_DOC} target="_blank" rel="noreferrer">
          in the architecture doc
        </a>
        .
      </p>
    </section>
  );
}
