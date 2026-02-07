export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })
    data.push(row)
  }
  
  return data
}
