// Debug information for transparency
export function generateDebugInfo(extractedReports, timeline) {
  const debug = {
    totalReports: extractedReports.length,
    extractedDataPoints: [],
    discardedReports: [],
    timelineStats: {}
  }
  
  // Collect all extracted data points
  for (const report of extractedReports) {
    if (report.dataPoints && report.dataPoints.length > 0) {
      debug.extractedDataPoints.push({
        file: report.sourceFile,
        points: report.dataPoints.length,
        dates: [...new Set(report.dataPoints.map(p => p.date))],
        markers: [...new Set(report.dataPoints.map(p => p.marker))]
      })
    } else {
      debug.discardedReports.push({
        file: report.sourceFile,
        reason: 'No valid data points extracted'
      })
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
  
  output += '--- Extracted Data Points ---\n'
  for (const item of debug.extractedDataPoints) {
    output += `${item.file}:\n`
    output += `  Data points: ${item.points}\n`
    output += `  Dates: ${item.dates.join(', ')}\n`
    output += `  Markers: ${item.markers.join(', ')}\n\n`
  }
  
  if (debug.discardedReports.length > 0) {
    output += '--- Discarded Reports ---\n'
    for (const item of debug.discardedReports) {
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
