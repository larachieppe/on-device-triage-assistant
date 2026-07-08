import { Asset } from "expo-asset";
import { InferenceSession, Tensor } from "onnxruntime-react-native";

import vocab from "../../assets/model/vocab.json";
import tokenizerMeta from "../../assets/model/tokenizer_meta.json";
import { TokenizerMeta, WordpieceTokenizer } from "./wordpieceTokenizer";

const MODEL_ASSET = require("../../assets/model/model.quant.onnx");

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

class OnDeviceClassifier {
  private sessionPromise: Promise<InferenceSession> | null = null;
  private tokenizer = new WordpieceTokenizer(vocab as Record<string, number>, tokenizerMeta as TokenizerMeta);

  get isModelBundled(): boolean {
    return this.tokenizer.isReady;
  }

  private async getSession(): Promise<InferenceSession> {
    if (!this.sessionPromise) {
      this.sessionPromise = (async () => {
        const asset = Asset.fromModule(MODEL_ASSET);
        await asset.downloadAsync();
        if (!asset.localUri) {
          throw new Error("Failed to resolve a local URI for the ONNX model asset");
        }
        return InferenceSession.create(asset.localUri);
      })();
    }
    return this.sessionPromise;
  }

  async classify(text: string): Promise<ClassificationResult> {
    if (!this.isModelBundled) {
      throw new Error(
        "On-device model is not bundled yet. Run `python ml/export_onnx.py` from the project " +
          "root, then rebuild the app, to populate mobile/assets/model/."
      );
    }

    const startedAt = Date.now();
    const session = await this.getSession();
    const { inputIds, attentionMask, tokenTypeIds } = this.tokenizer.encode(text);
    const seqLen = inputIds.length;

    const feeds: Record<string, Tensor> = {
      input_ids: new Tensor("int64", inputIds, [1, seqLen]),
      attention_mask: new Tensor("int64", attentionMask, [1, seqLen]),
      token_type_ids: new Tensor("int64", tokenTypeIds, [1, seqLen]),
    };

    const output = await session.run(feeds);
    const logitsTensor = output["logits"] ?? output[Object.keys(output)[0]];
    const logits = logitsTensor.data as Float32Array;

    const probs = softmax(logits);
    const meta = tokenizerMeta as TokenizerMeta;
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
      latencyMs: Date.now() - startedAt,
      source: "on_device",
    };
  }
}

export const onDeviceClassifier = new OnDeviceClassifier();
