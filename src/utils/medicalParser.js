// Extract medical biomarkers from text
export function parseMedicalData(text) {
  const data = {
    creatinine: null,
    egfr: null,
    hemoglobin: null,
    pth: null,
    phosphorus: null,
    bicarbonate: null,
    urineProtein: null,
    date: null
  }
  
  const lines = text.split('\n')
  
  // Patterns for biomarkers (case-insensitive, flexible)
  const patterns = {
    creatinine: /(?:serum\s+)?creatinine[:\s]+([0-9.]+)/i,
    egfr: /egfr[:\s]+([0-9.]+)/i,
    hemoglobin: /(?:hb|hemoglobin)[:\s]+([0-9.]+)/i,
    pth: /pth[:\s]+([0-9.]+)/i,
    phosphorus: /phosphorus[:\s]+([0-9.]+)/i,
    bicarbonate: /(?:hco3|bicarbonate)[:\s]+([0-9.]+)/i,
    urineProtein: /(?:urine\s+)?(?:protein|albumin)[:\s]+([0-9.]+)/i
  }
  
  // Extract values
  for (const [key, pattern] of Object.entries(patterns)) {
    for (const line of lines) {
      const match = line.match(pattern)
      if (match) {
        data[key] = parseFloat(match[1])
        break
      }
    }
  }
  
  // Extract date
  data.date = extractDate(text)
  
  return data
}

function extractDate(text) {
  // Try various date formats
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // 07/02/2025 or 07-02-2025
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,    // 2025-02-07
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i,  // Feb 7, 2025
    /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i     // 7 Feb 2025
  ]
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      const dateStr = match[0]
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }
  }
  
  return null
}

// Calculate confidence based on how many fields were extracted
export function calculateConfidence(data) {
  const fields = ['creatinine', 'egfr', 'hemoglobin', 'pth', 'date']
  const extracted = fields.filter(f => data[f] !== null).length
  
  if (extracted >= 4) return 'High'
  if (extracted >= 2) return 'Medium'
  return 'Low'
}
