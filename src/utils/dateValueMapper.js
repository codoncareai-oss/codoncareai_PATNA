import { calculateEGFR } from './calculateEGFR'
import { detectTableStructure, parseTableData, hasKidneyMarkers, generateTableDebugInfo } from './tableParser'

// Build master longitudinal timeline from multiple reports
export function buildMasterTimeline(extractedReports, patientBirthYear, patientGender) {
  const timeline = {
    creatinine: [],
    egfr: [],
    hemoglobin: [],
    pth: [],
    phosphorus: [],
    bicarbonate: [],
    urea: [],
    calcium: [],
    ferritin: [],
    urineProtein: []
  }
  
  for (const report of extractedReports) {
    const { dataPoints, sourceFile } = report
    
    if (!dataPoints || dataPoints.length === 0) continue
    
    // Add each data point to timeline
    for (const point of dataPoints) {
      const { marker, value, date } = point
      
      if (!date || value === null) continue
      
      if (timeline[marker]) {
        timeline[marker].push({
          date: date,
          value: value,
          sourceFile: sourceFile,
          type: 'reported'
        })
      }
    }
    
    // Calculate eGFR for each creatinine value if missing
    for (const creatPoint of dataPoints.filter(p => p.marker === 'creatinine')) {
      const { date, value } = creatPoint
      
      // Check if eGFR already exists for this date
      const hasEGFR = dataPoints.some(p => p.marker === 'egfr' && p.date === date)
      
      if (!hasEGFR && patientBirthYear && patientGender) {
        const testYear = new Date(date).getFullYear()
        const ageAtTest = testYear - patientBirthYear
        
        if (ageAtTest > 0 && ageAtTest < 120) {
          const calculatedEGFR = calculateEGFR(value, ageAtTest, patientGender)
          
          timeline.egfr.push({
            date: date,
            value: calculatedEGFR,
            sourceFile: sourceFile,
            type: 'calculated'
          })
        }
      }
    }
  }
  
  // Sort, deduplicate, and clean each marker timeline
  for (const marker in timeline) {
    timeline[marker] = cleanMarkerTimeline(timeline[marker])
  }
  
  return timeline
}

function cleanMarkerTimeline(entries) {
  if (entries.length === 0) return []
  
  // Sort chronologically
  entries.sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Remove duplicates (same date - keep first)
  const seen = new Map()
  const unique = []
  
  for (const entry of entries) {
    if (!seen.has(entry.date)) {
      seen.set(entry.date, true)
      unique.push(entry)
    }
  }
  
  return unique
}

// Convert timeline to chart format
export function timelineToChartData(timeline) {
  const egfrData = timeline.egfr.map(e => ({
    date: e.date,
    egfr: e.value,
    calculated: e.type === 'calculated'
  }))
  
  return egfrData
}

// Get latest values for cards
export function getLatestValues(timeline) {
  const latest = {}
  
  for (const [marker, entries] of Object.entries(timeline)) {
    if (entries.length > 0) {
      latest[marker] = entries[entries.length - 1].value
    } else {
      latest[marker] = null
    }
  }
  
  return latest
}

// Calculate trend for a marker
export function calculateMarkerTrend(entries) {
  if (entries.length < 2) return 'stable'
  
  const first = entries[0].value
  const last = entries[entries.length - 1].value
  
  const change = ((last - first) / first) * 100
  
  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}
