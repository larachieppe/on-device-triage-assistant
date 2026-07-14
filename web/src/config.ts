// Keep this in sync with the onnxruntime-web version in package.json — it's
// used to pull the matching WASM runtime files from a CDN instead of
// fighting Vite's bundler over binary assets.
export const ONNXRUNTIME_WEB_VERSION = "1.27.0";

// Below this confidence, the on-device result is treated as ambiguous and
// the app calls the server-side LLM fallback instead. Tune this using
// `python ml/eval.py` — pick the point where accuracy starts dropping off.
export const CONFIDENCE_THRESHOLD = 0.75;

// Emergency-leaning on-device predictions always get double-checked by the
// LLM regardless of confidence, since a false negative there is the costliest
// mistake this app can make.
export const ALWAYS_VERIFY_LABELS = ["emergency"];

export const FALLBACK_SERVER_URL = import.meta.env.VITE_TRIAGE_SERVER_URL || "http://localhost:8787";
