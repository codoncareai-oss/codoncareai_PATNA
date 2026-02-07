// Extract medical biomarkers from text with fuzzy matching and synonyms
export function parseMedicalData(text) {
  const data = {
    creatinine: null,
    egfr: null,
    hemoglobin: null,
    pth: null,
    phosphorus: null,
    bicarbonate: null,
    urineProtein: null,
    urea: null,
    calcium: null,
    ferritin: null,
    dates: []
  }
  
  const lines = text.split('\n')
  
  // Patterns with synonyms and fuzzy matching
  const patterns = {
    creatinine: /(?:serum\s+)?creat(?:inine)?[:\s]+([0-9.]+)/i,
    egfr: /egfr[:\s]+([0-9.]+)/i,
    hemoglobin: /(?:hb|h\.b\.|hemoglobin|haemoglobin)[:\s]+([0-9.]+)/i,
    pth: /(?:pth|parathyroid\s+hormone)[:\s]+([0-9.]+)/i,
    phosphorus: /(?:phosphorus|phosphate)[:\s]+([0-9.]+)/i,
    bicarbonate: /(?:hco3|bicarbonate|bicarb)[:\s]+([0-9.]+)/i,
    urineProtein: /(?:urine\s+)?(?:protein|albumin|acr)[:\s]+([0-9.]+)/i,
    urea: /(?:blood\s+)?(?:urea|bun)[:\s]+([0-9.]+)/i,
    calcium: /calcium[:\s]+([0-9.]+)/i,
    ferritin: /ferritin[:\s]+([0-9.]+)/i
  }
  
  // Extract values (skip reference ranges)
  for (const [key, pattern] of Object.entries(patterns)) {
    for (const line of lines) {
      // Skip lines with reference ranges
      if (line.match(/\d+\s*-\s*\d+/) && !line.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/)) {
        continue
      }
      
      const match = line.match(pattern)
      if (match) {
        const value = parseFloat(match[1])
        // Sanity check ranges
        if (isValidBiomarkerValue(key, value)) {
          data[key] = value
          break
        }
      }
    }
  }
  
  // Extract ALL dates from document
  data.dates = extractAllDates(text)
  
  return data
}

function isValidBiomarkerValue(marker, value) {
  const ranges = {
    creatinine: [0.1, 20],
    egfr: [1, 200],
    hemoglobin: [1, 25],
    pth: [1, 2000],
    phosphorus: [0.5, 15],
    bicarbonate: [5, 50],
    urea: [5, 300],
    calcium: [5, 20],
    ferritin: [1, 5000]
  }
  
  const range = ranges[marker]
  if (!range) return true
  return value >= range[0] && value <= range[1]
}

function extractAllDates(text) {
  const dates = []
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi
  ]
  
  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const dateStr = match[0]
      const parsed = parseDate(dateStr)
      if (parsed) {
        dates.push(parsed)
      }
    }
  }
  
  // Remove duplicates and sort
  const unique = [...new Set(dates)]
  return unique.sort()
}

function parseDate(dateStr) {
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (ddmmyyyy) {
    let year = parseInt(ddmmyyyy[3])
    if (year < 100) year += 2000
    const month = parseInt(ddmmyyyy[2])
    const day = parseInt(ddmmyyyy[1])
    
    // Validate
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
  }
  
  // Try other formats
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  
  return null
}

// Calculate confidence based on extraction quality
export function calculateConfidence(data, hasMultipleDates) {
  const keyFields = ['creatinine', 'egfr', 'hemoglobin', 'pth']
  const extracted = keyFields.filter(f => data[f] !== null).length
  
  if (extracted >= 3 && data.dates.length > 0) return 'High'
  if (extracted >= 2 && data.dates.length > 0) return 'Medium'
  if (extracted >= 1 && data.dates.length > 0) return 'Low'
  return 'Insufficient'
}

// Determine primary date for this report
export function determinePrimaryDate(dates) {
  if (dates.length === 0) return null
  if (dates.length === 1) return dates[0]
  
  // If multiple dates, prefer most recent
  return dates[dates.length - 1]
}
