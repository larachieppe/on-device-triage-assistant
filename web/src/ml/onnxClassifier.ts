// Type-only: the actual runtime comes from the CDN <script> tag in
// index.html (see its comment for why), which sets window.ort. A normal
// `import * as ort` would make Vite bundle onnxruntime-web's ~27MB WASM
// binary into the build regardless of that CDN override.
import type * as OrtNamespace from "onnxruntime-web";

import { ONNXRUNTIME_WEB_VERSION } from "../config";
import { type TokenizerMeta, WordpieceTokenizer } from "./wordpieceTokenizer";

const ort = (globalThis as unknown as { ort: typeof OrtNamespace }).ort;

ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ONNXRUNTIME_WEB_VERSION}/dist/`;

// import.meta.env.BASE_URL, not a hardcoded "/", because the production
// build is served from a GitHub Pages project subpath
// (/on-device-triage-assistant/) rather than the domain root — see
// vite.config.ts. A literal "/model/..." string here would resolve against
// the site root and 404 in production while working fine in local dev.
const MODEL_BASE = import.meta.env.BASE_URL;

export interface ClassificationResult {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
  latencyMs: number;
  source: "on_device";
}

function softmax(logits: Float32Array | number[]): number[] {
  const max = Math.max(...logits);
  const exps = Array.from(logits, (v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

interface ModelBundle {
  tokenizer: WordpieceTokenizer;
  meta: TokenizerMeta;
}

class OnDeviceClassifier {
  private bundlePromise: Promise<ModelBundle> | null = null;
  private sessionPromise: Promise<OrtNamespace.InferenceSession> | null = null;

  private async getBundle(): Promise<ModelBundle> {
    if (!this.bundlePromise) {
      this.bundlePromise = (async () => {
        const [vocab, meta] = await Promise.all([
          fetch(`${MODEL_BASE}model/vocab.json`).then((r) => r.json()),
          fetch(`${MODEL_BASE}model/tokenizer_meta.json`).then((r) => r.json()) as Promise<TokenizerMeta>,
        ]);
        return { tokenizer: new WordpieceTokenizer(vocab, meta), meta };
      })();
    }
    return this.bundlePromise;
  }

  private async getSession(): Promise<OrtNamespace.InferenceSession> {
    if (!this.sessionPromise) {
      this.sessionPromise = ort.InferenceSession.create(`${MODEL_BASE}model/model.quant.onnx`, {
        executionProviders: ["wasm"],
      });
    }
    return this.sessionPromise;
  }

  async isModelReady(): Promise<boolean> {
    const { tokenizer } = await this.getBundle();
    return tokenizer.isReady;
  }

  async classify(text: string): Promise<ClassificationResult> {
    const { tokenizer, meta } = await this.getBundle();
    if (!tokenizer.isReady) {
      throw new Error(
        "On-device model is not bundled yet. Run `python ml/export_onnx.py` from the project " +
          "root, then reload — it copies the real files into web/public/model/."
      );
    }

    const startedAt = performance.now();
    const session = await this.getSession();
    const { inputIds, attentionMask, tokenTypeIds } = tokenizer.encode(text);
    const seqLen = inputIds.length;

    const feeds: Record<string, OrtNamespace.Tensor> = {
      input_ids: new ort.Tensor("int64", inputIds, [1, seqLen]),
      attention_mask: new ort.Tensor("int64", attentionMask, [1, seqLen]),
      token_type_ids: new ort.Tensor("int64", tokenTypeIds, [1, seqLen]),
    };

    const output = await session.run(feeds);
    const logitsTensor = output["logits"] ?? output[Object.keys(output)[0]];
    const logits = logitsTensor.data as Float32Array;

    const probs = softmax(logits);
    const probabilities: Record<string, number> = {};
    meta.labels.forEach((label, i) => {
      probabilities[label] = probs[i];
    });

    let bestIdx = 0;
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > probs[bestIdx]) bestIdx = i;
    }

    return {
      label: meta.labels[bestIdx],
      confidence: probs[bestIdx],
      probabilities,
      latencyMs: Math.round(performance.now() - startedAt),
      source: "on_device",
    };
  }
}

export const onDeviceClassifier = new OnDeviceClassifier();
