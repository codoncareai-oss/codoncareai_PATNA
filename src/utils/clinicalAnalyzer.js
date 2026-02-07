// CLINICAL ANALYZER - Deterministic eGFR calculation and trend analysis
// NO guessing, NO interpolation, NO mock data

import { calculateEGFR } from './calculateEGFR'

/**
 * Calculate eGFR from creatinine value
 * @param {number} creatinine - mg/dL
 * @param {number} age - years
 * @param {string} sex - 'male' or 'female'
 * @returns {number} eGFR in mL/min/1.73m²
 */
export function calculateEGFRFromCreatinine(creatinine, age, sex) {
  return calculateEGFR(creatinine, age, sex)
}

/**
 * Calculate trend from time series values
 * @param {Array} values - [{ value: number, date: string }]
 * @returns {Object} { trend: string, delta: number }
 */
export function calculateTrend(values) {
  if (!values || values.length < 2) {
    return { trend: 'insufficient-data', delta: 0 }
  }

  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0].value
  const last = sorted[sorted.length - 1].value
  const delta = last - first

  if (Math.abs(delta) < 3) {
    return { trend: 'stable', delta }
  }

  return {
    trend: delta > 0 ? 'increasing' : 'decreasing',
    delta
  }
}

/**
 * Determine CKD stage from eGFR
 * @param {number} egfr - mL/min/1.73m²
 * @returns {string} Stage label (G1-G5) or null
 */
export function determineCKDStage(egfr) {
  if (egfr >= 90) return null
  if (egfr >= 60) return 'G2'
  if (egfr >= 45) return 'G3a'
  if (egfr >= 30) return 'G3b'
  if (egfr >= 15) return 'G4'
  return 'G5'
}
