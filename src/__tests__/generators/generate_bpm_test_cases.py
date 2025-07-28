from typing import List, TypedDict
import json
import os

# Define the structure of each test case
class BpmTestCase(TypedDict):
    input: str
    bpmValues: List[int]
    bpmRanges: List[List[int]]

# Define the test cases
bpm_test_cases: List[BpmTestCase] = [
    {"input": "160", "bpmValues": [160], "bpmRanges": []},
    {"input": "160bpm", "bpmValues": [160], "bpmRanges": []},
    {"input": "bpm160", "bpmValues": [160], "bpmRanges": []},
    {"input": "160 bpm", "bpmValues": [160], "bpmRanges": []},
    {"input": "150-170", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "150-170bpm", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "bpm150-170", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "150-170 bpm", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "999", "bpmValues": [], "bpmRanges": []},
    {"input": "40-60", "bpmValues": [], "bpmRanges": [[40, 60]]},
    {"input": "0", "bpmValues": [], "bpmRanges": []},
    {"input": "-1", "bpmValues": [], "bpmRanges": []},
    {"input": "0-0", "bpmValues": [], "bpmRanges": []},
    {"input": "130-130", "bpmValues": [130], "bpmRanges": []},
    {"input": "-130--130", "bpmValues": [], "bpmRanges": []},
    {"input": "-130-130", "bpmValues": [], "bpmRanges": []},
    {"input": "", "bpmValues": [], "bpmRanges": []},
    {"input": "no match", "bpmValues": [], "bpmRanges": []},
    {"input": " 160 BPM ", "bpmValues": [160], "bpmRanges": []},
    {"input": "bPm150-170BpM", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "150 -170", "bpmValues": [150], "bpmRanges": []},
    {"input": "150- 170", "bpmValues": [170], "bpmRanges": []},
    {"input": "150 - 170", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "150–170", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "150—170", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "160.0", "bpmValues": [160], "bpmRanges": []},
    {"input": "160.5bpm", "bpmValues": [], "bpmRanges": []},
    {"input": "+160", "bpmValues": [160], "bpmRanges": []},
    {"input": "0150", "bpmValues": [], "bpmRanges": []},
    {"input": "0150-0170", "bpmValues": [], "bpmRanges": []},
    {"input": "170-150", "bpmValues": [], "bpmRanges": []},
    {"input": "100 bpm 200 BPM", "bpmValues": [100, 200], "bpmRanges": []},
    {"input": "90-110 120 130bpm", "bpmValues": [120, 130], "bpmRanges": [[90, 110]]},
    {"input": "100bpm 200", "bpmValues": [100, 200], "bpmRanges": []},
    {"input": "100-110bpm 200-210bpm", "bpmValues": [], "bpmRanges": [[100, 110]]},
    {"input": "BPM 160", "bpmValues": [160], "bpmRanges": []},
    {"input": "bpm 150-170", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "abc-xyz bpm", "bpmValues": [], "bpmRanges": []},
    {"input": "160-xyz", "bpmValues": [], "bpmRanges": []},
    {"input": "12", "bpmValues": [], "bpmRanges": []},
    {"input": "1000", "bpmValues": [], "bpmRanges": []},
    {"input": "160bpm and some", "bpmValues": [160], "bpmRanges": []},
    {"input": "abc160", "bpmValues": [], "bpmRanges": []},
    {"input": "8", "bpmValues": [], "bpmRanges": []},
    {"input": "-8", "bpmValues": [], "bpmRanges": []},
    {"input": "150 - 170 bpm", "bpmValues": [], "bpmRanges": [[150, 170]]},
    {"input": "001-002bpm", "bpmValues": [], "bpmRanges": []},
    {"input": "5-7", "bpmValues": [], "bpmRanges": []},
    {"input": "150 bpm-170", "bpmValues": [150], "bpmRanges": []},
    {"input": "bpm", "bpmValues": [], "bpmRanges": []},
    {"input": "bpm bpm", "bpmValues": [], "bpmRanges": []},
    {"input": "2001", "bpmValues": [], "bpmRanges": []}
]

# Save the file
OUTPUT_PATH = "src/__tests__/search/bpm/bpm_test_cases.json"

try:
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(bpm_test_cases, f, ensure_ascii=False, indent=4)
    print(f"✅ Successfully wrote {len(bpm_test_cases)} BPM test cases to:")
    print(f"📁 {os.path.abspath(OUTPUT_PATH)}")
except Exception as e:
    print("❌ Failed to write bpm_test_cases.json.")
    print(f"Error: {e}")
