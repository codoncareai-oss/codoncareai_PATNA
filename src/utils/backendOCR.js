// Backend OCR Client
// Calls PaddleOCR backend for raw row extraction

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://codoncareai-backend.duckdns.org'

/**
 * Extract raw rows from file using backend PaddleOCR
 * @param {File} file - PDF or image file
 * @returns {Promise<Array>} Raw rows
 */
export async function extractRawRowsBackend(file) {
  console.log(`🔧 Calling backend OCR: ${file.name}`)
  
  const formData = new FormData()
  formData.append('file', file)
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 300000) // 5 minutes
  
  try {
    const response = await fetch(`${BACKEND_URL}/extract`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Backend OCR failed: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    
    console.log(`✅ Backend OCR: ${result.rows.length} raw rows extracted`)
    
    return result.rows
    
  } catch (error) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      throw new Error('OCR request timed out after 5 minutes. File may be too large or backend is overloaded.')
    }
    console.error('❌ Backend OCR error:', error.message)
    throw error
  }
}
