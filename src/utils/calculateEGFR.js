// CKD-EPI 2021 equation (race-free)
export function calculateEGFR(creatinine, age, gender) {
  const isFemale = gender.toLowerCase() === 'female'
  const kappa = isFemale ? 0.7 : 0.9
  const alpha = isFemale ? -0.241 : -0.302
  const constant = isFemale ? 1.012 : 1.0
  
  const ratio = creatinine / kappa
  const minTerm = Math.min(ratio, 1) ** alpha
  const maxTerm = Math.max(ratio, 1) ** -1.200
  const ageTerm = 0.9938 ** age
  
  const egfr = 142 * minTerm * maxTerm * ageTerm * constant
  
  return Math.round(egfr * 10) / 10
}
