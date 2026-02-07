export function calculateSlope(data) {
  if (data.length < 2) return 0
  
  const first = data[0]
  const last = data[data.length - 1]
  
  const firstDate = new Date(first.date)
  const lastDate = new Date(last.date)
  const years = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (years === 0) return 0
  
  const slope = (last.egfr - first.egfr) / years
  return Math.round(slope * 10) / 10
}

export function getTrendStatus(slope) {
  if (slope >= -3) return 'Stable'
  if (slope >= -5) return 'Moderate Decline'
  return 'Progressive'
}
