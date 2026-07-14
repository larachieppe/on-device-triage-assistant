import * as ort from "onnxruntime-web";

import { ONNXRUNTIME_WEB_VERSION } from "../config";
import { type TokenizerMeta, WordpieceTokenizer } from "./wordpieceTokenizer";

// Loading WASM binaries from a CDN sidesteps bundler-specific config for
// onnxruntime-web's binary assets — fine for a demo, but a production app
// would self-host these for offline/CSP reasons.
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ONNXRUNTIME_WEB_VERSION}/dist/`;

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
  private sessionPromise: Promise<ort.InferenceSession> | null = null;

  private async getBundle(): Promise<ModelBundle> {
    if (!this.bundlePromise) {
      this.bundlePromise = (async () => {
        const [vocab, meta] = await Promise.all([
          fetch("/model/vocab.json").then((r) => r.json()),
          fetch("/model/tokenizer_meta.json").then((r) => r.json()) as Promise<TokenizerMeta>,
        ]);
        return { tokenizer: new WordpieceTokenizer(vocab, meta), meta };
      })();
    }
    return this.bundlePromise;
  }

  private async getSession(): Promise<ort.InferenceSession> {
    if (!this.sessionPromise) {
      this.sessionPromise = ort.InferenceSession.create("/model/model.quant.onnx", {
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

    const feeds: Record<string, ort.Tensor> = {
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
