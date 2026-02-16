export async function analyzeReport(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await fetch('https://api.codoncareai.com/analyze-report', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Backend failed: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('Backend response:', result)
    return result
    
  } catch (error) {
    console.error('Analysis error:', error)
    throw error
  }
}
