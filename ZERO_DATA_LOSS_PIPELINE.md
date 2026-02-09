# Zero Data Loss Extraction Pipeline

## Date: 2026-02-09

## Problem Statement

Previous implementations were losing data:
- Dates were wrong (1970/1973 issues)
- Multiple test occurrences were merged
- Some rows disappeared
- LLM was over-interpreting instead of preserving facts

## Solution: Two-Phase Pipeline

### Core Principle
**ZERO DATA LOSS**: If a report shows 3 creatinine values, the system MUST output 3 creatinine rows.

### Phase 1: Raw Row Extraction (Deterministic, No LLM)

**File:** `src/utils/rawRowExtractor.js`

**Rules:**
- Extract EXACTLY what appears in the report
- One visible line = one raw row
- Preserve order exactly as seen
- Never merge rows
- Never delete rows
- No LLM involved

**Output Format:**
```json
[
  {
    "row_id": 1,
    "raw_text": "exact text as seen in the report"
  },
  {
    "row_id": 2,
    "raw_text": "next line from report"
  }
]
```

**Supported File Types:**
- PDF: Line-by-line extraction
- Image: OCR output line-by-line
- CSV: Each CSV row = one raw row

**Example:**
```
Input: 20 lines in report
Output: 20 raw rows (guaranteed)
```

### Phase 2: LLM Normalization (Strict Mode)

**File:** `src/utils/llmNormalizer.js`

**Rules:**
- Process each raw row independently
- Input row count MUST equal output row count
- Never delete, merge, or invent rows
- If unclear, return null
- If date ambiguous, set date_status = 'ambiguous'
- Do NOT calculate medical values
- Do NOT summarize or interpret

**LLM Prompt (Exact):**
```
You are a medical data normalizer.

You will receive RAW rows extracted from a lab report.
Each row is a factual observation and MUST be preserved.

RULES (ABSOLUTE):
- You MUST return the same number of rows you receive
- You MUST NOT delete, merge, or invent rows
- If something is unclear, return null
- If a date is ambiguous, set date_status = 'ambiguous'
- DO NOT calculate any medical values
- DO NOT summarize or interpret

For each row return:
{
  "row_id": number,
  "test_key": standardized_test_name | null,
  "date_iso": "YYYY-MM-DD" | null,
  "date_status": "valid" | "ambiguous",
  "value": number | null,
  "unit": string | null,
  "confidence": 0.0 - 1.0
}

IMPORTANT:
- Input rows count MUST equal output rows count
- Order MUST remain unchanged
- Never drop a row
```

**Output Format:**
```json
[
  {
    "row_id": 1,
    "test_key": "creatinine",
    "date_iso": "2025-01-15",
    "date_status": "valid",
    "value": 1.2,
    "unit": "mg/dL",
    "confidence": 0.95
  },
  {
    "row_id": 2,
    "test_key": null,
    "date_iso": null,
    "date_status": "ambiguous",
    "value": null,
    "unit": null,
    "confidence": 0.0
  }
]
```

**Critical Validation:**
```javascript
if (normalizedRows.length !== rawRows.length) {
  throw new Error('DATA LOSS DETECTED')
}
```

### Integration in Upload.jsx

**File:** `src/pages/Upload.jsx`

**Flow:**
```
1. Extract text (PDF/OCR/CSV)
   ↓
2. Phase 1: extractRawRows(text, fileType)
   → Returns N raw rows
   ↓
3. Phase 2: normalizeLLM(rawRows)
   → Returns N normalized rows (guaranteed)
   ↓
4. Validation: rawRows.length === normalizedRows.length
   → Hard fail if mismatch
   ↓
5. Store normalized rows
   ↓
6. Navigate to results
```

**Console Output:**
```
========================================
📄 Processing: report.pdf
========================================
📄 RAW EXTRACTION: 45 rows extracted
✅ Phase 1 complete: 45 raw rows

🤖 LLM NORMALIZER STARTED
📥 Input: 45 raw rows
✅ LLM NORMALIZER SUCCESS
📤 Output: 45 normalized rows
✅ ROW COUNT VERIFIED: 45 in = 45 out
✅ Phase 2 complete: 45 normalized rows

✅ VALIDATION PASSED: No data loss

========================================
📊 FINAL SUMMARY
========================================
Total raw rows extracted: 45
Total normalized rows: 45
✅ Data integrity: VERIFIED
```

## What Was NOT Implemented (As Per Requirements)

❌ eGFR calculation (Phase 3+)
❌ CKD stage calculation (Phase 3+)
❌ Deduplication (Phase 3+)
❌ Date inference (Phase 3+)
❌ Graphs (Phase 3+)
❌ UI improvements (Phase 3+)

## Strictly Forbidden Actions

The LLM is NOT allowed to:
- Calculate eGFR
- Calculate CKD stage
- Deduplicate rows
- Infer missing dates
- Merge rows
- Delete rows
- Summarize data
- Interpret medical values

## Test Scenarios

### Scenario 1: Multiple Creatinine Values
```
Input Report:
  Creatinine  1.2  2025-01-15
  Creatinine  1.5  2025-02-01
  Creatinine  1.8  2025-03-10

Expected Output: 3 rows (one per occurrence)
```

### Scenario 2: Unclear Data
```
Input Report:
  Some random text
  Department header
  Creatinine  1.2  2025-01-15

Expected Output: 3 rows
  - Row 1: test_key=null, value=null
  - Row 2: test_key=null, value=null
  - Row 3: test_key="creatinine", value=1.2
```

### Scenario 3: Ambiguous Date
```
Input Report:
  Creatinine  1.2  unclear date

Expected Output: 1 row
  - test_key="creatinine"
  - value=1.2
  - date_iso=null
  - date_status="ambiguous"
```

## Files Modified/Created

### Created:
- `src/utils/rawRowExtractor.js` - Phase 1 implementation
- `src/utils/llmNormalizer.js` - Phase 2 implementation

### Modified:
- `src/pages/Upload.jsx` - Integration of two-phase pipeline

## Git Commit

**Commit Hash:** 9d607b4
**Branch:** main
**Repository:** codoncareai-oss/codoncareai_PATNA

**Commit Message:**
```
Rebuild extraction pipeline with zero data loss guarantee

Phase 1: Raw row extraction (deterministic, no LLM)
- Extract exactly what appears in report
- One visible line = one raw row
- Never merge, delete, or modify rows
- Works with PDF, OCR, and CSV

Phase 2: LLM normalization (strict mode)
- Process each row independently
- Input row count MUST equal output row count
- Never delete, merge, or invent rows
- Standardize test names and dates only
- Return null for unclear data

Critical validation:
- Row count verification at every step
- Hard fail if data loss detected
- Console logs show raw vs normalized counts

This ensures: 3 creatinine values in = 3 rows out
No merging. No guessing. No deletion.
```

## Verification Checklist

✅ Phase 1 implemented (rawRowExtractor.js)
✅ Phase 2 implemented (llmNormalizer.js)
✅ Upload.jsx integrated with two-phase pipeline
✅ Row count validation at every step
✅ Hard fail on data loss
✅ Console logs show raw vs normalized counts
✅ LLM prompt matches exact specification
✅ No eGFR calculation
✅ No deduplication
✅ No date inference
✅ Changes committed to git
✅ Changes pushed to GitHub

## Next Steps (Phase 3+)

These are NOT implemented yet (as per requirements):
1. Convert normalized rows to clinical data points
2. Calculate eGFR (deterministic, outside LLM)
3. Determine CKD stage
4. Build time series
5. Generate graphs
6. Update UI to display results

## Key Principle

**Correct data > Smart AI**
**Preserving facts > Interpreting data**

The system now guarantees zero data loss at the extraction and normalization stages.
