"""
generate_key_test_cases.py

Prints all allowed musical key input combinations for search-bar test cases.
Covers the following categories:
 1) Single-letter roots (X)
 2) Root+Accidental (XA)
 3) Root <space> Accidental (X A)
 4) Root+Quality (XQ)
 5) Root <space> Quality (X Q)
 6) Root+Accidental+Quality (XAQ)
 7) Root <space> Accidental <space> Quality (X A Q)

Normalization rules:
 - Accidentals: '#', '♯', 'sharp' → '#'; 'b', '♭', 'flat' → 'b'
 - Qualities: 'major','maj','M' → 'maj'; 'minor','min','m' → 'min'
"""
from itertools import product
import json
from typing import List, Dict, Union

# Define elements
Roots = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
accidentals: List[str] = ['#', '♯', 'sharp', 'b', '♭', 'flat']
qualities: List[str] = ['major', 'maj', 'M', 'minor', 'min', 'm']

# Prepare cases list with explicit typing to satisfy Pylance
cases: List[Dict[str, Union[str, List[str]]]] = []  # used for JSON output

# Normalization helpers
def normalize_acc(a: str) -> str:
    a_low = a.lower()
    if a_low in ['#', '♯', 'sharp']:
        return '#'
    if a_low in ['b', '♭', 'flat']:
        return 'b'
    return a_low

def normalize_quality(q: str) -> str:
    if q in ['major', 'maj', 'M']:
        return 'maj'
    if q in ['minor', 'min', 'm']:
        return 'min'
    return q.lower()

def main():
    counter = 1

    # 1) Single-letter roots (X) → both major & minor
    print("### Case-1 keys: <root> → both maj & min ###\n")
    for root in Roots:
        print(f"{counter}. \"{root}\" → {root}maj, {root}min")
        cases.append({
            "input": root,
            "expected": [f"{root}maj", f"{root}min"]
        })
        counter += 1

    # 2) Root+Accidental (XA, no space) → both major & minor
    print("\n### Case-2 keys: <root><accidental> → both maj & min ###\n")
    for root, acc in product(Roots, accidentals):
        na = normalize_acc(acc)
        inp = f"{root}{acc}"
        print(f"{counter}. \"{inp}\" → {root}{na}maj, {root}{na}min")
        cases.append({
            "input": inp,
            "expected": [f"{root}{na}maj", f"{root}{na}min"]
        })
        counter += 1

    # 3) Root <space> Accidental (X A, spaced; only word forms) → both major & minor
    print("\n### Case-3 keys: <root> <accidental> → both maj & min ###\n")
    for root, acc in product(Roots, ['sharp', 'flat']):
        na = normalize_acc(acc)
        inp = f"{root} {acc}"
        print(f"{counter}. \"{inp}\" → {root}{na}maj, {root}{na}min")
        cases.append({
            "input": inp,
            "expected": [f"{root}{na}maj", f"{root}{na}min"]
        })
        counter += 1

    # 4) Root+Quality (XQ, no space)
    print("\n### Case-4 keys: <root><quality> (no space) ###\n")
    for root, qual in product(Roots, qualities):
        nq = normalize_quality(qual)
        inp = f"{root}{qual}"
        print(f"{counter}. \"{inp}\" → {root}{nq}")
        cases.append({
            "input": inp,
            "expected": f"{root}{nq}"
        })
        counter += 1

    # 5) Root <space> Quality (X Q, spaced; exclude single-letter M/m)
    print("\n### Case-5 keys: <root> <quality> (spaced, exclude M/m) ###\n")
    for root, qual in product(Roots, qualities):
        if qual in ['M', 'm']:
            continue
        nq = normalize_quality(qual)
        inp = f"{root} {qual}"
        print(f"{counter}. \"{inp}\" → {root}{nq}")
        cases.append({
            "input": inp,
            "expected": f"{root}{nq}"
        })
        counter += 1

    # 6) Root+Accidental+Quality (XAQ, no spaces)
    print("\n### Case-6 keys: <root><accidental><quality> (no spaces) ###\n")
    for root, acc, qual in product(Roots, accidentals, qualities):
        na = normalize_acc(acc)
        nq = normalize_quality(qual)
        inp = f"{root}{acc}{qual}"
        print(f"{counter}. \"{inp}\" → {root}{na}{nq}")
        cases.append({
            "input": inp,
            "expected": f"{root}{na}{nq}"
        })
        counter += 1

    # 7) Root <space> Accidental <space> Quality (X A Q, spaced; only word forms, exclude single-letter Q)
    print("\n### Case-7 keys: <root> <accidental> <quality> (spaced, exclude M/m) ###\n")
    for root, acc, qual in product(Roots, ['sharp', 'flat'], ['major', 'maj', 'minor', 'min']):
        na = normalize_acc(acc)
        nq = normalize_quality(qual)
        inp = f"{root} {acc} {qual}"
        print(f"{counter}. \"{inp}\" → {root}{na}{nq}")
        cases.append({
            "input": inp,
            "expected": f"{root}{na}{nq}"
        })
        counter += 1

    # Summary and write JSON file
    print(f"\nTotal combinations printed: {counter - 1}")
    with open("src/__tests__/key_test_cases.json", "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=4)
    print(f"Wrote {len(cases)} key test cases to key_test_cases.json")

# Main generation logic
if __name__ == '__main__':
    main()
