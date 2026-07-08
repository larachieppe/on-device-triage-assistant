"""Triage label schema shared by data generation, training, and export."""

LABELS = [
    "self_care",     # can be managed at home, no visit needed
    "routine_care",  # should see a doctor, not urgent (days)
    "urgent_care",   # needs care same-day / within hours
    "emergency",      # call emergency services / ER now
]

LABEL_TO_ID = {label: i for i, label in enumerate(LABELS)}
ID_TO_LABEL = {i: label for label, i in LABEL_TO_ID.items()}

# Shown in the mobile UI and used to gate the LLM fallback for emergency cases
LABEL_DESCRIPTIONS = {
    "self_care": "Likely manageable at home with rest, fluids, or OTC remedies.",
    "routine_care": "Worth a routine doctor's visit, not time-critical.",
    "urgent_care": "See a clinician same-day or within a few hours.",
    "emergency": "Seek emergency care immediately.",
}
