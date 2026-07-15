// Keep this in sync with the onnxruntime-web version in package.json — it's
// used to pull the matching WASM runtime files from a CDN instead of
// fighting Vite's bundler over binary assets.
export const ONNXRUNTIME_WEB_VERSION = "1.27.0";

// Below this confidence, the on-device result is treated as ambiguous and
// the app calls the server-side LLM fallback instead.
//
// Set from `python ml/eval.py --val-csv data/hard_eval_set.csv`, not the
// templated validation set — the templated set hits 100% accuracy (the model
// memorized the generator's sentence patterns) and is useless for picking a
// threshold. On hand-written, naturally-phrased examples, the model is
// poorly calibrated: even its ≥95% confidence bucket is only ~77% accurate.
// 0.95 is the one point where accuracy meaningfully improves, so it's the
// real threshold, not a smooth curve — see docs/ARCHITECTURE.md.
export const CONFIDENCE_THRESHOLD = 0.95;

// Emergency-leaning on-device predictions always get double-checked by the
// LLM regardless of confidence, since a false negative there is the costliest
// mistake this app can make.
export const ALWAYS_VERIFY_LABELS = ["emergency"];

// Empty string by default, meaning "same origin as this page" — in
// production, server/index.js serves this app *and* the API from one
// process (see render.yaml), so a relative fetch("/triage/fallback") just
// works with nothing to configure. Local dev is the one case that needs an
// override: `npm run dev` here runs a separate Vite dev server from
// `npm run dev` in server/, on a different port, so set
// VITE_TRIAGE_SERVER_URL=http://localhost:8787 in web/.env for local fallback
// calls to reach it.
export const FALLBACK_SERVER_URL: string = import.meta.env.VITE_TRIAGE_SERVER_URL || "";
