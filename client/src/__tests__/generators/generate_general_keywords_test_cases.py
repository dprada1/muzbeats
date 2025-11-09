import json
from typing import List, TypedDict
import os

class KeywordTestCase(TypedDict):
    input: str
    expected: List[str]

# Re-create the test cases after code execution reset
keyword_test_cases: List[KeywordTestCase] = [
    { "input": "pierre bright",           "expected": ["pierre", "bright"] },
    { "input": "pierre C#m 160",          "expected": ["pierre"] },
    { "input": "dark aggressive trap",    "expected": ["dark", "aggressive", "trap"] },
    { "input": "lofi 85",                 "expected": ["lofi"] },
    { "input": "Amin jazzy chill",        "expected": ["jazzy", "chill"] },
    { "input": "space ambient 120 bpm",   "expected": ["space", "ambient"] },
    { "input": "Cmaj",                    "expected": [] },
    { "input": "150",                     "expected": [] },
    { "input": "",                        "expected": [] },
    { "input": "hyperpop overload bmin",  "expected": ["hyperpop", "overload"] },
    { "input": "trap aggressive 160",     "expected": ["trap", "aggressive"] },
    { "input": "kickless void 90",        "expected": ["kickless", "void"] },
    { "input": "west coast 90 Amin",      "expected": ["west", "coast"] },
    { "input": "synth glitchy Bmaj",      "expected": ["synth", "glitchy"] }
]

# Save test cases to file
OUTPUT_PATH = "src/__tests__/search/general_keywords/general_keywords_cases.json"

try:
    with open(OUTPUT_PATH, "w") as f:
        json.dump(keyword_test_cases, f, indent=4)
    print(f"✅ Test cases successfully written to '{OUTPUT_PATH}'.")
    print(f"📁 File location: {os.path.abspath(OUTPUT_PATH)}")
    print(f"🧪 Total test cases: {len(keyword_test_cases)}")
except Exception as e:
    print("❌ Failed to write test cases!")
    print(f"Error: {e}")
