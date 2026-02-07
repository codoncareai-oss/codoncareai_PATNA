import { calculateEGFR } from './calculateEGFR'

// Map extracted data to timeline format
export function mapToTimeline(extractedDataArray, patientAge, patientGender) {
  const timeline = []
  
  for (const data of extractedDataArray) {
    // Skip if no date found
    if (!data.date) {
      console.warn('Skipping entry without date:', data)
      continue
    }
    
    // Calculate eGFR if missing but creatinine exists
    let egfr = data.egfr
    if (!egfr && data.creatinine && patientAge && patientGender) {
      egfr = calculateEGFR(data.creatinine, patientAge, patientGender)
    }
    
    // Only add if we have eGFR
    if (egfr) {
      timeline.push({
        date: data.date,
        egfr: egfr,
        creatinine: data.creatinine || null,
        hemoglobin: data.hemoglobin || null,
        pth: data.pth || null,
        phosphorus: data.phosphorus || null,
        bicarbonate: data.bicarbonate || null,
        urineProtein: data.urineProtein || null,
        calculated: !data.egfr && data.creatinine
      })
    }
  }
  
  // Sort by date
  timeline.sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Remove duplicates (same date)
  const unique = []
  const seen = new Set()
  
  for (const entry of timeline) {
    if (!seen.has(entry.date)) {
      seen.add(entry.date)
      unique.push(entry)
    }
  }
  
  return unique
}
