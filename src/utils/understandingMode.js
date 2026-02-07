// LAYER 1: UNDERSTANDING MODE
// Extract and detect without interpretation

export function understandReport(extractedText) {
  const understanding = {
    detected_tests: [],
    detected_dates: [],
    format: 'unknown',
    tables_detected: false,
    extraction_confidence: 'low',
    source_hints: []
  }
  
  // Detect test names with synonyms
  const testPatterns = [
    { 
      raw_patterns: [/serum\s+creat(?:inine)?/gi, /s\.?\s*creat/gi, /\bcreat(?:inine)?\b/gi],
      normalized: 'creatinine',
      name: 'Serum Creatinine'
    },
    {
      raw_patterns: [/\begfr\b/gi, /e\.gfr/gi, /estimated\s+gfr/gi],
      normalized: 'egfr',
      name: 'eGFR'
    },
    {
      raw_patterns: [/\bhb\b/gi, /h\.b\./gi, /hemoglobin/gi, /haemoglobin/gi],
      normalized: 'hemoglobin',
      name: 'Hemoglobin'
    },
    {
      raw_patterns: [/\bpth\b/gi, /parathyroid/gi],
      normalized: 'pth',
      name: 'PTH'
    },
    {
      raw_patterns: [/phosph(?:orus|ate)/gi],
      normalized: 'phosphorus',
      name: 'Phosphorus'
    },
    {
      raw_patterns: [/bicarb(?:onate)?/gi, /hco3/gi],
      normalized: 'bicarbonate',
      name: 'Bicarbonate'
    },
    {
      raw_patterns: [/(?:blood\s+)?(?:urea|bun)/gi],
      normalized: 'urea',
      name: 'Blood Urea'
    }
  ]
  
  const detectedTests = new Map()
  
  for (const test of testPatterns) {
    let totalCount = 0
    const rawMatches = []
    
    for (const pattern of test.raw_patterns) {
      const matches = extractedText.matchAll(pattern)
      for (const match of matches) {
        totalCount++
        if (!rawMatches.includes(match[0])) {
          rawMatches.push(match[0])
        }
      }
    }
    
    if (totalCount > 0) {
      detectedTests.set(test.normalized, {
        raw: rawMatches.join(', '),
        normalized_candidate: test.normalized,
        display_name: test.name,
        count: totalCount
      })
    }
  }
  
  understanding.detected_tests = Array.from(detectedTests.values())
  
  // Detect dates with sanitization
  understanding.detected_dates = detectAndSanitizeDates(extractedText)
  
  // Detect format
  if (extractedText.includes('|') || /\s{4,}/.test(extractedText)) {
    understanding.format = 'table_based'
    understanding.tables_detected = true
  } else if (extractedText.length > 500) {
    understanding.format = 'paragraph_based'
  } else {
    understanding.format = 'mixed'
  }
  
  // Detect source hints
  const hospitalPatterns = [
    /medanta/gi, /apollo/gi, /fortis/gi, /max\s+hospital/gi,
    /aiims/gi, /pgimer/gi, /laboratory/gi, /diagnostics/gi
  ]
  
  for (const pattern of hospitalPatterns) {
    const match = extractedText.match(pattern)
    if (match && !understanding.source_hints.includes(match[0])) {
      understanding.source_hints.push(match[0])
    }
  }
  
  // Calculate confidence
  const hasMultipleTests = understanding.detected_tests.length >= 2
  const hasMultipleDates = understanding.detected_dates.length >= 2
  const hasSource = understanding.source_hints.length > 0
  
  if (hasMultipleTests && hasMultipleDates && hasSource) {
    understanding.extraction_confidence = 'high'
  } else if (hasMultipleTests && hasMultipleDates) {
    understanding.extraction_confidence = 'medium'
  } else {
    understanding.extraction_confidence = 'low'
  }
  
  return understanding
}

// DATE SANITIZATION - Critical for medical safety
function detectAndSanitizeDates(text) {
  const dates = []
  const seen = new Set()
  const discarded = []
  
  const patterns = [
    { pattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g, type: 'slash' },
    { pattern: /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g, type: 'iso' },
    { pattern: /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi, type: 'text' }
  ]
  
  for (const { pattern, type } of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const raw = match[0]
      const iso = parseToISO(raw)
      
      if (!iso) continue
      
      // CRITICAL: Sanitize dates - ignore DOB and old dates
      const year = parseInt(iso.split('-')[0])
      if (year < 1990) {
        discarded.push({ raw, iso, reason: 'Year < 1990 (likely DOB or registration date)' })
        continue
      }
      
      // Ignore future dates
      const dateObj = new Date(iso)
      const now = new Date()
      if (dateObj > now) {
        discarded.push({ raw, iso, reason: 'Future date' })
        continue
      }
      
      if (!seen.has(iso)) {
        seen.add(iso)
        dates.push({
          raw: raw,
          iso_candidate: iso,
          format_type: type
        })
      }
    }
  }
  
  // Store discarded dates for debug transparency
  if (discarded.length > 0) {
    console.log('Discarded dates:', discarded)
  }
  
  return dates.sort((a, b) => a.iso_candidate.localeCompare(b.iso_candidate))
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

// Check if kidney analysis is possible - FIXED LOGIC
export function canAnalyzeKidneyFunction(understanding) {
  const hasCreatinine = understanding.detected_tests.some(t => 
    t.normalized_candidate === 'creatinine'
  )
  
  // CRITICAL FIX: eGFR presence is OPTIONAL, not required
  // Only creatinine + dates needed
  const hasValidDates = understanding.detected_dates.length >= 2
  
  return {
    possible: hasCreatinine && hasValidDates,
    reasons: {
      has_kidney_markers: hasCreatinine,
      has_multiple_dates: hasValidDates,
      min_dates_required: 2,
      actual_dates: understanding.detected_dates.length,
      note: 'eGFR will be calculated from creatinine if not present in report'
    }
  }
}
