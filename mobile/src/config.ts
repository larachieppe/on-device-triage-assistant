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

// Point this at your running `server/` instance. Use your machine's LAN IP
// (not localhost) when testing on a physical device.
export const FALLBACK_SERVER_URL = process.env.EXPO_PUBLIC_TRIAGE_SERVER_URL || "http://localhost:8787";
