"""Exports the fine-tuned MobileBERT classifier to ONNX and quantizes it,
copying the result into web/public/model/ for the browser demo:
    - model.quant.onnx   (dynamically int8-quantized, what the app actually loads)
    - vocab.json          (token -> id map, for the JS-side WordPiece tokenizer)
    - tokenizer_meta.json (max_length, special token ids, label order)

Usage:
    python export_onnx.py --model-dir runs/mobilebert-triage/final
"""

import argparse
import json
import shutil
from pathlib import Path

from onnxruntime.quantization import QuantType, quantize_dynamic
from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

from labels import ID_TO_LABEL, LABELS

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEB_ASSETS_DIR = PROJECT_ROOT / "web" / "public" / "model"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default="runs/mobilebert-triage/final")
    parser.add_argument("--export-dir", default="export")
    parser.add_argument("--max-length", type=int, default=64)
    parser.add_argument("--skip-copy", action="store_true", help="don't copy into web/public/model")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    model_dir = root / args.model_dir
    export_dir = root / args.export_dir
    export_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading fine-tuned model from {model_dir}")
    ort_model = ORTModelForSequenceClassification.from_pretrained(model_dir, export=True)
    ort_model.save_pretrained(export_dir)
    tokenizer = AutoTokenizer.from_pretrained(model_dir)

    fp32_path = export_dir / "model.onnx"
    quant_path = export_dir / "model.quant.onnx"
    print(f"Quantizing {fp32_path} -> {quant_path} (dynamic int8)")
    quantize_dynamic(str(fp32_path), str(quant_path), weight_type=QuantType.QInt8)

    fp32_size = fp32_path.stat().st_size / 1e6
    quant_size = quant_path.stat().st_size / 1e6
    print(f"fp32 size: {fp32_size:.1f} MB, quantized size: {quant_size:.1f} MB")

    vocab_path = export_dir / "vocab.json"
    with open(vocab_path, "w") as f:
        json.dump(tokenizer.get_vocab(), f)

    meta = {
        "max_length": args.max_length,
        "do_lower_case": getattr(tokenizer, "do_lower_case", True),
        "cls_token": tokenizer.cls_token,
        "sep_token": tokenizer.sep_token,
        "pad_token": tokenizer.pad_token,
        "unk_token": tokenizer.unk_token,
        "labels": LABELS,
        "id_to_label": ID_TO_LABEL,
    }
    meta_path = export_dir / "tokenizer_meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"Wrote {vocab_path} and {meta_path}")

    if not args.skip_copy:
        WEB_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        for name, src in [
            ("model.quant.onnx", quant_path),
            ("vocab.json", vocab_path),
            ("tokenizer_meta.json", meta_path),
        ]:
            dest = WEB_ASSETS_DIR / name
            shutil.copy(src, dest)
            print(f"Copied {src.name} -> {dest}")


if __name__ == "__main__":
    main()
