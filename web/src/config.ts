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

// Unset (rather than defaulting to localhost) on purpose: the public GitHub
// Pages build has no fallback server behind it, and hitting a visitor's own
// localhost:8787 would just fail silently. Set this at build time (e.g. in
// web/.env, or when running `npm run dev` locally) to enable the LLM fallback.
export const FALLBACK_SERVER_URL: string | undefined = import.meta.env.VITE_TRIAGE_SERVER_URL;
