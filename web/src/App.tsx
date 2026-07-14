import { useEffect, useState } from "react";

import { onDeviceClassifier } from "./ml/onnxClassifier";
import { needsFollowUp, triage } from "./services/triageRouter";
import { LABEL_DESCRIPTIONS, type TriageResult } from "./types";
import { AlertOctagonIcon, AlertTriangleIcon, CheckIcon, ClockIcon } from "./icons";
import {
  buildEnrichedText,
  DURATION_OPTIONS,
  SEVERITY_OPTIONS,
  type Duration,
  type Severity,
} from "./clarify";
import "./App.css";

// Maps each triage label to a slot in the dataviz skill's fixed status
// palette (good/warning/serious/critical) — see index.css. `ink` is which
// glyph color clears contrast against that status color's fill (computed
// once by hand from the palette's own contrast table, not guessed): good
// and critical are dark/saturated enough for a white glyph, warning and
// serious are light enough that they need a dark one.
const STATUS: Record<
  string,
  { colorVar: string; washVar: string; ink: "light" | "dark"; title: string; Icon: () => React.JSX.Element }
> = {
  self_care: { colorVar: "--status-good", washVar: "--status-good-wash", ink: "light", title: "Self care", Icon: CheckIcon },
  routine_care: { colorVar: "--status-warning", washVar: "--status-warning-wash", ink: "dark", title: "Routine care", Icon: ClockIcon },
  urgent_care: { colorVar: "--status-serious", washVar: "--status-serious-wash", ink: "dark", title: "Urgent care", Icon: AlertTriangleIcon },
  emergency: { colorVar: "--status-critical", washVar: "--status-critical-wash", ink: "light", title: "Emergency", Icon: AlertOctagonIcon },
};

const SOURCE_LABEL: Record<string, string> = {
  on_device: "On-device model",
  llm_fallback: "LLM fallback",
  safety_override: "Safety rule",
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

function ConfidenceMeter({ value, label }: { value: number; label: string }) {
  const meta = STATUS[label];
  const pct = Math.round(value * 100);
  const fill = meta ? `var(${meta.colorVar})` : "var(--text-h)";
  const track = meta ? `var(${meta.washVar})` : "var(--border)";
  return (
    <div className="meter">
      <div className="meter-track" style={{ background: track }}>
        <div className="meter-fill" style={{ width: `${Math.max(pct, 3)}%`, background: fill }} />
      </div>
      <span className="meter-value">{pct}%</span>
    </div>
  );
}

type Phase = "idle" | "loading" | "clarifying" | "done";

export default function App() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingText, setPendingText] = useState("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [redFlags, setRedFlags] = useState<boolean | null>(null);
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
    setRedFlags(null);
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

  const onClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration == null || severity == null || redFlags == null) return;
    setPhase("loading");
    setError(null);
    try {
      if (redFlags) {
        setResult({
          label: "emergency",
          confidence: 1,
          source: "safety_override",
          latencyMs: 0,
          explanation:
            "Trouble breathing, chest pain, confusion, or heavy bleeding always routes straight to emergency — that check runs regardless of what the model thinks.",
        });
      } else {
        const enriched = buildEnrichedText(pendingText, duration, severity);
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
            That could be a few different things — a couple quick questions before I say anything:
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
            <legend>Any trouble breathing, chest pain, confusion, or heavy bleeding?</legend>
            <div className="pill-row">
              <button
                type="button"
                className={`pill ${redFlags === true ? "pill--selected pill--danger" : ""}`}
                onClick={() => setRedFlags(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`pill ${redFlags === false ? "pill--selected" : ""}`}
                onClick={() => setRedFlags(false)}
              >
                No
              </button>
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="submit" disabled={duration == null || severity == null || redFlags == null || loading}>
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
                {result.fallbackUnavailable && (
                  <span
                    className="unverified-badge"
                    title="Confidence was below the trust threshold, but this public demo has no LLM fallback server behind it — this is the raw on-device guess."
                  >
                    unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="result-description">
            {result.explanation ?? LABEL_DESCRIPTIONS[result.label] ?? ""}
          </p>

          <ConfidenceMeter value={result.confidence} label={result.label} />

          {result.onDeviceLatencyMs != null && (
            <p className="result-detail">
              On-device pass: {result.onDeviceLatencyMs}ms at{" "}
              {Math.round((result.onDeviceConfidence ?? 0) * 100)}% confidence — verified via LLM
              since that was below the trust threshold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
