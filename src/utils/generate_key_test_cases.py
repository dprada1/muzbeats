from itertools import product

# Core components
roots = ["A", "B", "C", "D", "E", "F", "G"]
accidentals = ["#", "b", "♯", "♭", "sharp", "flat"]
qualities = ["major", "maj", "M", "minor", "min", "m"]

def normalize_acc(acc):
    return acc.replace("sharp", "#").replace("flat", "b")

def normalize_quality(q):
    return "maj" if q in ["major", "maj", "M"] else "min"

# --- 1-part root only ---
print(f"### 1-part keys (root only) ({len(roots)} combinations) ###\n")
counter = 1
for root in roots:
    print(f"{counter}. \"{root}\" → {root}maj, {root}min")
    counter += 1

# --- 2-part keys: root + quality (compact) ---
print(f"\n### 2-part keys (root + quality, compact only) ({len(roots) * len(qualities)} combinations) ###\n")
counter = 1
for root, qual in product(roots, qualities):
    q = normalize_quality(qual)
    joined = f"{root}{qual}"
    print(f"{counter}. \"{joined}\" → {root}{q}")
    counter += 1

# --- 2-part keys: root + quality (spaced, excluding 'm' and 'M') ---
filtered_qualities = [q for q in qualities if q not in ["m", "M"]]
print(f"\n### 2-part keys (root + quality, spaced — excluding 'm' and 'M') ({len(roots) * len(filtered_qualities)} combinations) ###\n")
counter = 1
for root, qual in product(roots, filtered_qualities):
    q = normalize_quality(qual)
    spaced = f"{root} {qual}"
    print(f"{counter}. \"{spaced}\" → {root}{q}")
    counter += 1

# --- 2-part keys: root + accidental (compact only) ---
acc_count = len(roots) * len(accidentals)
print(f"\n### 2-part keys (root + accidental, compact only) ({acc_count} combinations) ###\n")
counter = 1
for root, acc in product(roots, accidentals):
    norm = normalize_acc(acc)
    joined = f"{root}{acc}"
    print(f"{counter}. \"{joined}\" → {root}{norm}maj, {root}{norm}min")
    counter += 1

# --- 3-part keys: root + accidental + quality (with compact + spaced if sharp/flat) ---
compact_count = 0
spaced_count = 0
print(f"\n### 3-part keys (root + accidental + quality) (compact + 'sharp/flat' spaced only) ###\n")
counter = 1
for root, acc, qual in product(roots, accidentals, qualities):
    norm_acc = normalize_acc(acc)
    q = normalize_quality(qual)

    # Compact form always allowed
    joined = f"{root}{acc}{qual}"
    print(f"{counter}. \"{joined}\" → {root}{norm_acc}{q}")
    counter += 1
    compact_count += 1

    # Spaced form allowed only if acc is "sharp" or "flat"
    if acc in ["sharp", "flat"]:
        spaced = f"{root} {acc} {qual}"
        print(f"{counter}. \"{spaced}\" → {root}{norm_acc}{q}")
        counter += 1
        spaced_count += 1

total = compact_count + spaced_count
print(f"\nTotal 3-part combinations printed: {total} (compact: {compact_count}, spaced: {spaced_count})")
