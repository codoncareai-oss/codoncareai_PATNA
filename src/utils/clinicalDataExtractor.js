// NEW ANALYSIS ENGINE - Deterministic Clinical Parsing
// Built from scratch - no legacy assumptions

export class ClinicalDataPoint {
  constructor(testName, canonicalKey, value, unit, dateISO, sourceFile, sourcePage, confidence) {
    this.test_name = testName
    this.canonical_test_key = canonicalKey
    this.value = value
    this.unit = unit
    this.date_iso = dateISO
    this.source_file = sourceFile
    this.source_page = sourcePage
    this.confidence = confidence
  }
}

// Test canonicalization - map all variants
const TEST_CANONICALIZATION = {
  'serum creatinine': 'creatinine',
  'creatinine': 'creatinine',
  's.creat': 'creatinine',
  'sr creat': 'creatinine',
  
  'blood urea': 'urea',
  'urea': 'urea',
  'bun': 'urea',
  
  'egfr': 'egfr',
  'e.gfr': 'egfr',
  'estimated gfr': 'egfr',
  
  'hemoglobin': 'hemoglobin',
  'haemoglobin': 'hemoglobin',
  'hb': 'hemoglobin',
  'h.b.': 'hemoglobin',
  
  'pth': 'pth',
  'parathyroid hormone': 'pth',
  
  'phosphorus': 'phosphorus',
  'phosphate': 'phosphorus',
  
  'bicarbonate': 'bicarbonate',
  'hco3': 'bicarbonate',
  
  'calcium': 'calcium'
}

export function canonicalizeTestName(rawName) {
  const normalized = rawName.toLowerCase().trim()
  
  for (const [pattern, canonical] of Object.entries(TEST_CANONICALIZATION)) {
    if (normalized.includes(pattern)) {
      return canonical
    }
  }
  
  return null
}

// Extract all data points from text with page awareness
export function extractClinicalDataPoints(text, sourceFile, sourcePage = 1) {
  const dataPoints = []
  const lines = text.split('\n')
  
  // Detect dates in text
  const detectedDates = extractValidDates(text)
  
  if (detectedDates.length === 0) return dataPoints
  
  // Parse each line for test + value
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length < 3) continue
    
    // Try to identify test name
    const canonicalKey = canonicalizeTestName(line)
    if (!canonicalKey) continue
    
    // Extract values from this line
    const values = extractNumericValues(line)
    if (values.length === 0) continue
    
    // Extract unit
    const unit = extractUnit(line, canonicalKey)
    
    // Map values to dates by column index
    for (let j = 0; j < Math.min(values.length, detectedDates.length); j++) {
      const value = values[j]
      const date = detectedDates[j]
      
      // Validate physiological range
      if (!isPhysiologicallyValid(canonicalKey, value)) continue
      
      dataPoints.push(new ClinicalDataPoint(
        line.split(/\s{2,}|\t|\|/)[0].trim(),
        canonicalKey,
        value,
        unit || 'unknown',
        date,
        sourceFile,
        sourcePage,
        0.85
      ))
    }
  }
  
  return dataPoints
}

// Extract valid lab dates only (not DOB, not future)
function extractValidDates(text) {
  const dates = []
  const patterns = [
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g
  ]
  
  const seen = new Set()
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const iso = parseToISO(match[0])
      if (!iso) continue
      
      // Validate: must be between 1990 and now
      const year = parseInt(iso.split('-')[0])
      if (year < 1990 || year > new Date().getFullYear()) continue
      
      // Validate: not in future
      if (new Date(iso) > new Date()) continue
      
      if (!seen.has(iso)) {
        seen.add(iso)
        dates.push(iso)
      }
    }
  }
  
  return dates.sort()
}

function parseToISO(dateStr) {
  // Try DD/MM/YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (ddmmyyyy) {
    let year = parseInt(ddmmyyyy[3])
    if (year < 100) year += 2000
    const month = parseInt(ddmmyyyy[2])
    const day = parseInt(ddmmyyyy[1])
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
  }
  
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  
  return null
}

function extractNumericValues(line) {
  const values = []
  const parts = line.split(/\s{2,}|\t|\|/)
  
  for (let i = 1; i < parts.length; i++) {
    const num = parseFloat(parts[i].trim())
    if (isNaN(num)) continue
    if (num > 1900 && num < 2100) continue // Skip years
    if (num > 500) continue // Skip unrealistic values
    values.push(num)
  }
  
  return values
}

function extractUnit(line, testKey) {
  const unitPatterns = {
    creatinine: /mg\s*\/?\s*d[lL]/i,
    urea: /mg\s*\/?\s*d[lL]/i,
    egfr: /m[lL]\s*\/?\s*min/i,
    hemoglobin: /g\s*\/?\s*d[lL]/i,
    pth: /pg\s*\/?\s*m[lL]/i,
    phosphorus: /mg\s*\/?\s*d[lL]/i,
    bicarbonate: /mm?ol\s*\/?\s*[lL]/i,
    calcium: /mg\s*\/?\s*d[lL]/i
  }
  
  const pattern = unitPatterns[testKey]
  if (!pattern) return null
  
  const match = line.match(pattern)
  return match ? match[0] : null
}

function isPhysiologicallyValid(testKey, value) {
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
  
  const range = ranges[testKey]
  if (!range) return true
  return value >= range[0] && value <= range[1]
}

// Count occurrences: (test + date) = 1 occurrence
export function countOccurrences(dataPoints, testKey) {
  const uniqueDates = new Set()
  
  for (const dp of dataPoints) {
    if (dp.canonical_test_key === testKey) {
      uniqueDates.add(dp.date_iso)
    }
  }
  
  return uniqueDates.size
}

// Get all data points for a specific test
export function getDataPointsForTest(dataPoints, testKey) {
  return dataPoints
    .filter(dp => dp.canonical_test_key === testKey)
    .sort((a, b) => a.date_iso.localeCompare(b.date_iso))
}
