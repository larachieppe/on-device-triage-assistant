import { CheckIcon, ChipIcon, CodeIcon, LockIcon, ScaleIcon, ShieldIcon } from "../icons";

const FEATURES = [
  {
    Icon: ChipIcon,
    title: "On-device first",
    body: "Classification runs locally via onnxruntime-web — no network call unless the model itself asks for help.",
  },
  {
    Icon: LockIcon,
    title: "Privacy by default",
    body: "Your symptom description never leaves the browser unless it's escalated to the LLM fallback.",
  },
  {
    Icon: ScaleIcon,
    title: "Cost-aware routing",
    body: "Every LLM call is a deliberate tradeoff, not the default path — the on-device model handles what it can on its own.",
  },
  {
    Icon: ShieldIcon,
    title: "Safety-first overrides",
    body: "Red-flag symptoms hard-route to “get help now” through a fixed rule that never depends on classifier confidence.",
  },
  {
    Icon: CheckIcon,
    title: "Calibration-tested",
    body: "A second, hand-written eval set exists specifically to catch the gap between confidence and correctness.",
  },
  {
    Icon: CodeIcon,
    title: "Fully open source",
    body: "The ML pipeline, server, and frontend all live in one repo — read the code, not just the pitch.",
  },
];

export default function Features() {
  return (
    <section className="section">
      <div className="section-head">
        <span className="eyebrow eyebrow--muted">Design principles</span>
        <h2>What this is actually demonstrating</h2>
      </div>

      <div className="features-grid">
        {FEATURES.map((f) => (
          <div className="feature-card" key={f.title}>
            <span className="feature-icon">
              <f.Icon />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
