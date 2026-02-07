export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { data: [], needsConfirmation: false, columns: [] }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const data = []
  
  // Detect column roles
  const columnRoles = detectColumnRoles(headers)
  
  // Check if ambiguous
  const needsConfirmation = columnRoles.ambiguous.length > 0
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })
    data.push(row)
  }
  
  return { 
    data, 
    needsConfirmation,
    columns: headers,
    columnRoles
  }
}

function detectColumnRoles(headers) {
  const roles = {
    date: [],
    test: [],
    value: [],
    patient: [],
    ambiguous: []
  }
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    
    // Date patterns
    if (header.match(/date|time|day|month|year/i)) {
      roles.date.push({ index: i, name: header })
    }
    // Test patterns
    else if (header.match(/test|marker|parameter|name/i)) {
      roles.test.push({ index: i, name: header })
    }
    // Patient patterns
    else if (header.match(/patient|id|name|subject/i)) {
      roles.patient.push({ index: i, name: header })
    }
    // Known biomarkers
    else if (header.match(/creat|egfr|hb|hemoglobin|pth|phosph|bicarb|urea|bun/i)) {
      roles.value.push({ index: i, name: header, biomarker: header })
    }
    // Ambiguous
    else if (header.match(/value|result|level/i)) {
      roles.ambiguous.push({ index: i, name: header })
    }
  }
  
  return roles
}

// Check if CSV has multiple patients
export function hasMultiplePatients(data, columnRoles) {
  if (columnRoles.patient.length === 0) return false
  
  const patientCol = columnRoles.patient[0].name
  const uniquePatients = new Set(data.map(row => row[patientCol]))
  
  return uniquePatients.size > 1
}
