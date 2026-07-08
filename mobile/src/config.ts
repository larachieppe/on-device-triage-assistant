// Below this confidence, the on-device result is treated as ambiguous and
// the app calls the server-side LLM fallback instead. Tune this using
// `python ml/eval.py` — pick the point where accuracy starts dropping off.
export const CONFIDENCE_THRESHOLD = 0.75;

// Emergency-leaning on-device predictions always get double-checked by the
// LLM regardless of confidence, since a false negative there is the costliest
// mistake this app can make.
export const ALWAYS_VERIFY_LABELS = ["emergency"];

// Point this at your running `server/` instance. Use your machine's LAN IP
// (not localhost) when testing on a physical device.
export const FALLBACK_SERVER_URL = process.env.EXPO_PUBLIC_TRIAGE_SERVER_URL || "http://localhost:8787";
