// LLM NORMALIZER - Phase 2
// STRICT MODE - Same number of rows in = same number of rows out
// NO DATA LOSS - Never delete, merge, or invent rows

const LLM_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'Phi-4-multimodal-instruct'

/**
 * Normalize raw rows using LLM
 * CRITICAL: Input row count MUST equal output row count
 * @param {Array} rawRows - Raw rows from Phase 1
 * @returns {Promise<Object>} { success: boolean, normalizedRows: Array, error?: string }
 */
export async function normalizeLLM(rawRows) {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  
  if (!token) {
    throw new Error('❌ VITE_GITHUB_TOKEN missing')
  }

  console.log(`🤖 LLM NORMALIZER STARTED`)
  console.log(`📥 Input: ${rawRows.length} raw rows`)

  const systemPrompt = `You are a medical data normalizer.

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

TEST KEY STANDARDIZATION:
- "Serum Creatinine", "S.Creat", "Creatinine" → "creatinine"
- "Blood Urea", "Urea", "BUN" → "urea"
- "eGFR", "Estimated GFR" → "egfr"
- "Hemoglobin", "Hb" → "hemoglobin"
- "PTH" → "pth"
- "Phosphorus", "Phosphate" → "phosphorus"
- "Calcium" → "calcium"
- "Bicarbonate", "HCO3" → "bicarbonate"

Return ONLY valid JSON array. No markdown.`

  const userPrompt = `Normalize these ${rawRows.length} rows:\n\n${JSON.stringify(rawRows, null, 2)}`

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
        max_tokens: 8000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      return { success: false, normalizedRows: [], error: `HTTP ${response.status}` }
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      console.error('❌ No content in response')
      return { success: false, normalizedRows: [], error: 'No content' }
    }

    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const normalizedRows = JSON.parse(jsonText)

    if (!Array.isArray(normalizedRows)) {
      console.error('❌ Response is not an array')
      return { success: false, normalizedRows: [], error: 'Invalid format' }
    }

    // CRITICAL VALIDATION: Row count must match
    if (normalizedRows.length !== rawRows.length) {
      console.error(`❌ ROW COUNT MISMATCH: Input=${rawRows.length}, Output=${normalizedRows.length}`)
      return { 
        success: false, 
        normalizedRows: [], 
        error: `Row count mismatch: expected ${rawRows.length}, got ${normalizedRows.length}` 
      }
    }

    console.log(`✅ LLM NORMALIZER SUCCESS`)
    console.log(`📤 Output: ${normalizedRows.length} normalized rows`)
    console.log(`✅ ROW COUNT VERIFIED: ${rawRows.length} in = ${normalizedRows.length} out`)

    return { success: true, normalizedRows }

  } catch (error) {
    console.error('❌ LLM NORMALIZER FAILED:', error.message)
    return { success: false, normalizedRows: [], error: error.message }
  }
}
