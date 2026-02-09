// RAW ROW EXTRACTOR - Phase 1
// ZERO DATA LOSS - Extract exactly what appears in the report
// NO LLM - Fully deterministic

/**
 * Extract raw rows from text (PDF or OCR output)
 * One visible line = one raw row
 * @param {string} text - Extracted text
 * @returns {Array} Raw rows with row_id and raw_text
 */
export function extractRawRowsFromText(text) {
  const lines = text.split('\n')
  const rawRows = []
  let rowId = 1

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Keep ALL lines, even empty ones (preserve structure)
    rawRows.push({
      row_id: rowId++,
      raw_text: trimmed
    })
  }

  console.log(`📄 RAW EXTRACTION: ${rawRows.length} rows extracted`)
  return rawRows
}

/**
 * Extract raw rows from CSV
 * Each CSV row = one raw row
 * @param {string} csvText - CSV content
 * @returns {Array} Raw rows
 */
export function extractRawRowsFromCSV(csvText) {
  const lines = csvText.split('\n')
  const rawRows = []
  let rowId = 1

  for (const line of lines) {
    rawRows.push({
      row_id: rowId++,
      raw_text: line
    })
  }

  console.log(`📄 RAW EXTRACTION (CSV): ${rawRows.length} rows extracted`)
  return rawRows
}

/**
 * Extract raw rows from any file type
 * @param {string} text - Extracted text
 * @param {string} fileType - 'pdf', 'image', or 'csv'
 * @returns {Array} Raw rows
 */
export function extractRawRows(text, fileType) {
  if (fileType === 'csv') {
    return extractRawRowsFromCSV(text)
  }
  return extractRawRowsFromText(text)
}
