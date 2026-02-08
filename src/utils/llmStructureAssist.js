// LLM-ASSISTED STRUCTURE EXTRACTION
// Purpose: Help align table values to (test, date) pairs when deterministic parsing is ambiguous
// NEVER calculates medical values, NEVER guesses, ONLY identifies structure

const LLM_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'

/**
 * Extract structured rows from raw text using LLM
 * @param {string} rawText - Extracted text from PDF/OCR
 * @returns {Promise<Object>} { success: boolean, rows: Array, source: string, error?: string }
 */
export async function extractStructuredRows(rawText) {
  // Fail gracefully if no token
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token) {
    return { success: false, rows: [], source: 'llm-assist', error: 'No API token' }
  }

  // Truncate text if too long (max 4000 chars for context)
  const truncatedText = rawText.slice(0, 4000)

  const systemPrompt = `You are a medical lab report structure parser. Extract ONLY the structure of lab test results.

STRICT RULES:
- Extract test name, date, value, unit from tables
- If ANY field is unclear → return null for that field
- NEVER guess or infer values
- NEVER calculate derived values
- NEVER provide medical advice
- Return ONLY valid JSON array

Output format:
[
  { "test_name": "Serum Creatinine", "date": "2024-03-15", "value": 1.2, "unit": "mg/dL" },
  { "test_name": "Blood Urea", "date": "2024-03-15", "value": 35, "unit": "mg/dL" }
]

Focus on kidney-related tests: creatinine, urea, eGFR, hemoglobin, PTH, phosphorus, bicarbonate, calcium.
If no clear table structure → return empty array [].`

  const userPrompt = `Extract lab test structure from this text:\n\n${truncatedText}`

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
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      return { success: false, rows: [], source: 'llm-assist', error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, rows: [], source: 'llm-assist', error: 'No content in response' }
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const rows = JSON.parse(jsonText)

    if (!Array.isArray(rows)) {
      return { success: false, rows: [], source: 'llm-assist', error: 'Response not an array' }
    }

    // Validate and sanitize rows
    const validRows = rows
      .filter(row => row && typeof row === 'object')
      .filter(row => row.test_name && row.value !== null && row.value !== undefined)
      .map(row => ({
        test_name: String(row.test_name).trim(),
        date: row.date ? String(row.date).trim() : null,
        value: parseFloat(row.value),
        unit: row.unit ? String(row.unit).trim() : null
      }))
      .filter(row => !isNaN(row.value))

    return {
      success: true,
      rows: validRows,
      source: 'llm-assist',
      raw_response: content
    }

  } catch (error) {
    return {
      success: false,
      rows: [],
      source: 'llm-assist',
      error: error.message
    }
  }
}

/**
 * Validate LLM-extracted row against physiological ranges
 * @param {Object} row - { test_name, date, value, unit }
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
    pth: [1, 2000],
    phosphorus: [0.5, 15],
    bicarbonate: [5, 50],
    calcium: [5, 20]
  }

  // Try to match test name to canonical key
  const testLower = row.test_name.toLowerCase()
  for (const [key, range] of Object.entries(ranges)) {
    if (testLower.includes(key)) {
      if (row.value < range[0] || row.value > range[1]) {
        return false
      }
    }
  }

  return true
}

/**
 * Merge LLM rows with deterministic extraction results
 * Only adds rows that don't conflict with existing data
 * @param {Array} deterministicRows - ClinicalDataPoint[]
 * @param {Array} llmRows - LLM extracted rows
 * @returns {Array} - Additional rows to add
 */
export function mergeLLMRows(deterministicRows, llmRows) {
  const added = []
  
  // Create index of existing (test, date) pairs
  const existing = new Set()
  for (const row of deterministicRows) {
    const key = `${row.canonical_test_key}:${row.date_iso}`
    existing.add(key)
  }

  // Add LLM rows that don't conflict
  for (const llmRow of llmRows) {
    if (!validateLLMRow(llmRow)) continue
    
    // Try to canonicalize test name
    const testLower = llmRow.test_name.toLowerCase()
    let canonicalKey = null
    
    if (testLower.includes('creat')) canonicalKey = 'creatinine'
    else if (testLower.includes('urea') || testLower.includes('bun')) canonicalKey = 'urea'
    else if (testLower.includes('egfr')) canonicalKey = 'egfr'
    else if (testLower.includes('hb') || testLower.includes('hemoglobin')) canonicalKey = 'hemoglobin'
    else if (testLower.includes('pth')) canonicalKey = 'pth'
    else if (testLower.includes('phosph')) canonicalKey = 'phosphorus'
    else if (testLower.includes('bicarb') || testLower.includes('hco3')) canonicalKey = 'bicarbonate'
    else if (testLower.includes('calcium')) canonicalKey = 'calcium'
    
    if (!canonicalKey) continue
    if (!llmRow.date) continue
    
    const key = `${canonicalKey}:${llmRow.date}`
    if (existing.has(key)) continue
    
    // Add as new data point
    added.push({
      test_name: llmRow.test_name,
      canonical_test_key: canonicalKey,
      value: llmRow.value,
      unit: llmRow.unit || 'unknown',
      date_iso: llmRow.date,
      source_file: 'llm-assist',
      source_page: 0,
      confidence: 0.7
    })
    
    existing.add(key)
  }

  return added
}
