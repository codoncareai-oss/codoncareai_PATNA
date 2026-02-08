// PRIMARY LLM EXTRACTION ENGINE
// LLM reads lab reports as a human would
// Responsible for correct date-value pairing, table understanding, multipage handling

const LLM_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'

/**
 * PRIMARY extraction: LLM reads full report text
 * @param {string} rawText - Full extracted text from PDF/OCR/CSV
 * @returns {Promise<Object>} { success: boolean, rows: Array, source: string, error?: string }
 */
export async function extractStructuredRows(rawText) {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token) {
    return { success: false, rows: [], source: 'llm-primary', error: 'No API token configured' }
  }

  // Use more context for complex reports (up to 8000 chars)
  const truncatedText = rawText.slice(0, 8000)

  const systemPrompt = `You are an expert medical lab report reader. Extract ALL kidney-related lab test results from the report.

CRITICAL INSTRUCTIONS:
1. READ TABLES CAREFULLY - understand column headers (dates) and row headers (test names)
2. PAIR VALUES CORRECTLY - each value must match its correct date and test
3. HANDLE MULTIPAGE TABLES - if a table continues across pages, maintain date alignment
4. IGNORE non-lab dates:
   - Date of Birth (DOB)
   - Registration dates
   - Report generation dates
5. USE ONLY lab result dates (when tests were performed)
6. If a value is unclear or ambiguous → OMIT that row entirely
7. NEVER invent or guess numbers
8. NEVER calculate derived values (like eGFR from creatinine)

KIDNEY-RELATED TESTS TO EXTRACT:
- Serum Creatinine / S.Creat / Creatinine
- Blood Urea / Urea / BUN
- eGFR / Estimated GFR (if explicitly reported)
- Hemoglobin / Hb / Haemoglobin
- PTH / Parathyroid Hormone
- Phosphorus / Phosphate / Serum Phosphorus
- Bicarbonate / HCO3 / Serum Bicarbonate
- Calcium / Serum Calcium

OUTPUT FORMAT (valid JSON only):
[
  { "test": "Serum Creatinine", "date": "2024-03-15", "value": 1.2, "unit": "mg/dL" },
  { "test": "Blood Urea", "date": "2024-03-15", "value": 35, "unit": "mg/dL" },
  { "test": "Hemoglobin", "date": "2024-03-15", "value": 12.5, "unit": "g/dL" }
]

Return empty array [] if no kidney-related tests found.`

  const userPrompt = `Extract all kidney-related lab test results from this medical report:\n\n${truncatedText}`

  try {
    const response = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 3000
      })
    })

    if (!response.ok) {
      return { success: false, rows: [], source: 'llm-primary', error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, rows: [], source: 'llm-primary', error: 'No content in response' }
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const rows = JSON.parse(jsonText)

    if (!Array.isArray(rows)) {
      return { success: false, rows: [], source: 'llm-primary', error: 'Response not an array' }
    }

    // Validate and sanitize rows
    const validRows = rows
      .filter(row => row && typeof row === 'object')
      .filter(row => row.test && row.value !== null && row.value !== undefined)
      .map(row => ({
        test: String(row.test).trim(),
        date: row.date ? String(row.date).trim() : null,
        value: parseFloat(row.value),
        unit: row.unit ? String(row.unit).trim() : null
      }))
      .filter(row => !isNaN(row.value))
      .filter(row => validateLLMRow(row))

    return {
      success: true,
      rows: validRows,
      source: 'llm-primary',
      raw_response: content,
      total_extracted: validRows.length
    }

  } catch (error) {
    return {
      success: false,
      rows: [],
      source: 'llm-primary',
      error: error.message
    }
  }
}

/**
 * Validate LLM-extracted row against physiological ranges and date rules
 * @param {Object} row - { test, date, value, unit }
 * @returns {boolean}
 */
export function validateLLMRow(row) {
  // Date validation
  if (row.date) {
    const dateObj = new Date(row.date)
    if (isNaN(dateObj.getTime())) return false
    
    const year = dateObj.getFullYear()
    if (year < 1990 || year > new Date().getFullYear()) return false
    
    if (dateObj > new Date()) return false
  }

  // Value validation (physiological ranges)
  const ranges = {
    creatinine: [0.1, 20],
    urea: [5, 300],
    egfr: [1, 200],
    hemoglobin: [1, 25],
    hb: [1, 25],
    pth: [1, 2000],
    phosphorus: [0.5, 15],
    phosphate: [0.5, 15],
    bicarbonate: [5, 50],
    hco3: [5, 50],
    calcium: [5, 20]
  }

  // Try to match test name to range
  const testLower = row.test.toLowerCase()
  for (const [key, range] of Object.entries(ranges)) {
    if (testLower.includes(key)) {
      if (row.value < range[0] || row.value > range[1]) {
        return false
      }
      break
    }
  }

  return true
}

/**
 * Convert LLM rows to ClinicalDataPoint format
 * @param {Array} llmRows - LLM extracted rows
 * @param {string} sourceFile - Original filename
 * @returns {Array} - ClinicalDataPoint[]
 */
export function convertToDataPoints(llmRows, sourceFile) {
  const dataPoints = []
  
  for (const row of llmRows) {
    // Canonicalize test name
    const testLower = row.test.toLowerCase()
    let canonicalKey = null
    
    if (testLower.includes('creat')) canonicalKey = 'creatinine'
    else if (testLower.includes('urea') || testLower.includes('bun')) canonicalKey = 'urea'
    else if (testLower.includes('egfr')) canonicalKey = 'egfr'
    else if (testLower.includes('hb') || testLower.includes('hemoglobin') || testLower.includes('haemoglobin')) canonicalKey = 'hemoglobin'
    else if (testLower.includes('pth') || testLower.includes('parathyroid')) canonicalKey = 'pth'
    else if (testLower.includes('phosph')) canonicalKey = 'phosphorus'
    else if (testLower.includes('bicarb') || testLower.includes('hco3')) canonicalKey = 'bicarbonate'
    else if (testLower.includes('calcium')) canonicalKey = 'calcium'
    
    if (!canonicalKey) continue
    if (!row.date) continue
    
    dataPoints.push({
      test_name: row.test,
      canonical_test_key: canonicalKey,
      value: row.value,
      unit: row.unit || 'unknown',
      date_iso: row.date,
      source_file: sourceFile,
      source_page: 0,
      confidence: 0.9,
      extraction_method: 'llm-primary'
    })
  }

  return dataPoints
}
