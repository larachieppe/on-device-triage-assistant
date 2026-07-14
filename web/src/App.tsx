import { useEffect, useState } from "react";

import { onDeviceClassifier } from "./ml/onnxClassifier";
import { triage } from "./services/triageRouter";
import { LABEL_DESCRIPTIONS, type TriageResult } from "./types";
import { AlertOctagonIcon, AlertTriangleIcon, CheckIcon, ClockIcon } from "./icons";
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

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);

  useEffect(() => {
    onDeviceClassifier
      .isModelReady()
      .then(setModelReady)
      .catch(() => setModelReady(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await triage(text.trim());
      setResult(r);
      setResultKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const meta = result ? STATUS[result.label] : undefined;

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

      <form onSubmit={onSubmit} className="form">
        <textarea
          placeholder="Describe what you're experiencing..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <div className="form-actions">
          <button type="submit" disabled={!text.trim() || loading}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? "Analyzing…" : "Check"}
          </button>
          {loading && <span className="form-status">Running on-device, no data leaves your browser</span>}
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
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
                {result.source === "on_device" ? "On-device model" : "LLM fallback"} · {result.latencyMs}ms
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

          {result.fallbackUnavailable && (
            <p className="fallback-note">
              Confidence was below the threshold for a trustworthy on-device answer, and this
              public demo has no LLM fallback server behind it — the result above is the raw
              on-device guess. Run <code>server/</code> locally and set{" "}
              <code>VITE_TRIAGE_SERVER_URL</code> to see the full routing behavior.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
