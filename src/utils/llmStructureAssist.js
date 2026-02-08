// LLM STRUCTURE ASSIST - GitHub Models Integration
// Extracts structured clinical data when deterministic parsing fails

const LLM_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'gpt-4o-mini'

/**
 * LLM-assisted extraction for messy/complex reports
 * @param {string} rawText - Full extracted text from PDF/OCR/CSV
 * @returns {Promise<Object>} { success: boolean, data: Object, error?: string }
 */
export async function extractStructuredRows(rawText) {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token) {
    return { success: false, data: null, error: 'No API token configured' }
  }

  // Use full context for complex reports
  const truncatedText = rawText.slice(0, 12000)

  const systemPrompt = `You are a medical document understanding engine.

TASK:
Read the ENTIRE document as a human would. Extract kidney-related lab test results.

RETURN STRICT JSON ONLY in this schema:

{
  "gender": "male" | "female" | null,
  "measurements": [
    {
      "test": "serum_creatinine" | "blood_urea" | "egfr" | "hemoglobin" | "pth" | "phosphorus" | "calcium" | "bicarbonate",
      "value": number,
      "unit": string,
      "date": "YYYY-MM-DD"
    }
  ]
}

RULES (MANDATORY):
- DO NOT calculate anything
- DO NOT infer missing dates
- DO NOT merge rows unless document clearly indicates continuation
- If a value or date is unclear → SKIP that row
- Return EMPTY measurements array if nothing is confidently extractable
- NEVER provide medical interpretation
- ONLY extract dates that are explicitly lab result dates (NOT DOB, NOT registration dates)

TEST NAME MAPPING:
- "Serum Creatinine", "S.Creat", "Creatinine" → "serum_creatinine"
- "Blood Urea", "Urea", "BUN" → "blood_urea"
- "eGFR", "Estimated GFR" → "egfr"
- "Hemoglobin", "Hb", "Haemoglobin" → "hemoglobin"
- "PTH", "Parathyroid Hormone" → "pth"
- "Phosphorus", "Phosphate" → "phosphorus"
- "Calcium", "Serum Calcium" → "calcium"
- "Bicarbonate", "HCO3" → "bicarbonate"

OUTPUT:
Return ONLY valid JSON. No markdown. No explanation.`

  const userPrompt = `Extract structured data from this medical report:\n\n${truncatedText}`

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
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` }
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      return { success: false, data: null, error: 'No content in response' }
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const data = JSON.parse(jsonText)

    // Validate schema
    if (!data || typeof data !== 'object') {
      return { success: false, data: null, error: 'Invalid response format' }
    }

    if (!Array.isArray(data.measurements)) {
      return { success: false, data: null, error: 'Missing measurements array' }
    }

    return {
      success: true,
      data: data,
      raw_response: content
    }

  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message
    }
  }
}

/**
 * Validate measurement against physiological ranges and date rules
 * @param {Object} measurement - { test, date, value, unit }
 * @returns {boolean}
 */
function validateMeasurement(measurement) {
  // Must have required fields
  if (!measurement.test || !measurement.date || measurement.value === null || measurement.value === undefined) {
    return false
  }

  // Date validation
  const dateObj = new Date(measurement.date)
  if (isNaN(dateObj.getTime())) return false
  
  const year = dateObj.getFullYear()
  if (year < 1990 || year > new Date().getFullYear()) return false
  
  if (dateObj > new Date()) return false

  // Value must be numeric
  const value = parseFloat(measurement.value)
  if (isNaN(value)) return false

  // Physiological range validation
  const ranges = {
    serum_creatinine: [0.1, 20],
    blood_urea: [5, 300],
    egfr: [1, 200],
    hemoglobin: [1, 25],
    pth: [1, 2000],
    phosphorus: [0.5, 15],
    calcium: [5, 20],
    bicarbonate: [5, 50]
  }

  const range = ranges[measurement.test]
  if (range && (value < range[0] || value > range[1])) {
    return false
  }

  return true
}

/**
 * Convert LLM data to ClinicalDataPoint format
 * @param {Object} llmData - { gender, measurements }
 * @param {string} sourceFile - Original filename
 * @returns {Array} - ClinicalDataPoint[]
 */
export function convertToDataPoints(llmData, sourceFile) {
  if (!llmData || !llmData.measurements) {
    return []
  }

  const dataPoints = []
  
  for (const measurement of llmData.measurements) {
    if (!validateMeasurement(measurement)) {
      continue
    }

    // Map test name to canonical key
    const canonicalMap = {
      serum_creatinine: 'creatinine',
      blood_urea: 'urea',
      egfr: 'egfr',
      hemoglobin: 'hemoglobin',
      pth: 'pth',
      phosphorus: 'phosphorus',
      calcium: 'calcium',
      bicarbonate: 'bicarbonate'
    }

    const canonicalKey = canonicalMap[measurement.test]
    if (!canonicalKey) continue

    // Display name mapping
    const displayNames = {
      serum_creatinine: 'Serum Creatinine',
      blood_urea: 'Blood Urea',
      egfr: 'eGFR',
      hemoglobin: 'Hemoglobin',
      pth: 'PTH',
      phosphorus: 'Phosphorus',
      calcium: 'Calcium',
      bicarbonate: 'Bicarbonate'
    }

    dataPoints.push({
      test_name: displayNames[measurement.test] || measurement.test,
      canonical_test_key: canonicalKey,
      value: parseFloat(measurement.value),
      unit: measurement.unit || 'unknown',
      date_iso: measurement.date,
      source_file: sourceFile,
      source_page: 0,
      confidence: 0.85,
      extraction_method: 'llm-assist'
    })
  }

  return dataPoints
}
