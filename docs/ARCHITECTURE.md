# Architecture & tradeoffs

## The core decision: when is a small model good enough?

A distilled classifier running on-device is nearly free and takes single-digit
to low double-digit milliseconds on a modern phone. An LLM API call is
slower (hundreds of ms to a few seconds, network-dependent) and costs money
per request. The naive options are both bad:

- **Always use the small model**: fast and free, but it will confidently get
  ambiguous cases wrong sometimes — unacceptable for anything safety-adjacent.
- **Always call the LLM**: accurate and flexible, but every request pays
  network latency and API cost, and the app stops working offline.

This project routes between them based on the on-device model's own
confidence (`mobile/src/services/triageRouter.ts`):

1. Run the on-device model. It returns a label and a softmax confidence.
2. If confidence is above `CONFIDENCE_THRESHOLD`, trust it and return
   immediately — no network call.
3. Otherwise (or if the label is in `ALWAYS_VERIFY_LABELS`), call the server
   fallback and use the LLM's answer instead.

The threshold isn't picked arbitrarily — `ml/eval.py` buckets validation
examples by confidence and reports accuracy per bucket, so the threshold is
set at the point where accuracy measurably drops, not a guess.

## Why MobileBERT instead of DistilBERT

`ml/train.py` fine-tunes `google/mobilebert-uncased` (~25M params) rather
than the more commonly reached-for `distilbert-base-uncased` (~66M params).
MobileBERT is itself a distillation target built for on-device inference —
using it, then quantizing to int8 on top, compounds the size/latency
reduction instead of just picking "the smaller of two BERT variants."

## Why the LLM call goes through a server, not directly from the app

An API key embedded in a mobile app bundle can be extracted from the
compiled binary — it is not a secret once it ships. `server/index.js` is a
thin Express proxy that holds `ANTHROPIC_API_KEY` and is the only thing that
talks to Claude. The mobile app only ever calls the proxy's
`/triage/fallback` endpoint. This also gives a single place to add rate
limiting, logging, and cost controls if this were a real product.

## Why `emergency` always gets verified

Confidence-based routing alone would let a confidently-wrong on-device
prediction skip the LLM check. Since a missed emergency is far more costly
than an unnecessary LLM call, `ALWAYS_VERIFY_LABELS` forces verification for
that label regardless of confidence — a deliberate asymmetry in the routing
logic, not just a threshold.

## What's intentionally out of scope

- **Real clinical data / validation.** The dataset is templated and
  synthetic (`ml/data/generate_synthetic_data.py`) — swapping in a licensed,
  clinician-reviewed dataset would be the first step before this could be
  anything other than a demo.
- **On-device LLM fallback (e.g. via llama.cpp).** Deliberately left out to
  keep the cost/latency contrast between "small classifier" and "hosted LLM"
  clean and easy to talk about.
- **Auth / rate limiting on the server.** The proxy is a demonstration of
  the *pattern* (key stays server-side), not a production-hardened service.
