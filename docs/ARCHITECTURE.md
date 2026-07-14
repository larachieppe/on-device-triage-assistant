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
confidence (`web/src/services/triageRouter.ts`):

1. Run the on-device model. It returns a label and a softmax confidence.
2. If confidence is above `CONFIDENCE_THRESHOLD`, trust it and return
   immediately — no network call.
3. Otherwise (or if the label is in `ALWAYS_VERIFY_LABELS`), don't call the
   LLM yet — ask a few clarifying questions first (see below), then call the
   server fallback with the enriched description and use the LLM's answer.

The threshold isn't picked arbitrarily — `ml/eval.py` buckets validation
examples by confidence and reports accuracy per bucket, so the threshold is
set at the point where accuracy measurably drops, not a guess. See
"Calibration: the model is confidently wrong a lot" below for why that
number is 0.95, and why picking it required a second, harder eval set.

## Calibration: the model is confidently wrong a lot

The templated validation set (`ml/data/generate_synthetic_data.py`) hits
**100% accuracy**. That's not a sign the model is good — it's a sign the
eval is too easy. The generator draws from a small fixed vocabulary of
symptom phrases and sentence templates, and the same generator produced the
training data, so the model only had to memorize surface patterns, not
learn anything about symptom severity.

`ml/data/hard_eval_set.py` is a second, hand-written set of 80 examples —
casual phrasing, slang, typos, run-on sentences, the way people actually
type when something's wrong with them — built specifically to *not* match
the generator's patterns. Results (`python ml/eval.py --val-csv
data/hard_eval_set.csv`):

```
              precision    recall  f1-score   support
   self_care       0.62      0.75      0.68        20
routine_care       1.00      0.55      0.71        20
 urgent_care       0.52      0.70      0.60        20
   emergency       0.72      0.65      0.68        20
    accuracy                           0.66        80

Confidence distribution:
  [0.00, 0.50): n= 1  accuracy=0.000
  [0.50, 0.70): n=10  accuracy=0.400
  [0.70, 0.85): n= 5  accuracy=0.400
  [0.85, 0.95): n= 4  accuracy=0.250
  [0.95, 1.01): n=60  accuracy=0.767
```

Two things worth calling out:

1. **Accuracy dropped from 100% to 66%** the moment the phrasing stopped
   matching the training distribution. That's the honest number for a model
   trained on synthetic data, and it's the reason this project is a demo of
   an architecture pattern, not a claim that the classifier itself is any
   good.
2. **Confidence and correctness are only loosely related.** 75% of all
   examples (60/80) land in the ≥95% confidence bucket, and even that bucket
   is only 76.7% accurate. A softmax score is not a calibrated probability —
   this model, like most classifiers trained on limited/synthetic data, is
   frequently confident and wrong at the same time. The original threshold
   (0.75, picked before this eval set existed) would have let most of those
   wrong-but-confident answers through untouched. 0.95 is the only point in
   the distribution where accuracy actually improves, so that's what
   `CONFIDENCE_THRESHOLD` is set to now — not because it's a good threshold
   in any absolute sense, but because it's the real one for *this* model, on
   *this* data, measured rather than assumed.

The deeper fix — temperature scaling, or routing on a signal other than raw
softmax confidence — is out of scope here, but "confidence thresholds need
calibration data to mean anything" is the actual lesson this project
surfaces, and it only showed up once a harder eval set existed.

## Why clarifying questions instead of an instant verdict

Early versions of this app showed a result the instant the on-device model
finished — including, for a single vague sentence like "I have a headache
and am feeling dizzy," an immediate **Emergency** verdict. That's not how an
actual triage assistant behaves (a nurse line asks follow-ups before
escalating), and it's a worse product besides: it reads as jumping to
conclusions on too little information.

`web/src/clarify.ts` + the `clarifying` phase in `App.tsx` insert a short
step between "on-device model is unsure or leans emergency" and "show a
result": three fixed questions (duration, severity, a red-flag check for
trouble breathing/chest pain/confusion/heavy bleeding). A "yes" on the
red-flag question hard-routes to emergency through a deterministic rule that
bypasses the model entirely — that check should never depend on classifier
confidence. Otherwise, the answers get folded back into the original text
and re-run through the *same* on-device/LLM pipeline with more context.

No new model or scoring logic was needed — more signal into the same
classifier was enough on its own to flip confidently-wrong guesses. The
headache-and-dizzy example above goes from an Emergency first guess to Self
care at 97% confidence once duration and severity are known.

## Why MobileBERT instead of DistilBERT

`ml/train.py` fine-tunes `google/mobilebert-uncased` (~25M params) rather
than the more commonly reached-for `distilbert-base-uncased` (~66M params).
MobileBERT is itself a distillation target built for on-device inference —
using it, then quantizing to int8 on top, compounds the size/latency
reduction instead of just picking "the smaller of two BERT variants."

## Why the LLM call goes through a server, not directly from the browser

An API key embedded in client-side JavaScript can be read out of the bundle
by anyone — it is not a secret once it ships, regardless of how it's
minified. `server/index.js` is a thin Express proxy that holds
`ANTHROPIC_API_KEY` and is the only thing that talks to Claude. The web app
only ever calls the proxy's `/triage/fallback` endpoint.

This is deployed as two separate Render services (`render.yaml`) rather than
one, specifically so the server can hold a secret the static site can't:
Render's static-site product has no server-side runtime to keep an API key
in, which is exactly why a static-only deploy (this project's first
iteration, on GitHub Pages) could only ever ship the on-device half of the
story. Splitting into a static site + a web service is what makes the full
routing behavior demonstrable publicly, not just in local dev.

Now that the server is genuinely public instead of a local dev convenience,
`server/index.js` also carries a per-IP rate limit and a process-lifetime
request budget (`GLOBAL_REQUEST_BUDGET`) as cost-abuse mitigations. Neither
is a substitute for real auth on an actual product — see "What's
intentionally out of scope" below.

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
- **Real auth on the server.** The rate limit and request budget stop casual
  abuse, not a determined attacker — there's no API key or account system
  gating `/triage/fallback`, which a real product would need.
- **A native mobile app.** An earlier version of this project shipped a
  React Native / ONNX Runtime Mobile app alongside the browser demo. It was
  dropped to keep one client instead of two drifting in and out of sync —
  the interesting parts (on-device inference, the routing decision, the
  clarifying-questions flow) are just as demonstrable in a browser, without
  needing a device or simulator to show anyone.
