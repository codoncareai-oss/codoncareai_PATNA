// Detect and parse table structures with dates as column headers
export function detectTableStructure(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const tables = []
  let currentTable = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if line contains multiple dates (potential header)
    const dates = extractDatesFromLine(line)
    
    if (dates.length >= 2) {
      // Found a table header with multiple dates
      if (currentTable) {
        tables.push(currentTable)
      }
      
      currentTable = {
        headerLine: line,
        headerIndex: i,
        dates: dates,
        rows: []
      }
    } else if (currentTable && line.length > 10) {
      // Potential data row
      currentTable.rows.push({
        line: line,
        index: i
      })
    } else if (currentTable && line.length < 5) {
      // Empty line - end of table
      tables.push(currentTable)
      currentTable = null
    }
  }
  
  if (currentTable) {
    tables.push(currentTable)
  }
  
  return tables
}

function extractDatesFromLine(line) {
  const dates = []
  
  // Date patterns
  const patterns = [
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g
  ]
  
  for (const pattern of patterns) {
    const matches = line.matchAll(pattern)
    for (const match of matches) {
      const dateStr = match[0]
      const parsed = parseDate(dateStr)
      if (parsed) {
        dates.push({
          raw: dateStr,
          parsed: parsed,
          position: match.index
        })
      }
    }
  }
  
  return dates
}

function parseDate(dateStr) {
  // Try DD/MM/YYYY or DD-MM-YYYY
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

// Parse table rows and map values to dates
export function parseTableData(table, text) {
  const results = []
  
  // Kidney markers to look for
  const markerPatterns = {
    creatinine: /(?:serum\s+)?creat(?:inine)?/i,
    egfr: /egfr/i,
    urea: /(?:blood\s+)?(?:urea|bun)/i,
    hemoglobin: /(?:hb|h\.b\.|hemoglobin|haemoglobin)/i,
    pth: /(?:pth|parathyroid)/i,
    phosphorus: /phosph(?:orus|ate)/i,
    bicarbonate: /(?:hco3|bicarb)/i,
    calcium: /calcium/i
  }
  
  for (const row of table.rows) {
    const line = row.line
    
    // Check if this row contains a marker
    let markerName = null
    let markerKey = null
    
    for (const [key, pattern] of Object.entries(markerPatterns)) {
      if (pattern.test(line)) {
        markerKey = key
        markerName = line.split(/\s{2,}|\t|\|/)[0].trim()
        break
      }
    }
    
    if (!markerKey) continue
    
    // Extract all numeric values from the row
    const values = extractNumericValues(line)
    
    if (values.length === 0) continue
    
    // Map values to dates
    // Assume values appear in same order as dates in header
    const numDates = table.dates.length
    const numValues = Math.min(values.length, numDates)
    
    for (let i = 0; i < numValues; i++) {
      const value = values[i]
      const date = table.dates[i].parsed
      
      // Sanity check
      if (isValidBiomarkerValue(markerKey, value)) {
        results.push({
          marker: markerKey,
          markerName: markerName,
          value: value,
          date: date,
          sourceTable: table.headerLine
        })
      }
    }
  }
  
  return results
}

function extractNumericValues(line) {
  const values = []
  
  // Match numbers (including decimals)
  const numberPattern = /\b(\d+\.?\d*)\b/g
  const matches = line.matchAll(numberPattern)
  
  for (const match of matches) {
    const num = parseFloat(match[1])
    
    // Filter out years and reference ranges
    if (num > 1900 && num < 2100) continue
    if (num > 200) continue // Likely not a biomarker value
    
    values.push(num)
  }
  
  return values
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
    calcium: [5, 20]
  }
  
  const range = ranges[marker]
  if (!range) return true
  return value >= range[0] && value <= range[1]
}

// Check if report contains kidney markers
export function hasKidneyMarkers(text) {
  const kidneyPatterns = [
    /serum\s+creat(?:inine)?/i,
    /\bcreat(?:inine)?\b/i,
    /\begfr\b/i,
    /kidney\s+function/i,
    /renal\s+panel/i,
    /\burea\b/i,
    /\bbun\b/i
  ]
  
  for (const pattern of kidneyPatterns) {
    if (pattern.test(text)) {
      return true
    }
  }
  
  return false
}

// Generate debug info for table detection
export function generateTableDebugInfo(tables) {
  let debug = '=== TABLE DETECTION ===\n\n'
  
  if (tables.length === 0) {
    debug += 'No multi-date tables detected.\n'
    return debug
  }
  
  debug += `Found ${tables.length} table(s) with multiple dates:\n\n`
  
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    debug += `Table ${i + 1}:\n`
    debug += `  Header: ${table.headerLine}\n`
    debug += `  Dates: ${table.dates.map(d => d.parsed).join(', ')}\n`
    debug += `  Rows: ${table.rows.length}\n\n`
  }
  
  return debug
}
