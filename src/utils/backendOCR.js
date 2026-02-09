// Backend OCR Client
// Calls PaddleOCR backend for raw row extraction

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

/**
 * Extract raw rows from file using backend PaddleOCR
 * @param {File} file - PDF or image file
 * @returns {Promise<Array>} Raw rows
 */
export async function extractRawRowsBackend(file) {
  console.log(`🔧 Calling backend OCR: ${file.name}`)
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await fetch(`${BACKEND_URL}/ocr/extract`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Backend OCR failed: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    
    console.log(`✅ Backend OCR: ${result.rows.length} raw rows extracted`)
    
    return result.rows
    
  } catch (error) {
    console.error('❌ Backend OCR error:', error.message)
    throw error
  }
}
