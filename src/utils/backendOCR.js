const BACKEND_URL = 'https://api.codoncareai.com'

export async function analyzeReport(file, patientInfo) {
  const formData = new FormData()
  formData.append('file', file)
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 300000)
  
  try {
    const response = await fetch(`${BACKEND_URL}/ocr/extract`, {
      method: 'POST',
      headers: {
        'x-birth-year': patientInfo.birthYear.toString(),
        'x-gender': patientInfo.gender.toLowerCase()
      },
      body: formData,
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Backend failed: ${response.status} - ${error}`)
    }
    
    return await response.json()
    
  } catch (error) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 5 minutes')
    }
    throw error
  }
}
