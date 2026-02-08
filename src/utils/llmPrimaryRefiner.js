// LLM PRIMARY REFINER - Always runs to clean and structure data
// Uses GitHub Models Phi-4-multimodal-instruct

const LLM_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions'
const MODEL = 'Phi-4-multimodal-instruct'

/**
 * LLM Primary Refiner - ALWAYS runs to clean extracted data
 * @param {string} rawText - Full extracted text
 * @returns {Promise<Object>} { success: boolean, data: Object, error?: string }
 */
export async function refineClinicalData(rawText) {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  
  if (!token) {
    const error = '❌ VITE_GITHUB_TOKEN missing. LLM refiner cannot run.'
    console.error(error)
    throw new Error(error)
  }

  const truncatedText = rawText.slice(0, 12000)

  console.log('🤖 LLM PRIMARY REFINER STARTED')
  console.log('📍 Endpoint:', LLM_ENDPOINT)
  console.log('🤖 Model:', MODEL)
  console.log('📄 Text length:', truncatedText.length, 'chars')
  console.log('🔑 Token present: YES')
  console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...')
  console.log('⏰ Timestamp:', new Date().toISOString())

  const systemPrompt = `You are a medical data cleaning engine. Your ONLY job is to fix broken tables and extract clean structured data.

RESPONSIBILITIES:
- Fix broken tables
- Align dates with values
- Remove noise rows (headers, departments, text)
- Normalize test names
- Extract ONLY confident rows

NEVER:
- Calculate eGFR
- Calculate trends
- Guess dates
- Infer missing values
- Provide medical interpretation

OUTPUT SCHEMA (JSON ONLY):
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

If nothing is confidently extractable: return { "gender": null, "measurements": [] }

TEST NAME MAPPING:
- "Serum Creatinine", "S.Creat", "Creatinine" → "serum_creatinine"
- "Blood Urea", "Urea", "BUN" → "blood_urea"
- "eGFR", "Estimated GFR" → "egfr"
- "Hemoglobin", "Hb" → "hemoglobin"
- "PTH", "Parathyroid Hormone" → "pth"
- "Phosphorus", "Phosphate" → "phosphorus"
- "Calcium" → "calcium"
- "Bicarbonate", "HCO3" → "bicarbonate"

Return ONLY valid JSON. No markdown.`

  const userPrompt = `Clean and extract structured data:\n\n${truncatedText}`

  try {
    console.log('⏳ Calling GitHub Models API...')
    
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

    console.log('✅ Response received - Status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:', response.status, errorText)
      return { success: false, data: null, error: `HTTP ${response.status}` }
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      console.error('❌ No content in response')
      return { success: false, data: null, error: 'No content' }
    }

    console.log('📝 LLM response length:', content.length, 'chars')

    let jsonText = content.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const data = JSON.parse(jsonText)

    if (!data || !Array.isArray(data.measurements)) {
      console.error('❌ Invalid response format')
      return { success: false, data: null, error: 'Invalid format' }
    }

    console.log('✅ LLM REFINER SUCCESS')
    console.log('📊 Measurements extracted:', data.measurements.length)
    console.log('👤 Gender:', data.gender || 'null')

    return { success: true, data, llm_used: true }

  } catch (error) {
    console.error('❌ LLM REFINER FAILED:', error.message)
    return { success: false, data: null, error: error.message }
  }
}

/**
 * Validate measurement
 */
function validateMeasurement(measurement) {
  if (!measurement.test || !measurement.date || measurement.value == null) {
    return false
  }

  const dateObj = new Date(measurement.date)
  if (isNaN(dateObj.getTime())) return false
  
  const year = dateObj.getFullYear()
  const currentYear = new Date().getFullYear()
  if (year < 1990 || year > currentYear) return false
  if (dateObj > new Date()) return false

  const value = parseFloat(measurement.value)
  if (isNaN(value)) return false

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
 */
export function convertToDataPoints(llmData, sourceFile) {
  if (!llmData?.measurements) return []

  const dataPoints = []
  let discardedCount = 0

  for (const measurement of llmData.measurements) {
    if (!validateMeasurement(measurement)) {
      discardedCount++
      continue
    }

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
    if (!canonicalKey) {
      discardedCount++
      continue
    }

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
      confidence: 0.9,
      extraction_method: 'llm-primary-refiner',
      llm_used: true
    })
  }

  console.log(`✅ LLM accepted: ${dataPoints.length} rows`)
  console.log(`❌ LLM discarded: ${discardedCount} rows`)

  return dataPoints
}
