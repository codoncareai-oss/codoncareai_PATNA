export function calculateSlope(egfrEntries) {
  if (egfrEntries.length < 2) return 0
  
  const first = egfrEntries[0]
  const last = egfrEntries[egfrEntries.length - 1]
  
  const firstDate = new Date(first.date)
  const lastDate = new Date(last.date)
  const years = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (years === 0) return 0
  
  const slope = (last.value - first.value) / years
  return Math.round(slope * 10) / 10
}

export function getTrendStatus(slope, confidence) {
  // Don't show strong conclusions if confidence is low
  if (confidence === 'Low' || confidence === 'Insufficient') {
    return 'Insufficient Data'
  }
  
  if (slope > 0) return 'Improving'
  if (slope >= -3) return 'Stable'
  if (slope >= -5) return 'Declining'
  return 'Declining'
}

export function calculateTrendConfidence(egfrEntries) {
  if (egfrEntries.length < 3) return 'Insufficient'
  
  const timeSpan = getTimeSpanYears(egfrEntries)
  
  // Dense data over long period = high confidence
  if (egfrEntries.length >= 6 && timeSpan >= 2) return 'High'
  if (egfrEntries.length >= 4 && timeSpan >= 1) return 'Medium'
  if (egfrEntries.length >= 3) return 'Low'
  
  return 'Insufficient'
}

function getTimeSpanYears(entries) {
  if (entries.length < 2) return 0
  
  const first = new Date(entries[0].date)
  const last = new Date(entries[entries.length - 1].date)
  
  return (last - first) / (1000 * 60 * 60 * 24 * 365.25)
}

export function determineCKDStage(egfrEntries) {
  // STRICT SAFETY: Only show CKD stage if justified
  
  // Need at least 2 data points
  if (egfrEntries.length < 2) {
    return { stage: null, reason: 'Insufficient data points' }
  }
  
  // Check if eGFR is consistently < 60
  const lowEGFRCount = egfrEntries.filter(e => e.value < 60).length
  
  if (lowEGFRCount < 2) {
    return { stage: null, reason: 'No consistent low eGFR values' }
  }
  
  // Get latest eGFR
  const latestEGFR = egfrEntries[egfrEntries.length - 1].value
  
  // Only show stage if eGFR < 60
  if (latestEGFR >= 60) {
    return { stage: null, reason: 'Latest eGFR ≥ 60' }
  }
  
  // Check confidence
  const confidence = calculateTrendConfidence(egfrEntries)
  if (confidence === 'Low' || confidence === 'Insufficient') {
    return { stage: null, reason: 'Low confidence in trend data' }
  }
  
  // Determine stage based on latest eGFR
  if (latestEGFR >= 60) return { stage: null, reason: 'eGFR ≥ 60' }
  if (latestEGFR >= 45) return { stage: 'G3a', reason: 'eGFR 45-59' }
  if (latestEGFR >= 30) return { stage: 'G3b', reason: 'eGFR 30-44' }
  if (latestEGFR >= 15) return { stage: 'G4', reason: 'eGFR 15-29' }
  return { stage: 'G5', reason: 'eGFR < 15' }
}
