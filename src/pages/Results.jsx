import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import EGFRChart from '../components/EGFRChart'
import MarkerCard from '../components/MarkerCard'
import TrendBadge from '../components/TrendBadge'
import { 
  canCalculateEGFR, 
  calculateEGFRForNormalizedData,
  canStageCKD,
  determineCKDStage,
  canLabelTrend,
  calculateTrend
} from '../utils/clinicalLogicMode'

export default function Results() {
  const navigate = useNavigate()
  const location = useLocation()
  const [normalizedData, setNormalizedData] = useState([])
  const [egfrData, setEgfrData] = useState([])
  const [patientInfo, setPatientInfo] = useState({})
  const [ckdStage, setCkdStage] = useState(null)
  const [trend, setTrend] = useState(null)
  const [gates, setGates] = useState({})
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Check if coming from Understanding Summary with confirmation
    if (!location.state?.confirmed) {
      navigate('/upload')
      return
    }

    const normalized = location.state.normalizedData || JSON.parse(sessionStorage.getItem('normalizedData') || '[]')
    const info = JSON.parse(sessionStorage.getItem('patientInfo') || '{}')
    
    if (normalized.length === 0 || !info.birthYear) {
      navigate('/upload')
      return
    }

    setNormalizedData(normalized)
    setPatientInfo(info)
    
    // LAYER 3: CLINICAL LOGIC MODE - Apply strict gates
    
    // Gate 1: eGFR Calculation
    const egfrGate = canCalculateEGFR(normalized, new Date().getFullYear() - info.birthYear, info.gender)
    
    let calculatedEgfr = []
    if (egfrGate.passed) {
      calculatedEgfr = calculateEGFRForNormalizedData(normalized, info.birthYear, info.gender)
    }
    
    // Combine reported and calculated eGFR
    const reportedEgfr = normalized.filter(e => e.test === 'egfr')
    const allEgfr = [...reportedEgfr, ...calculatedEgfr].sort((a, b) => a.date.localeCompare(b.date))
    setEgfrData(allEgfr)
    
    // Gate 2: CKD Staging
    const ckdGate = canStageCKD(allEgfr)
    if (ckdGate.passed) {
      const stage = determineCKDStage(allEgfr)
      setCkdStage(stage)
    }
    
    // Gate 3: Trend Labeling
    const trendGate = canLabelTrend(allEgfr)
    if (trendGate.passed) {
      const trendResult = calculateTrend(allEgfr)
      setTrend(trendResult)
    } else {
      setTrend({ slope: 0, label: 'Insufficient data to classify trend', confidence: 'none' })
    }
    
    setGates({ egfrGate, ckdGate, trendGate })
  }, [navigate, location])

  if (normalizedData.length === 0) return null

  const chartData = egfrData.map(e => ({
    date: e.date,
    egfr: e.value,
    calculated: e.source === 'calculated'
  }))

  const latestValues = {}
  for (const entry of normalizedData) {
    if (!latestValues[entry.test] || entry.date > latestValues[entry.test].date) {
      latestValues[entry.test] = entry
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Clinical Analysis Results</h1>
          <div className="flex items-center space-x-6 text-gray-600 mb-4">
            <div>
              <span className="font-medium">Birth Year:</span> {patientInfo.birthYear}
            </div>
            <div>
              <span className="font-medium">Gender:</span> {patientInfo.gender}
            </div>
            <div>
              <span className="font-medium">eGFR Data Points:</span> {egfrData.length}
            </div>
          </div>
          
          {trend && (
            <div className="mt-4">
              <TrendBadge status={trend.label} />
            </div>
          )}
          
          {/* Gate Status Indicators */}
          <div className="mt-4 space-y-2">
            {gates.egfrGate && !gates.egfrGate.passed && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3">
                <p className="text-sm text-yellow-800">
                  <strong>eGFR Calculation Gate:</strong> {gates.egfrGate.reasons.join(', ')}
                </p>
              </div>
            )}
            
            {gates.ckdGate && !gates.ckdGate.passed && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                <p className="text-sm text-blue-800">
                  <strong>CKD Staging Gate:</strong> {gates.ckdGate.reasons.join(', ')}
                </p>
              </div>
            )}
            
            {gates.trendGate && !gates.trendGate.passed && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Trend Classification Gate:</strong> {gates.trendGate.reasons.join(', ')}
                </p>
              </div>
            )}
          </div>
          
          {/* CKD Stage */}
          {ckdStage && ckdStage.stage && (
            <div className="mt-4 bg-orange-50 border-l-4 border-orange-500 p-3">
              <p className="text-sm text-orange-800">
                <strong>CKD Stage:</strong> {ckdStage.stage} - {ckdStage.description} (eGFR {ckdStage.egfr_range} mL/min/1.73m²)
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Based on trend data only. Consult your healthcare provider for clinical diagnosis.
              </p>
            </div>
          )}
          
          {egfrData.some(e => e.source === 'calculated') && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3">
              <p className="text-sm text-blue-800">
                ℹ️ Some eGFR values were calculated from creatinine using CKD-EPI 2021 equation (age-adjusted per test date).
              </p>
            </div>
          )}
        </motion.div>

        {/* Main Chart */}
        {chartData.length >= 2 ? (
          <EGFRChart data={chartData} />
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <p className="text-center text-gray-600">
              Insufficient eGFR data points for visualization. Minimum 2 values required.
            </p>
          </div>
        )}

        {/* Supporting Markers */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {latestValues.creatinine && (
            <MarkerCard
              title={latestValues.creatinine.display_name}
              value={latestValues.creatinine.value.toFixed(2)}
              unit={latestValues.creatinine.unit}
              data={normalizedData.filter(e => e.test === 'creatinine').map(e => ({ value: e.value }))}
              trend="stable"
            />
          )}
          {latestValues.hemoglobin && (
            <MarkerCard
              title={latestValues.hemoglobin.display_name}
              value={latestValues.hemoglobin.value.toFixed(1)}
              unit={latestValues.hemoglobin.unit}
              data={normalizedData.filter(e => e.test === 'hemoglobin').map(e => ({ value: e.value }))}
              trend="stable"
            />
          )}
          {latestValues.pth && (
            <MarkerCard
              title={latestValues.pth.display_name}
              value={latestValues.pth.value.toFixed(1)}
              unit={latestValues.pth.unit}
              data={normalizedData.filter(e => e.test === 'pth').map(e => ({ value: e.value }))}
              trend="stable"
            />
          )}
        </div>

        {/* Clinical Interpretation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 rounded-xl p-6 mt-6 border-l-4 border-blue-500"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Clinical Interpretation</h3>
          <div className="space-y-2 text-gray-700">
            {trend && egfrData.length >= 2 ? (
              <>
                <p>
                  <strong>eGFR Slope:</strong> {trend.slope > 0 ? '+' : ''}{trend.slope} mL/min/1.73m² per year
                </p>
                <p>
                  <strong>Trend Classification:</strong> {trend.label}
                </p>
                <p>
                  <strong>Confidence:</strong> {trend.confidence}
                </p>
                <p className="text-sm mt-4 text-gray-600">
                  This analysis shows trends based on normalized data from your uploaded reports.
                  {trend.label === 'Progressive decline' && ' A declining eGFR trend warrants discussion with your nephrologist or primary care provider.'}
                  {' '}This is NOT a diagnosis.
                </p>
              </>
            ) : (
              <p className="text-gray-600">
                {gates.trendGate?.reasons?.[0] || 'Insufficient data for trend interpretation.'}
              </p>
            )}
          </div>
        </motion.div>

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Normalized Data Table</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Test</th>
                  <th className="px-4 py-2 text-left">Value</th>
                  <th className="px-4 py-2 text-left">Unit</th>
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {[...normalizedData, ...egfrData.filter(e => e.source === 'calculated')]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((entry, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{entry.date}</td>
                      <td className="px-4 py-2">{entry.display_name}</td>
                      <td className="px-4 py-2">{entry.value.toFixed(2)}</td>
                      <td className="px-4 py-2">{entry.unit}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          entry.source === 'calculated' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {entry.source}
                        </span>
                      </td>
                      <td className="px-4 py-2">{(entry.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Debug Panel */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200"
        >
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center"
          >
            {showDebug ? '▼' : '▶'} View clinical logic gates debug
          </button>
          {showDebug && (
            <pre className="mt-4 text-xs text-gray-700 bg-white p-4 rounded border border-gray-300 overflow-auto max-h-96">
              {JSON.stringify({ gates, trend, ckdStage }, null, 2)}
            </pre>
          )}
        </motion.div>

        {/* Actions */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => navigate('/upload')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Upload More Reports
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
