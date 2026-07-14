import { useEffect, useState } from "react";

import { onDeviceClassifier } from "./ml/onnxClassifier";
import { triage } from "./services/triageRouter";
import { LABEL_DESCRIPTIONS, type TriageResult } from "./types";
import "./App.css";

const LABEL_COLORS: Record<string, string> = {
  self_care: "#2e7d32",
  routine_care: "#1565c0",
  urgent_care: "#ef6c00",
  emergency: "#c62828",
};

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

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
        <button type="submit" disabled={!text.trim() || loading}>
          {loading ? "Checking..." : "Check"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result" style={{ borderColor: LABEL_COLORS[result.label] ?? "#333" }}>
          <div className="result-label" style={{ color: LABEL_COLORS[result.label] ?? "#333" }}>
            {result.label.replace("_", " ").toUpperCase()}
          </div>
          <p className="result-description">
            {result.explanation ?? LABEL_DESCRIPTIONS[result.label] ?? ""}
          </p>
          <div className="meta-row">
            <span>Confidence: {(result.confidence * 100).toFixed(0)}%</span>
            <span>Source: {result.source === "on_device" ? "On-device model" : "LLM fallback"}</span>
          </div>
          <div className="meta-row">
            <span>Latency: {result.latencyMs}ms</span>
            {result.onDeviceLatencyMs != null && (
              <span>
                (on-device pass: {result.onDeviceLatencyMs}ms @{" "}
                {((result.onDeviceConfidence ?? 0) * 100).toFixed(0)}% conf)
              </span>
            )}
          </div>
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
