"""Generates a synthetic symptom-triage dataset for training the on-device classifier.

IMPORTANT: This data is template-generated for a portfolio demo and is NOT
medically validated. Do not use the resulting model for real triage decisions.
For a production system, replace this with a licensed clinical dataset
(e.g. a symptom-checker corpus) and clinician-reviewed labels.

Usage:
    python generate_synthetic_data.py --out data/triage_dataset.csv --n-per-label 800
"""

import argparse
import csv
import random
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from labels import LABELS

random.seed(7)

SELF_CARE = {
    "cores": [
        "a mild headache", "a runny nose", "a slight sore throat", "a dry cough",
        "mild muscle soreness after exercise", "a small paper cut on my finger",
        "occasional hiccups", "a bit of nasal congestion", "mild seasonal allergies",
        "a slightly upset stomach after eating", "dry, chapped lips",
        "a small bruise on my leg", "mild fatigue after a long day",
        "a stuffy nose", "an itchy mosquito bite",
    ],
    "modifiers": [
        "it's been going on for a day", "it comes and goes",
        "it's pretty minor", "it doesn't stop me from my normal routine",
        "over-the-counter medicine seems to help", "it's mild and manageable",
        "", "resting seems to help",
    ],
}

ROUTINE_CARE = {
    "cores": [
        "a persistent cough that has lasted over a week",
        "mild joint pain that's been around for a couple weeks",
        "a rash that hasn't gone away after several days",
        "recurring mild migraines a few times a month",
        "low-grade fatigue for the past two weeks",
        "occasional mild heartburn after meals",
        "a small lump I noticed that isn't painful",
        "intermittent mild lower back pain",
        "trouble sleeping for the last two weeks",
        "mild ear discomfort that comes and goes",
        "a wart that hasn't gone away",
        "irregular but not severe menstrual cramps",
    ],
    "modifiers": [
        "it's not getting worse but it's not going away either",
        "it's manageable but I'd like it checked out",
        "I've had it for a couple of weeks now",
        "it's not urgent but I want a doctor's opinion",
        "nothing I do seems to fully fix it",
        "",
    ],
}

URGENT_CARE = {
    "cores": [
        "a fever of 102F that started this morning",
        "a moderate cut that won't stop bleeding",
        "sharp abdominal pain that started a few hours ago",
        "a sprained ankle that's swelling quickly",
        "vomiting several times in the last few hours",
        "a severe migraine unlike any I've had before",
        "sudden severe ear pain",
        "a deep cut that might need stitches",
        "a fever with chills that's gotten worse today",
        "sudden onset of intense back pain",
        "an allergic reaction with hives spreading",
        "difficulty keeping food down for the past day",
    ],
    "modifiers": [
        "it's getting worse quickly", "it started suddenly a few hours ago",
        "the pain is pretty severe", "I'm worried it needs attention today",
        "it's not improving with rest", "",
    ],
}

EMERGENCY = {
    "cores": [
        "crushing chest pain radiating to my left arm",
        "sudden difficulty breathing and gasping for air",
        "one side of my face suddenly drooping and slurred speech",
        "severe uncontrolled bleeding from a deep wound",
        "loss of consciousness for several seconds",
        "sudden confusion and inability to recognize where I am",
        "a severe allergic reaction with throat swelling and trouble breathing",
        "signs of a stroke, numbness on one side of the body",
        "a seizure that has lasted over five minutes",
        "coughing up blood",
        "severe chest tightness and shortness of breath at rest",
        "a head injury with vomiting and extreme drowsiness",
    ],
    "modifiers": [
        "it started suddenly and is severe", "I can barely breathe",
        "this feels life-threatening", "it's not stopping",
        "I need help right now", "",
    ],
}

TEMPLATES = [
    "I have {core}. {modifier}",
    "I've been experiencing {core}. {modifier}",
    "My symptom is {core}, {modifier}",
    "{core}, {modifier}",
    "For the past little while I've had {core}. {modifier}",
    "I'm dealing with {core} and wanted advice. {modifier}",
]

BUCKETS = {
    "self_care": SELF_CARE,
    "routine_care": ROUTINE_CARE,
    "urgent_care": URGENT_CARE,
    "emergency": EMERGENCY,
}


def make_example(label: str) -> str:
    bucket = BUCKETS[label]
    core = random.choice(bucket["cores"])
    modifier = random.choice(bucket["modifiers"])
    template = random.choice(TEMPLATES)
    text = template.format(core=core, modifier=modifier)
    text = " ".join(text.split())  # collapse whitespace from empty modifiers
    text = text.replace(" .", ".").replace(" ,", ",")
    return text.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/triage_dataset.csv")
    parser.add_argument("--n-per-label", type=int, default=800)
    parser.add_argument("--val-split", type=float, default=0.15)
    args = parser.parse_args()

    out_path = Path(__file__).resolve().parent.parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    seen = set()
    for label in LABELS:
        made = 0
        attempts = 0
        while made < args.n_per_label and attempts < args.n_per_label * 20:
            attempts += 1
            text = make_example(label)
            key = (label, text)
            if key in seen:
                continue
            seen.add(key)
            rows.append({"text": text, "label": label})
            made += 1

    random.shuffle(rows)
    split_idx = int(len(rows) * (1 - args.val_split))
    train_rows, val_rows = rows[:split_idx], rows[split_idx:]

    def write_csv(path, data):
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["text", "label"])
            writer.writeheader()
            writer.writerows(data)

    train_path = out_path.with_name(out_path.stem + "_train.csv")
    val_path = out_path.with_name(out_path.stem + "_val.csv")
    write_csv(train_path, train_rows)
    write_csv(val_path, val_rows)

    print(f"Wrote {len(train_rows)} train rows to {train_path}")
    print(f"Wrote {len(val_rows)} val rows to {val_path}")


if __name__ == "__main__":
    main()
