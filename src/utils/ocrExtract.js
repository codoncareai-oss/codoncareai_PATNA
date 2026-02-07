import Tesseract from 'tesseract.js'

export async function extractTextFromImage(file, onProgress) {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100))
        }
      }
    })
    
    return {
      text: result.data.text,
      confidence: result.data.confidence
    }
  } catch (error) {
    console.error('OCR error:', error)
    return null
  }
}
