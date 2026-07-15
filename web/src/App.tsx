import { useEffect, useState } from "react";

import { onDeviceClassifier } from "./ml/onnxClassifier";
import { needsFollowUp, triage } from "./services/triageRouter";
import { LABEL_DESCRIPTIONS, type TriageResult } from "./types";
import { AlertOctagonIcon, AlertTriangleIcon, CheckIcon, ClockIcon } from "./icons";
import {
  buildEnrichedText,
  DURATION_OPTIONS,
  RED_FLAG_OPTIONS,
  redFlagLabels,
  SEVERITY_OPTIONS,
  TRAJECTORY_OPTIONS,
  type ClarifyAnswers,
  type Duration,
  type Severity,
  type Trajectory,
} from "./clarify";
import "./App.css";

// Maps each triage label to a slot in the dataviz skill's fixed status
// palette (good/warning/serious/critical) — see index.css. `ink` is which
// glyph color clears contrast against that status color's fill (computed
// once by hand from the palette's own contrast table, not guessed): good
// and critical are dark/saturated enough for a white glyph, warning and
// serious are light enough that they need a dark one.
//
// `title` is deliberately an action ("Get help right now"), not a category
// noun ("Emergency") — a diagnosis-shaped label reads as a verdict being
// handed down; a sentence telling you what to do reads as advice. The
// severity signal doesn't get any weaker for it: the color, icon, and
// explanation text still make emergency unmistakably different from
// self-care, this just changes whether the headline feels like an alarm
// going off or a person telling you what to do next.
const STATUS: Record<
  string,
  { colorVar: string; washVar: string; ink: "light" | "dark"; title: string; Icon: () => React.JSX.Element }
> = {
  self_care: { colorVar: "--status-good", washVar: "--status-good-wash", ink: "light", title: "Care for it at home", Icon: CheckIcon },
  routine_care: { colorVar: "--status-warning", washVar: "--status-warning-wash", ink: "dark", title: "Mention it to a doctor", Icon: ClockIcon },
  urgent_care: { colorVar: "--status-serious", washVar: "--status-serious-wash", ink: "dark", title: "Get seen today", Icon: AlertTriangleIcon },
  emergency: { colorVar: "--status-critical", washVar: "--status-critical-wash", ink: "light", title: "Get help right now", Icon: AlertOctagonIcon },
};

const SOURCE_LABEL: Record<string, string> = {
  on_device: "On-device model",
  llm_fallback: "LLM fallback",
  safety_override: "Safety rule",
};

// What's shown instead of a numeric confidence score. The model's raw
// softmax number isn't a calibrated probability — ml/eval.py's hard eval set
// shows the >=95% confidence bucket is only ~77% accurate in practice — so a
// specific percentage next to a result claims more certainty than the
// system actually has. This says how the answer was reached instead, which
// is true and checkable, rather than a number that looks precise but isn't.
const SOURCE_EXPLANATION: Record<string, string> = {
  on_device: "Answered on-device, right away.",
  llm_fallback: "Double-checked with Claude before answering, since the quick read wasn't confident enough to trust alone.",
  safety_override: "Answered by a fixed safety rule, not the model — some symptoms always get treated as urgent, no second-guessing.",
};

function StatusChip({ label }: { label: string }) {
  const meta = STATUS[label];
  if (!meta) return null;
  const Icon = meta.Icon;
  return (
    <span className={`status-chip status-chip--ink-${meta.ink}`} style={{ background: `var(${meta.colorVar})` }}>
      <Icon />
    </span>
  );
}

type Phase = "idle" | "loading" | "clarifying" | "done";

export default function App() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingText, setPendingText] = useState("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [affectsDailyLife, setAffectsDailyLife] = useState<boolean | null>(null);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);

  useEffect(() => {
    onDeviceClassifier
      .isModelReady()
      .then(setModelReady)
      .catch(() => setModelReady(false));
  }, []);

  const resetClarifyForm = () => {
    setDuration(null);
    setSeverity(null);
    setTrajectory(null);
    setAffectsDailyLife(null);
    setRedFlags([]);
  };

  const toggleRedFlag = (value: string) => {
    setRedFlags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || phase === "loading") return;
    setPhase("loading");
    setError(null);
    setResult(null);
    try {
      const onDeviceResult = await onDeviceClassifier.classify(trimmed);
      if (needsFollowUp(onDeviceResult.label, onDeviceResult.confidence)) {
        setPendingText(trimmed);
        resetClarifyForm();
        setPhase("clarifying");
      } else {
        setResult({
          label: onDeviceResult.label,
          confidence: onDeviceResult.confidence,
          source: "on_device",
          latencyMs: onDeviceResult.latencyMs,
        });
        setResultKey((k) => k + 1);
        setPhase("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  };

  const clarifyIncomplete =
    duration == null || severity == null || trajectory == null || affectsDailyLife == null;

  const onClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clarifyIncomplete || duration == null || severity == null || trajectory == null || affectsDailyLife == null) {
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      if (redFlags.length > 0) {
        const flags = redFlagLabels(redFlags).join(", ");
        setResult({
          label: "emergency",
          confidence: 1,
          source: "safety_override",
          latencyMs: 0,
          explanation: `Because you mentioned ${flags.toLowerCase()}, please get medical help right away — symptoms like these are always treated as urgent, so there's no need to wait on anything else here.`,
        });
      } else {
        const answers: ClarifyAnswers = { duration, severity, trajectory, affectsDailyLife, redFlags };
        const enriched = buildEnrichedText(pendingText, answers);
        const r = await triage(enriched);
        setResult(r);
      }
      setResultKey((k) => k + 1);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("clarifying");
    }
  };

  const meta = result ? STATUS[result.label] : undefined;
  const loading = phase === "loading";

  return (
    <div className="page">
      <h1>On-Device Triage Assistant</h1>
      <p className="disclaimer">
        Portfolio demo only — not medical advice. Synthetic training data, not clinically
        validated. The classifier runs entirely in your browser via WebAssembly; nothing you type
        is sent anywhere unless the on-device model is unsure and falls back to the LLM.
      </p>

      {modelReady === false && (
        <div className="warning">
          On-device model not found. Run <code>python ml/export_onnx.py</code> from the project
          root, then reload this page.
        </div>
      )}

      {phase !== "clarifying" && (
        <form onSubmit={onSubmit} className="form">
          <textarea
            placeholder="Describe what you're experiencing..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <div className="form-actions">
            <button type="submit" disabled={!text.trim() || loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? "Analyzing…" : "Check"}
            </button>
            {loading && <span className="form-status">Running on-device, no data leaves your browser</span>}
          </div>
        </form>
      )}

      {phase === "clarifying" && (
        <form onSubmit={onClarifySubmit} className="clarify">
          <p className="clarify-intro">
            That could be a few different things — a few quick questions before I say anything:
          </p>
          <p className="clarify-safety">
            If this is a real emergency, don't wait for this — call your local emergency number now.
          </p>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setPhase("idle");
              resetClarifyForm();
            }}
          >
            ← start over
          </button>

          <fieldset className="clarify-group">
            <legend>How long has this been going on?</legend>
            <div className="pill-row">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`pill ${duration === opt.value ? "pill--selected" : ""}`}
                  onClick={() => setDuration(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="clarify-group">
            <legend>How severe does it feel right now?</legend>
            <div className="pill-row">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`pill ${severity === opt.value ? "pill--selected" : ""}`}
                  onClick={() => setSeverity(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="clarify-group">
            <legend>Is it getting better, worse, or staying the same?</legend>
            <div className="pill-row">
              {TRAJECTORY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`pill ${trajectory === opt.value ? "pill--selected" : ""}`}
                  onClick={() => setTrajectory(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="clarify-group">
            <legend>Is it stopping you from doing normal daily activities?</legend>
            <div className="pill-row">
              <button
                type="button"
                className={`pill ${affectsDailyLife === true ? "pill--selected" : ""}`}
                onClick={() => setAffectsDailyLife(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`pill ${affectsDailyLife === false ? "pill--selected" : ""}`}
                onClick={() => setAffectsDailyLife(false)}
              >
                No
              </button>
            </div>
          </fieldset>

          <fieldset className="clarify-group">
            <legend>Any of these? Select all that apply.</legend>
            <div className="pill-row">
              {RED_FLAG_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`pill ${redFlags.includes(opt.value) ? "pill--selected pill--danger" : ""}`}
                  onClick={() => toggleRedFlag(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="submit" disabled={clarifyIncomplete || loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? "Analyzing…" : "Continue"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      {result && phase === "done" && (
        <div
          key={resultKey}
          className="result"
          style={{ borderColor: meta ? `var(${meta.colorVar})` : "var(--border)" }}
        >
          <div className="result-header">
            <StatusChip label={result.label} />
            <div>
              <div className="result-label">{meta?.title ?? result.label}</div>
              <div className="result-source">
                {SOURCE_LABEL[result.source] ?? result.source} · {result.latencyMs}ms
              </div>
            </div>
          </div>

          <p className="result-description">
            {result.explanation ?? LABEL_DESCRIPTIONS[result.label] ?? ""}
          </p>

          <p className="result-basis">
            {SOURCE_EXPLANATION[result.source] ?? ""}
          </p>

          {result.onDeviceLatencyMs != null && (
            <p className="result-detail">
              On-device pass: {result.onDeviceLatencyMs}ms — not confident enough on its own, so
              Claude was asked to double-check.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
