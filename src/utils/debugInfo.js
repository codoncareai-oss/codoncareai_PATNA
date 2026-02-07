// Debug information for transparency
export function generateDebugInfo(extractedReports, timeline) {
  const debug = {
    totalReports: extractedReports.length,
    extractedDates: [],
    extractedMarkers: {},
    discardedValues: [],
    timelineStats: {}
  }
  
  // Collect all extracted dates
  for (const report of extractedReports) {
    if (report.primaryDate) {
      debug.extractedDates.push({
        file: report.sourceFile,
        date: report.primaryDate,
        allDates: report.data.dates
      })
    } else {
      debug.discardedValues.push({
        file: report.sourceFile,
        reason: 'No valid date found'
      })
    }
  }
  
  // Marker extraction summary
  for (const report of extractedReports) {
    for (const [marker, value] of Object.entries(report.data)) {
      if (marker === 'dates') continue
      if (value !== null) {
        if (!debug.extractedMarkers[marker]) {
          debug.extractedMarkers[marker] = 0
        }
        debug.extractedMarkers[marker]++
      }
    }
  }
  
  // Timeline statistics
  for (const [marker, entries] of Object.entries(timeline)) {
    if (entries.length > 0) {
      debug.timelineStats[marker] = {
        count: entries.length,
        firstDate: entries[0].date,
        lastDate: entries[entries.length - 1].date,
        calculated: entries.filter(e => e.type === 'calculated').length
      }
    }
  }
  
  return debug
}

export function formatDebugPanel(debug) {
  let output = '=== EXTRACTION DEBUG INFO ===\n\n'
  
  output += `Total Reports Processed: ${debug.totalReports}\n\n`
  
  output += '--- Extracted Dates ---\n'
  for (const item of debug.extractedDates) {
    output += `${item.file}: ${item.date}\n`
    if (item.allDates.length > 1) {
      output += `  (Multiple dates found: ${item.allDates.join(', ')})\n`
    }
  }
  output += '\n'
  
  output += '--- Extracted Markers ---\n'
  for (const [marker, count] of Object.entries(debug.extractedMarkers)) {
    output += `${marker}: ${count} values\n`
  }
  output += '\n'
  
  if (debug.discardedValues.length > 0) {
    output += '--- Discarded Reports ---\n'
    for (const item of debug.discardedValues) {
      output += `${item.file}: ${item.reason}\n`
    }
    output += '\n'
  }
  
  output += '--- Timeline Statistics ---\n'
  for (const [marker, stats] of Object.entries(debug.timelineStats)) {
    output += `${marker}: ${stats.count} points (${stats.firstDate} to ${stats.lastDate})\n`
    if (stats.calculated > 0) {
      output += `  ${stats.calculated} calculated values\n`
    }
  }
  
  return output
}
