// NEW ANALYSIS ENGINE - eGFR Calculator and Trend Analyzer
// Deterministic, no guessing

import { calculateEGFR } from './calculateEGFR'

// Calculate eGFR from creatinine data points
export function calculateEGFRFromCreatinine(creatininePoints, patientBirthYear, patientGender) {
  const egfrPoints = []
  
  for (const point of creatininePoints) {
    const testYear = parseInt(point.date_iso.split('-')[0])
    const ageAtTest = testYear - patientBirthYear
    
    if (ageAtTest < 1 || ageAtTest > 120) continue
    
    const egfr = calculateEGFR(point.value, ageAtTest, patientGender)
    
    egfrPoints.push({
      test_name: 'eGFR (calculated)',
      canonical_test_key: 'egfr',
      value: egfr,
      unit: 'mL/min/1.73m²',
      date_iso: point.date_iso,
      source_file: point.source_file,
      source_page: point.source_page,
      confidence: point.confidence,
      calculated_from: 'creatinine'
    })
  }
  
  return egfrPoints
}

// Analyze what can be calculated
export function analyzeCapabilities(dataPoints, patientBirthYear, patientGender) {
  const creatininePoints = dataPoints.filter(dp => dp.canonical_test_key === 'creatinine')
  const egfrPoints = dataPoints.filter(dp => dp.canonical_test_key === 'egfr')
  
  const capabilities = {
    detected: {
      creatinine_count: creatininePoints.length,
      egfr_count: egfrPoints.length,
      unique_dates: new Set([...creatininePoints, ...egfrPoints].map(dp => dp.date_iso)).size
    },
    can_calculate_egfr: false,
    can_show_graph: false,
    can_show_trend: false,
    can_stage_ckd: false,
    reasons: []
  }
  
  // Can calculate eGFR?
  if (creatininePoints.length >= 1 && patientBirthYear && patientGender) {
    capabilities.can_calculate_egfr = true
  } else {
    if (creatininePoints.length === 0) {
      capabilities.reasons.push('No creatinine values detected')
    }
    if (!patientBirthYear) {
      capabilities.reasons.push('Birth year not provided')
    }
    if (!patientGender) {
      capabilities.reasons.push('Gender not provided')
    }
  }
  
  // Can show graph?
  const totalEGFRPoints = egfrPoints.length + (capabilities.can_calculate_egfr ? creatininePoints.length : 0)
  if (totalEGFRPoints >= 2) {
    capabilities.can_show_graph = true
  } else {
    capabilities.reasons.push(`Only ${totalEGFRPoints} eGFR time point(s) available. Need ≥2 for graph.`)
  }
  
  // Can show trend?
  if (totalEGFRPoints >= 3) {
    capabilities.can_show_trend = true
  }
  
  // Can stage CKD?
  if (totalEGFRPoints >= 2) {
    capabilities.can_stage_ckd = true
  }
  
  return capabilities
}

// Calculate trend slope
export function calculateTrendSlope(egfrPoints) {
  if (egfrPoints.length < 2) return null
  
  const first = egfrPoints[0]
  const last = egfrPoints[egfrPoints.length - 1]
  
  const firstDate = new Date(first.date_iso)
  const lastDate = new Date(last.date_iso)
  const years = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (years === 0) return null
  
  const slope = (last.value - first.value) / years
  return Math.round(slope * 10) / 10
}

// Classify trend
export function classifyTrend(slope, pointCount) {
  if (slope === null || pointCount < 3) {
    return 'Insufficient data'
  }
  
  if (slope > 0) return 'Improving'
  if (slope >= -3) return 'Stable'
  return 'Declining'
}

// Determine CKD stage
export function determineCKDStage(latestEGFR) {
  if (latestEGFR >= 90) {
    return { stage: null, message: 'No CKD detected (eGFR ≥ 90)' }
  }
  
  if (latestEGFR >= 60) {
    return { stage: 'G2', range: '60-89', description: 'Mildly decreased kidney function' }
  }
  
  if (latestEGFR >= 45) {
    return { stage: 'G3a', range: '45-59', description: 'Mild to moderate reduction' }
  }
  
  if (latestEGFR >= 30) {
    return { stage: 'G3b', range: '30-44', description: 'Moderate to severe reduction' }
  }
  
  if (latestEGFR >= 15) {
    return { stage: 'G4', range: '15-29', description: 'Severe reduction' }
  }
  
  return { stage: 'G5', range: '<15', description: 'Kidney failure' }
}

// Generate debug report
export function generateDebugReport(dataPoints, capabilities) {
  const report = {
    total_data_points: dataPoints.length,
    by_test: {},
    by_date: {},
    capabilities: capabilities
  }
  
  // Group by test
  for (const dp of dataPoints) {
    if (!report.by_test[dp.canonical_test_key]) {
      report.by_test[dp.canonical_test_key] = []
    }
    report.by_test[dp.canonical_test_key].push({
      date: dp.date_iso,
      value: dp.value,
      unit: dp.unit,
      source: dp.source_file
    })
  }
  
  // Group by date
  for (const dp of dataPoints) {
    if (!report.by_date[dp.date_iso]) {
      report.by_date[dp.date_iso] = []
    }
    report.by_date[dp.date_iso].push({
      test: dp.canonical_test_key,
      value: dp.value,
      unit: dp.unit
    })
  }
  
  return report
}
