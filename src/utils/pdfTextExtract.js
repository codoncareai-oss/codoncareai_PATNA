import * as pdfjsLib from 'pdfjs-dist'

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    const tableContext = {
      active: false,
      lastDetectedHeaders: [],
      lastDetectedTests: [],
      lastPageIndex: -1
    }
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      
      // Check if this page continues a table from previous page
      const continuesTable = detectTableContinuation(pageText, tableContext, i)
      
      if (continuesTable) {
        // Prepend previous headers to help parser
        fullText += `\n[TABLE CONTINUATION FROM PAGE ${tableContext.lastPageIndex}]\n`
        if (tableContext.lastDetectedHeaders.length > 0) {
          fullText += `DATES: ${tableContext.lastDetectedHeaders.join(' | ')}\n`
        }
      }
      
      fullText += pageText + '\n'
      
      // Update table context for next page
      updateTableContext(pageText, tableContext, i)
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('PDF extraction error:', error)
    return null
  }
}

function detectTableContinuation(pageText, tableContext, pageIndex) {
  if (!tableContext.active) return false
  if (pageIndex !== tableContext.lastPageIndex + 1) return false
  
  // Check if page has numeric values but no new headers
  const hasNumericValues = /\d+\.?\d*/.test(pageText)
  const hasNewHeaders = /test\s+name|parameter|investigation/i.test(pageText)
  
  // Check if page has kidney-related test names without headers
  const hasKidneyTests = /creat|urea|egfr|bun/i.test(pageText)
  
  return hasNumericValues && !hasNewHeaders && hasKidneyTests
}

function updateTableContext(pageText, tableContext, pageIndex) {
  // Detect if this page has a table with kidney markers
  const hasKidneyMarkers = /serum\s+creat|blood\s+urea|egfr|bun/i.test(pageText)
  
  if (hasKidneyMarkers) {
    tableContext.active = true
    tableContext.lastPageIndex = pageIndex
    
    // Extract dates from this page
    const dates = extractDatesFromText(pageText)
    if (dates.length > 0) {
      tableContext.lastDetectedHeaders = dates
    }
  }
  
  // Detect if table has ended (new unrelated section)
  const hasNewSection = /clinical\s+history|impression|diagnosis|recommendation/i.test(pageText)
  if (hasNewSection) {
    tableContext.active = false
  }
}

function extractDatesFromText(text) {
  const dates = []
  const patterns = [
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g
  ]
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      dates.push(match[0])
    }
  }
  
  return dates
}

