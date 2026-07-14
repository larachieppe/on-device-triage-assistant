"""Hand-written, non-templated eval set — deliberately harder than the
templated training/validation data. The synthetic generator produces
grammatically uniform sentences drawn from a fixed vocabulary, which the
model can (and did) memorize to 100% validation accuracy. That number is
meaningless as a confidence-threshold signal. This set uses casual,
inconsistent, real-world phrasing (slang, typos, run-ons, multi-symptom
descriptions) to see how the model actually behaves on text it wasn't
trained to expect — which is the only honest basis for picking
CONFIDENCE_THRESHOLD.

Usage:
    python data/hard_eval_set.py --out data/hard_eval_set.csv
"""

import argparse
import csv
from pathlib import Path

EXAMPLES = [
    # self_care
    ("kinda have a scratchy throat today, nbd", "self_care"),
    ("stubbed my toe on the coffee table, hurts but I can walk fine", "self_care"),
    ("got a paper cut making dinner, put a bandaid on it", "self_care"),
    ("sneezing a lot today, probably just allergies from the pollen", "self_care"),
    ("little sunburn on my shoulders from the beach yesterday", "self_care"),
    ("hiccups won't stop lol", "self_care"),
    ("mosquito bites all over my legs, so itchy", "self_care"),
    ("woke up with a crick in my neck, slept weird", "self_care"),
    ("eyes are a bit dry from staring at my screen all day", "self_care"),
    ("got a blister on my heel from new shoes", "self_care"),
    ("slight headache, probably didn't drink enough water", "self_care"),
    ("chapped lips from the cold weather", "self_care"),
    ("a little gassy after eating beans lol", "self_care"),
    ("minor scrape on my knee from tripping, cleaned it up already", "self_care"),
    ("yawning nonstop, just tired from work this week", "self_care"),
    ("nose is a little stuffy, might be a cold coming on", "self_care"),
    ("sore from the gym yesterday, pretty sure it's just DOMS", "self_care"),
    ("hangnail is bugging me, otherwise fine", "self_care"),
    ("feel a little bloated after lunch, ate too fast", "self_care"),
    ("dry cough here and there today, not a big deal", "self_care"),
    # routine_care
    ("this mole on my back looks a little different than before, should probably get it checked eventually", "routine_care"),
    ("my knee has been clicking for like 3 weeks now, not painful just weird", "routine_care"),
    ("I've had this same headache pattern every few days for the past month", "routine_care"),
    ("my allergies have been way worse than usual this whole season", "routine_care"),
    ("noticed I'm more tired than usual for the past couple weeks", "routine_care"),
    ("small lump under my arm, doesn't hurt, been there a week or two", "routine_care"),
    ("my acid reflux has been acting up most nights this month", "routine_care"),
    ("haven't been sleeping great for like two weeks straight", "routine_care"),
    ("this rash on my arm has been there for 10 days and isn't going away", "routine_care"),
    ("my lower back has been stiff on and off for a few weeks", "routine_care"),
    ("I think I need new glasses, things have been blurry for a while", "routine_care"),
    ("my periods have been irregular the last couple months", "routine_care"),
    ("there's a wart on my finger that's been there for about a month", "routine_care"),
    ("ringing in my ears comes and goes, been happening for weeks", "routine_care"),
    ("I've had a mild cough for almost two weeks now", "routine_care"),
    ("feel anxious more days than not lately, wanted to talk to someone", "routine_care"),
    ("my joints ache a bit every morning lately", "routine_care"),
    ("this ingrown toenail has been bothering me for a while", "routine_care"),
    ("keep getting canker sores, seems more often than normal for me", "routine_care"),
    ("my skin has been really dry and flaky for weeks despite lotion", "routine_care"),
    # urgent_care
    ("twisted my ankle pretty bad on a run, it's swelling up fast", "urgent_care"),
    ("have a fever of like 102 that just started today", "urgent_care"),
    ("cut my hand pretty deep chopping vegetables, still bleeding through the towel", "urgent_care"),
    ("been throwing up since this morning, can't keep anything down", "urgent_care"),
    ("sudden really bad tooth pain, whole side of my face aches", "urgent_care"),
    ("my kid fell off the swing and their arm looks bent wrong", "urgent_care"),
    ("got stung by a bee and my hand is swelling up a lot", "urgent_care"),
    ("woke up with my eye completely swollen shut and red", "urgent_care"),
    ("sharp pain in my side that came on suddenly a few hours ago", "urgent_care"),
    ("think I have a UTI, burning a lot and it's getting worse today", "urgent_care"),
    ("fever and chills came on fast, feel awful all of a sudden", "urgent_care"),
    ("twisted my wrist bad, can't move it much and it's swelling", "urgent_care"),
    ("migraine so bad I can't see straight, worse than usual for me", "urgent_care"),
    ("allergic reaction, hives spreading across my chest right now", "urgent_care"),
    ("ear pain came on suddenly and it's really sharp", "urgent_care"),
    ("think I sprained something, foot is swelling and I can't put weight on it", "urgent_care"),
    ("high fever in my toddler, over 103, not acting like themselves", "urgent_care"),
    ("deep splinter I can't get out, area around it is red and warm", "urgent_care"),
    ("vomiting and can't keep water down for hours now", "urgent_care"),
    ("burn from the stove, skin is blistering already", "urgent_care"),
    # emergency
    ("chest feels really tight and I'm having trouble breathing", "emergency"),
    ("my dad suddenly can't talk right and his face looks droopy on one side", "emergency"),
    ("cut myself badly with a knife and it won't stop bleeding no matter what", "emergency"),
    ("passed out for a few seconds just now, kind of scared", "emergency"),
    ("can't breathe right, chest hurts, arm feels numb", "emergency"),
    ("my son swallowed something and is gagging, can't tell if he's breathing okay", "emergency"),
    ("having the worst headache of my life, came on all at once", "emergency"),
    ("throat feels like it's closing up after eating peanuts", "emergency"),
    ("grandma fell and hit her head, now she's really confused and drowsy", "emergency"),
    ("coughing up blood, quite a bit of it", "emergency"),
    ("having a seizure right now, it's been going on a few minutes", "emergency"),
    ("stabbing chest pain going down my left arm", "emergency"),
    ("can barely breathe, lips are turning blue", "emergency"),
    ("someone just collapsed in front of me and isn't responding", "emergency"),
    ("severe allergic reaction, throat closing, can't breathe well", "emergency"),
    ("baby is limp and not responding, please help", "emergency"),
    ("massive bleeding from a car accident, can't get it to stop", "emergency"),
    ("sudden numbness on one whole side of my body", "emergency"),
    ("overdosed on something, feeling really out of it and scared", "emergency"),
    ("chest pain and sweating a ton, feels like an elephant sitting on my chest", "emergency"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/hard_eval_set.csv")
    args = parser.parse_args()

    out_path = Path(__file__).resolve().parent.parent / args.out
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "label"])
        writer.writerows(EXAMPLES)

    print(f"Wrote {len(EXAMPLES)} hand-written examples to {out_path}")


if __name__ == "__main__":
    main()
