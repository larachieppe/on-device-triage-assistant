"""Fine-tunes a small, mobile-friendly transformer on the symptom-triage dataset.

Uses MobileBERT (google/mobilebert-uncased) as the base model: it's itself a
distillation target designed for on-device inference (~25M params vs BERT-base's
110M), which is why it's picked over distilbert-base here — the whole point of
this project is minimizing what has to run on-device.

Usage:
    python train.py --epochs 4 --out-dir runs/mobilebert-triage
"""

import argparse
from pathlib import Path

import numpy as np
from datasets import load_dataset
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

from labels import ID_TO_LABEL, LABEL_TO_ID, LABELS

BASE_MODEL = "google/mobilebert-uncased"


def load_and_tokenize(tokenizer, train_csv, val_csv, max_length=64):
    ds = load_dataset(
        "csv",
        data_files={"train": str(train_csv), "validation": str(val_csv)},
    )

    def encode(batch):
        tokenized = tokenizer(
            batch["text"], truncation=True, padding="max_length", max_length=max_length
        )
        tokenized["labels"] = [LABEL_TO_ID[label] for label in batch["label"]]
        return tokenized

    return ds.map(encode, batched=True, remove_columns=["text", "label"])


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1_macro": f1_score(labels, preds, average="macro"),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-csv", default="data/triage_dataset_train.csv")
    parser.add_argument("--val-csv", default="data/triage_dataset_val.csv")
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-5)
    parser.add_argument("--out-dir", default="runs/mobilebert-triage")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model,
        num_labels=len(LABELS),
        id2label=ID_TO_LABEL,
        label2id=LABEL_TO_ID,
    )

    dataset = load_and_tokenize(tokenizer, root / args.train_csv, root / args.val_csv)

    out_dir = root / args.out_dir
    training_args = TrainingArguments(
        output_dir=str(out_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.lr,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        logging_steps=20,
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        compute_metrics=compute_metrics,
    )

    trainer.train()
    metrics = trainer.evaluate()
    print("Final validation metrics:", metrics)

    final_dir = out_dir / "final"
    trainer.save_model(str(final_dir))
    tokenizer.save_pretrained(str(final_dir))
    print(f"Saved fine-tuned model + tokenizer to {final_dir}")


if __name__ == "__main__":
    main()
