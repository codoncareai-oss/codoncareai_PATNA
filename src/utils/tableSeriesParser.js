// TABLE-AWARE SERIES EXTRACTION
// Handles lab reports where dates are column headers and values are in rows
// NOW SUPPORTS MULTIPAGE TABLE REASSEMBLY

export function extractTableSeries(text, detectedDates) {
  const series = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  if (detectedDates.length < 1) return series
  
  // Check for table continuation markers
  let inheritedDates = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('[TABLE CONTINUATION FROM PAGE')) {
      // Next line should have dates
      if (i + 1 < lines.length && lines[i + 1].startsWith('DATES:')) {
        const dateStr = lines[i + 1].replace('DATES:', '').trim()
        inheritedDates = dateStr.split('|').map(d => d.trim())
      }
    }
  }
  
  // Test patterns to detect
  const testPatterns = {
    creatinine: /(?:serum\s+)?creat(?:inine)?/i,
    egfr: /egfr/i,
    hemoglobin: /(?:hb|hemoglobin|haemoglobin)/i,
    pth: /(?:pth|parathyroid)/i,
    phosphorus: /phosph(?:orus|ate)/i,
    bicarbonate: /(?:hco3|bicarb)/i,
    urea: /(?:urea|bun|blood\s+urea)/i,
    calcium: /calcium/i
  }
  
  // Use inherited dates if available, otherwise use detected dates
  const activeDates = inheritedDates.length > 0 ? 
    inheritedDates.map(d => ({ raw: d, iso_candidate: parseToISO(d) })).filter(d => d.iso_candidate) :
    detectedDates
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip continuation markers
    if (line.includes('[TABLE CONTINUATION') || line.startsWith('DATES:')) continue
    
    // Check if line contains a test name
    let matchedTest = null
    let testKey = null
    
    for (const [key, pattern] of Object.entries(testPatterns)) {
      if (pattern.test(line)) {
        matchedTest = line.split(/\s{2,}|\t|\|/)[0].trim()
        testKey = key
        break
      }
    }
    
    if (!matchedTest) continue
    
    // Extract numeric values from this line
    const values = extractNumericValues(line)
    
    if (values.length === 0) continue
    
    // Extract unit if present
    const unit = extractUnit(line, testKey)
    
    // Map values to dates by column index
    // If more values than dates, use nearest date for orphan values
    for (let j = 0; j < values.length; j++) {
      const value = values[j]
      
      // Validate value range
      if (!isValidValue(testKey, value)) continue
      
      // Determine date for this value
      let dateObj
      if (j < activeDates.length) {
        dateObj = activeDates[j]
      } else if (activeDates.length > 0) {
        // Orphan value - use last available date
        dateObj = activeDates[activeDates.length - 1]
      } else {
        continue
      }
      
      series.push({
        test: testKey,
        display_name: matchedTest,
        value: value,
        unit: unit || 'unknown',
        date: dateObj.iso_candidate,
        date_raw: dateObj.raw,
        source: 'table-column',
        confidence: 0.85
      })
    }
  }
  
  return series
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
  
  // Try other formats
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  
  return null
}

function extractNumericValues(line) {
  const values = []
  
  // Remove test name from beginning
  const parts = line.split(/\s{2,}|\t|\|/)
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim()
    const num = parseFloat(part)
    
    if (isNaN(num)) continue
    
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
    egfr: /m[lL]\s*\/?\s*min/i,
    hemoglobin: /g\s*\/?\s*d[lL]/i,
    pth: /pg\s*\/?\s*m[lL]/i,
    phosphorus: /mg\s*\/?\s*d[lL]/i,
    bicarbonate: /mm?ol\s*\/?\s*[lL]/i,
    urea: /mg\s*\/?\s*d[lL]/i,
    calcium: /mg\s*\/?\s*d[lL]/i
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
    urea: [5, 300],
    calcium: [5, 20]
  }
  
  const range = ranges[testType]
  if (!range) return true
  return value >= range[0] && value <= range[1]
}

// Check if text has table structure
export function hasTableStructure(text) {
  const lines = text.split('\n')
  
  // Look for lines with multiple separators (tabs, pipes, or multiple spaces)
  let tableLines = 0
  
  for (const line of lines) {
    if (line.match(/\|/) || line.match(/\t/) || line.match(/\s{4,}/)) {
      tableLines++
    }
  }
  
  return tableLines >= 3
}
