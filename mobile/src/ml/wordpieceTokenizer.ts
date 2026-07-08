// Minimal BERT-style WordPiece tokenizer, implemented from scratch so the
// mobile app doesn't need a full JS ML runtime just to tokenize text —
// onnxruntime-react-native only runs the model graph, it does no NLP
// preprocessing, so this has to happen on the JS side using the same vocab
// the Python tokenizer used at training time.
//
// This intentionally does not handle CJK character segmentation or accent
// stripping (the training data is English-only symptom descriptions).

export interface TokenizerMeta {
  max_length: number;
  do_lower_case: boolean;
  cls_token: string;
  sep_token: string;
  pad_token: string;
  unk_token: string;
  labels: string[];
  id_to_label: Record<string, string>;
  placeholder?: boolean;
}

export interface EncodedInput {
  inputIds: BigInt64Array;
  attentionMask: BigInt64Array;
  tokenTypeIds: BigInt64Array;
}

const PUNCTUATION_RE = /([!-/:-@[-`{-~])/g;

function basicTokenize(text: string, doLowerCase: boolean): string[] {
  const normalized = doLowerCase ? text.toLowerCase() : text;
  const withSpacedPunctuation = normalized.replace(PUNCTUATION_RE, " $1 ");
  return withSpacedPunctuation.trim().split(/\s+/).filter(Boolean);
}

function wordpieceTokenize(
  token: string,
  vocab: Record<string, number>,
  unkToken: string,
  maxCharsPerWord = 100
): string[] {
  if (token.length > maxCharsPerWord) return [unkToken];

  const output: string[] = [];
  let start = 0;
  while (start < token.length) {
    let end = token.length;
    let matched: string | null = null;
    while (start < end) {
      let candidate = token.slice(start, end);
      if (start > 0) candidate = "##" + candidate;
      if (Object.prototype.hasOwnProperty.call(vocab, candidate)) {
        matched = candidate;
        break;
      }
      end -= 1;
    }
    if (matched === null) return [unkToken];
    output.push(matched);
    start = end;
  }
  return output;
}

export class WordpieceTokenizer {
  constructor(
    private vocab: Record<string, number>,
    private meta: TokenizerMeta
  ) {}

  get isReady(): boolean {
    return !this.meta.placeholder && Object.keys(this.vocab).length > 0;
  }

  encode(text: string): EncodedInput {
    const { max_length, do_lower_case, cls_token, sep_token, pad_token, unk_token } = this.meta;

    const basicTokens = basicTokenize(text, do_lower_case);
    const wordpieces: string[] = [cls_token];
    for (const token of basicTokens) {
      wordpieces.push(...wordpieceTokenize(token, this.vocab, unk_token));
    }
    wordpieces.push(sep_token);

    const truncated = wordpieces.slice(0, max_length);
    const padId = this.vocab[pad_token] ?? 0;
    const unkId = this.vocab[unk_token] ?? 0;

    const inputIds = new BigInt64Array(max_length);
    const attentionMask = new BigInt64Array(max_length);
    const tokenTypeIds = new BigInt64Array(max_length); // single-sequence input, all zeros

    for (let i = 0; i < max_length; i++) {
      if (i < truncated.length) {
        const id = this.vocab[truncated[i]] ?? unkId;
        inputIds[i] = BigInt(id);
        attentionMask[i] = 1n;
      } else {
        inputIds[i] = BigInt(padId);
        attentionMask[i] = 0n;
      }
    }

    return { inputIds, attentionMask, tokenTypeIds };
  }
}
