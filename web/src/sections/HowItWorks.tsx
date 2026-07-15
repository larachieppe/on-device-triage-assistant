import { ChipIcon, CloudIcon, QuestionIcon, ShieldIcon } from "../icons";

const STEPS = [
  {
    Icon: ChipIcon,
    title: "Classify on-device",
    body:
      "A quantized MobileBERT model — about 26MB — runs entirely in your browser via WebAssembly. Nothing is sent anywhere yet, and if it's confident, that's the whole pipeline: answer shown, no network call.",
  },
  {
    Icon: QuestionIcon,
    title: "Ask before escalating",
    body:
      "If the on-device model isn't confident, or its first guess leans toward emergency, it doesn't show a verdict yet. It asks about duration, severity, trajectory, and daily impact first — the same way a triage nurse would.",
  },
  {
    Icon: ShieldIcon,
    title: "Hard safety rule for red flags",
    body:
      "Trouble breathing, chest pain, confusion, uncontrolled bleeding — flagging any of these routes straight to “get help now” through a fixed rule, bypassing the model entirely. That check never depends on classifier confidence.",
  },
  {
    Icon: CloudIcon,
    title: "Double-check with Claude",
    body:
      "Otherwise, the enriched description goes to a small server that calls Claude and holds the API key — the browser never sees it. One combined pipeline, whether the answer comes from the model or the LLM.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section">
      <div className="section-head">
        <span className="eyebrow eyebrow--muted">How it works</span>
        <h2>Four steps, not a black box</h2>
        <p className="section-sub">
          The routing logic that decides when to trust the on-device model and when to ask more.
        </p>
      </div>

      <ol className="steps">
        {STEPS.map((step, i) => (
          <li className="step" key={step.title}>
            <div className="step-marker">
              <span className="step-icon">
                <step.Icon />
              </span>
              <span className="step-number">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
