// LAYER 3: CLINICAL LOGIC MODE (STRICT GATES)
// Only execute if all safety gates pass

import { calculateEGFR } from './calculateEGFR'

// Gate 1: Check if eGFR calculation is allowed
export function canCalculateEGFR(normalizedData, patientAge, patientGender) {
  const creatinineEntries = normalizedData.filter(e => e.test === 'creatinine')
  
  const gates = {
    passed: false,
    min_creatinine_values: creatinineEntries.length >= 2,
    date_span_adequate: false,
    age_provided: patientAge !== null && patientAge > 0,
    gender_provided: patientGender !== null,
    reasons: []
  }
  
  // MAJOR BUG FIX: Do NOT require explicit eGFR presence
  // If ≥2 creatinine values exist with valid dates → Calculate eGFR
  
  if (creatinineEntries.length < 2) {
    gates.reasons.push(`Only ${creatinineEntries.length} creatinine value(s) found. Minimum 2 required.`)
  }
  
  if (!gates.age_provided) {
    gates.reasons.push('Patient age required for eGFR calculation')
  }
  
  if (!gates.gender_provided) {
    gates.reasons.push('Patient gender required for eGFR calculation')
  }
  
  // Check date span
  if (creatinineEntries.length >= 2) {
    const dates = creatinineEntries.map(e => new Date(e.date)).sort((a, b) => a - b)
    const daysDiff = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)
    gates.date_span_adequate = daysDiff >= 90
    
    if (!gates.date_span_adequate) {
      gates.reasons.push(`Date span is ${Math.round(daysDiff)} days. Minimum 90 days required for reliable trend analysis.`)
    }
  }
  
  gates.passed = gates.min_creatinine_values && gates.date_span_adequate && 
                 gates.age_provided && gates.gender_provided
  
  return gates
}

// Calculate eGFR for normalized data (only if gates pass)
export function calculateEGFRForNormalizedData(normalizedData, patientBirthYear, patientGender) {
  const egfrEntries = []
  
  const creatinineEntries = normalizedData.filter(e => e.test === 'creatinine')
  
  for (const entry of creatinineEntries) {
    const testYear = new Date(entry.date).getFullYear()
    const ageAtTest = testYear - patientBirthYear
    
    if (ageAtTest > 0 && ageAtTest < 120) {
      const egfr = calculateEGFR(entry.value, ageAtTest, patientGender)
      
      egfrEntries.push({
        test: 'egfr',
        display_name: 'eGFR (calculated)',
        value: egfr,
        unit: 'mL/min/1.73m²',
        date: entry.date,
        date_raw: entry.date_raw,
        source: 'calculated',
        confidence: entry.confidence,
        calculated_from: 'creatinine'
      })
    }
  }
  
  return egfrEntries
}

// Gate 2: Check if CKD staging is allowed
export function canStageCKD(egfrData) {
  const gates = {
    passed: false,
    min_readings: egfrData.length >= 2,
    has_low_egfr: false,
    date_span_adequate: false,
    low_egfr_count: 0,
    reasons: []
  }
  
  if (!gates.min_readings) {
    gates.reasons.push('Minimum 2 eGFR readings required for CKD staging')
    return gates
  }
  
  // Count low eGFR readings (< 60)
  gates.low_egfr_count = egfrData.filter(e => e.value < 60).length
  gates.has_low_egfr = gates.low_egfr_count >= 2
  
  if (!gates.has_low_egfr) {
    gates.reasons.push('CKD staging requires ≥2 eGFR readings below 60 mL/min/1.73m²')
    return gates
  }
  
  // Check date span between low readings
  const lowReadings = egfrData.filter(e => e.value < 60)
  const dates = lowReadings.map(e => new Date(e.date)).sort((a, b) => a - b)
  const daysDiff = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)
  gates.date_span_adequate = daysDiff >= 90
  
  if (!gates.date_span_adequate) {
    gates.reasons.push(`Low eGFR readings span ${Math.round(daysDiff)} days. Minimum 90 days required for staging.`)
    return gates
  }
  
  gates.passed = true
  return gates
}

// Determine CKD stage (only if gates pass)
export function determineCKDStage(egfrData) {
  const latestEGFR = egfrData[egfrData.length - 1].value
  
  if (latestEGFR >= 60) {
    return { stage: null, reason: 'Latest eGFR ≥ 60 mL/min/1.73m²' }
  }
  
  if (latestEGFR >= 45) {
    return { stage: 'G3a', egfr_range: '45-59', description: 'Mild to moderate reduction' }
  }
  
  if (latestEGFR >= 30) {
    return { stage: 'G3b', egfr_range: '30-44', description: 'Moderate to severe reduction' }
  }
  
  if (latestEGFR >= 15) {
    return { stage: 'G4', egfr_range: '15-29', description: 'Severe reduction' }
  }
  
  return { stage: 'G5', egfr_range: '<15', description: 'Kidney failure' }
}

// Gate 3: Check if trend labeling is allowed
export function canLabelTrend(egfrData) {
  const gates = {
    passed: false,
    min_points: egfrData.length >= 3,
    date_span_adequate: false,
    reasons: []
  }
  
  if (!gates.min_points) {
    gates.reasons.push('Minimum 3 eGFR readings required for trend classification')
    return gates
  }
  
  // Check date span
  const dates = egfrData.map(e => new Date(e.date)).sort((a, b) => a - b)
  const daysDiff = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)
  gates.date_span_adequate = daysDiff >= 180 // 6 months minimum
  
  if (!gates.date_span_adequate) {
    gates.reasons.push(`Date span is ${Math.round(daysDiff)} days. Minimum 180 days required for trend classification.`)
    return gates
  }
  
  gates.passed = true
  return gates
}

// Calculate trend (only if gates pass)
export function calculateTrend(egfrData) {
  if (egfrData.length < 2) {
    return { slope: 0, label: 'Insufficient data', confidence: 'none' }
  }
  
  const first = egfrData[0]
  const last = egfrData[egfrData.length - 1]
  
  const firstDate = new Date(first.date)
  const lastDate = new Date(last.date)
  const years = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (years === 0) {
    return { slope: 0, label: 'Insufficient data', confidence: 'none' }
  }
  
  const slope = (last.value - first.value) / years
  const roundedSlope = Math.round(slope * 10) / 10
  
  // Determine label based on slope
  let label = 'Insufficient data to classify trend'
  
  if (egfrData.length >= 3) {
    if (slope > 0) {
      label = 'Improving'
    } else if (slope >= -3) {
      label = 'Stable'
    } else {
      label = 'Progressive decline'
    }
  }
  
  // Calculate confidence
  let confidence = 'low'
  if (egfrData.length >= 6 && years >= 2) {
    confidence = 'high'
  } else if (egfrData.length >= 4 && years >= 1) {
    confidence = 'medium'
  }
  
  return { slope: roundedSlope, label, confidence }
}
