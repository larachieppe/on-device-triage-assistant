"""Evaluates the fine-tuned model on the validation set and prints a per-class
report plus a confidence histogram — used to pick the on-device confidence
threshold that decides when the mobile app falls back to the LLM.

Usage:
    python eval.py --model-dir runs/mobilebert-triage/final
"""

import argparse
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import classification_report
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from labels import ID_TO_LABEL, LABELS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", default="runs/mobilebert-triage/final")
    parser.add_argument("--val-csv", default="data/triage_dataset_val.csv")
    parser.add_argument("--max-length", type=int, default=64)
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    tokenizer = AutoTokenizer.from_pretrained(root / args.model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(root / args.model_dir)
    model.eval()

    import csv

    texts, gold = [], []
    with open(root / args.val_csv) as f:
        for row in csv.DictReader(f):
            texts.append(row["text"])
            gold.append(row["label"])

    preds, confidences = [], []
    with torch.no_grad():
        for i in range(0, len(texts), 32):
            batch = texts[i : i + 32]
            enc = tokenizer(
                batch, truncation=True, padding=True, max_length=args.max_length, return_tensors="pt"
            )
            logits = model(**enc).logits
            probs = torch.softmax(logits, dim=-1)
            conf, idx = probs.max(dim=-1)
            preds.extend(ID_TO_LABEL[i] for i in idx.tolist())
            confidences.extend(conf.tolist())

    print(classification_report(gold, preds, labels=LABELS))

    confidences = np.array(confidences)
    correct = np.array([p == g for p, g in zip(preds, gold)])
    print("\nConfidence distribution:")
    for lo, hi in [(0.0, 0.5), (0.5, 0.7), (0.7, 0.85), (0.85, 0.95), (0.95, 1.01)]:
        mask = (confidences >= lo) & (confidences < hi)
        if mask.sum() == 0:
            continue
        print(
            f"  [{lo:.2f}, {hi:.2f}): n={mask.sum():4d}  accuracy={correct[mask].mean():.3f}"
        )

    print(
        "\nPick a fallback threshold where accuracy below it drops noticeably — "
        "that's the confidence cutoff to use in mobile/src/services/triageRouter.ts"
    )


if __name__ == "__main__":
    main()
