// LAYER 2: CANONICAL NORMALIZATION MODE
// Convert all lab data to universal schema

export function normalizeLabData(extractedText, understanding) {
  const normalized = []
  
  // Extract values for each detected test
  for (const test of understanding.detected_tests) {
    const values = extractValuesForTest(extractedText, test, understanding.detected_dates)
    normalized.push(...values)
  }
  
  return normalized
}

function extractValuesForTest(text, test, dates) {
  const entries = []
  const lines = text.split('\n')
  
  // Find lines containing the test name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if line contains this test
    const testPattern = new RegExp(test.raw.split(',')[0].trim(), 'i')
    if (!testPattern.test(line)) continue
    
    // Extract numeric values from this line
    const values = extractNumericValues(line)
    
    if (values.length === 0) continue
    
    // Try to match values to dates
    if (dates.length >= values.length) {
      // Assume values align with dates in order
      for (let j = 0; j < values.length; j++) {
        const value = values[j]
        const date = dates[j]
        
        // Validate value range
        if (!isValidValue(test.normalized_candidate, value)) continue
        
        // Extract unit if present
        const unit = extractUnit(line, test.normalized_candidate)
        
        entries.push({
          test: test.normalized_candidate,
          display_name: test.display_name,
          value: value,
          unit: unit || 'unknown',
          date: date.iso_candidate,
          date_raw: date.raw,
          source: 'extracted',
          confidence: calculateValueConfidence(line, value, unit)
        })
      }
    } else if (dates.length === 1 && values.length === 1) {
      // Single value, single date
      const value = values[0]
      const unit = extractUnit(line, test.normalized_candidate)
      
      if (isValidValue(test.normalized_candidate, value)) {
        entries.push({
          test: test.normalized_candidate,
          display_name: test.display_name,
          value: value,
          unit: unit || 'unknown',
          date: dates[0].iso_candidate,
          date_raw: dates[0].raw,
          source: 'extracted',
          confidence: calculateValueConfidence(line, value, unit)
        })
      }
    }
  }
  
  return entries
}

function extractNumericValues(line) {
  const values = []
  const numberPattern = /\b(\d+\.?\d*)\b/g
  const matches = line.matchAll(numberPattern)
  
  for (const match of matches) {
    const num = parseFloat(match[1])
    
    // Filter out years and unrealistic values
    if (num > 1900 && num < 2100) continue
    if (num > 500) continue
    
    values.push(num)
  }
  
  return values
}

function extractUnit(line, testType) {
  const unitPatterns = {
    creatinine: /mg\s*\/?\s*d[lL]/i,
    egfr: /m[lL]\s*\/?\s*min\s*\/?\s*1\.73\s*m/i,
    hemoglobin: /g\s*\/?\s*d[lL]/i,
    pth: /pg\s*\/?\s*m[lL]/i,
    phosphorus: /mg\s*\/?\s*d[lL]/i,
    bicarbonate: /mm?ol\s*\/?\s*[lL]/i,
    urea: /mg\s*\/?\s*d[lL]/i
  }
  
  const pattern = unitPatterns[testType]
  if (!pattern) return null
  
  const match = line.match(pattern)
  return match ? match[0] : null
}

function isValidValue(testType, value) {
  const ranges = {
    creatinine: [0.1, 20],
    egfr: [1, 200],
    hemoglobin: [1, 25],
    pth: [1, 2000],
    phosphorus: [0.5, 15],
    bicarbonate: [5, 50],
    urea: [5, 300]
  }
  
  const range = ranges[testType]
  if (!range) return true
  return value >= range[0] && value <= range[1]
}

function calculateValueConfidence(line, value, unit) {
  let confidence = 0.5
  
  // Has unit
  if (unit && unit !== 'unknown') confidence += 0.2
  
  // Value is in typical range
  if (value > 0 && value < 100) confidence += 0.1
  
  // Line is not too long (likely not a paragraph)
  if (line.length < 200) confidence += 0.1
  
  // Line contains numbers (structured data)
  if (/\d/.test(line)) confidence += 0.1
  
  return Math.min(confidence, 1.0)
}

// Validate normalized data for clinical analysis
export function validateForClinicalAnalysis(normalizedData) {
  const creatinineEntries = normalizedData.filter(e => e.test === 'creatinine')
  const egfrEntries = normalizedData.filter(e => e.test === 'egfr')
  
  const validation = {
    can_proceed: false,
    creatinine_count: creatinineEntries.length,
    egfr_count: egfrEntries.length,
    date_span_days: 0,
    reasons: []
  }
  
  // Need at least 2 creatinine or eGFR values
  if (creatinineEntries.length < 2 && egfrEntries.length < 2) {
    validation.reasons.push('Minimum 2 creatinine or eGFR values required for trend analysis')
    return validation
  }
  
  // Check date span
  const allDates = [...creatinineEntries, ...egfrEntries]
    .map(e => new Date(e.date))
    .sort((a, b) => a - b)
  
  if (allDates.length >= 2) {
    const firstDate = allDates[0]
    const lastDate = allDates[allDates.length - 1]
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24)
    
    validation.date_span_days = Math.round(daysDiff)
    
    if (daysDiff < 90) {
      validation.reasons.push(`Date span is ${Math.round(daysDiff)} days. Minimum 90 days required for reliable trend analysis.`)
      return validation
    }
  }
  
  validation.can_proceed = true
  return validation
}
