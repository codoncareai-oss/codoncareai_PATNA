import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import EGFRChart from '../components/EGFRChart'
import MarkerCard from '../components/MarkerCard'
import TrendBadge from '../components/TrendBadge'
import { calculateEGFRFromCreatinine, calculateTrend, determineCKDStage } from '../utils/clinicalAnalyzer'
import { getDataPointsForTest, countOccurrences } from '../utils/clinicalDataExtractor'

export default function Results() {
  const navigate = useNavigate()
  const [dataPoints, setDataPoints] = useState([])
  const [patientInfo, setPatientInfo] = useState({})
  const [egfrSeries, setEgfrSeries] = useState([])
  const [trend, setTrend] = useState(null)
  const [ckdStage, setCkdStage] = useState(null)
  const [canAnalyze, setCanAnalyze] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    const points = JSON.parse(sessionStorage.getItem('clinicalDataPoints') || '[]')
    const info = JSON.parse(sessionStorage.getItem('patientInfo') || '{}')
    
    if (points.length === 0 || !info.birthYear) {
      navigate('/upload')
      return
    }

    setDataPoints(points)
    setPatientInfo(info)

    // Gate: Need creatinine for ≥2 dates
    const creatininePoints = getDataPointsForTest(points, 'creatinine')
    const uniqueDates = new Set(creatininePoints.map(p => p.date_iso))
    
    if (uniqueDates.size < 2) {
      setCanAnalyze(false)
      setBlockReason(`Only ${uniqueDates.size} creatinine date(s) found. Need ≥2 for analysis.`)
      return
    }

    setCanAnalyze(true)

    // Calculate eGFR for each creatinine
    const egfrData = []
    const currentYear = new Date().getFullYear()
    
    for (const point of creatininePoints) {
      const testYear = parseInt(point.date_iso.split('-')[0])
      const age = testYear - info.birthYear
      
      if (age < 1 || age > 120) continue
      
      const egfr = calculateEGFRFromCreatinine(point.value, age, info.gender)
      egfrData.push({
        date: point.date_iso,
        value: egfr
      })
    }

    // Add reported eGFR if exists
    const reportedEgfr = getDataPointsForTest(points, 'egfr')
    for (const point of reportedEgfr) {
      egfrData.push({
        date: point.date_iso,
        value: point.value
      })
    }

    const sorted = egfrData.sort((a, b) => a.date.localeCompare(b.date))
    setEgfrSeries(sorted)

    // Calculate trend
    if (sorted.length >= 2) {
      const trendResult = calculateTrend(sorted)
      setTrend(trendResult)
    }

    // Determine CKD stage
    if (sorted.length > 0) {
      const latest = sorted[sorted.length - 1].value
      const stage = determineCKDStage(latest)
      setCkdStage(stage)
    }

  }, [navigate])

  if (dataPoints.length === 0) return null

  // Latest values for each test
  const latestValues = {}
  for (const point of dataPoints) {
    const key = point.canonical_test_key
    if (!latestValues[key] || point.date_iso > latestValues[key].date_iso) {
      latestValues[key] = point
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Kidney Function Analysis</h1>
          <p className="text-gray-600">
            Patient: {patientInfo.gender === 'male' ? 'Male' : 'Female'}, Born {patientInfo.birthYear}
          </p>
        </motion.div>

        {!canAnalyze ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-yellow-900 mb-2">Cannot Generate Analysis</h2>
            <p className="text-yellow-800">{blockReason}</p>
          </motion.div>
        ) : (
          <>
            {/* eGFR Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">eGFR Trend</h2>
                {trend && <TrendBadge trend={trend.trend} />}
              </div>
              <EGFRChart data={egfrSeries.map(e => ({ date: e.date, egfr: e.value }))} />
              <p className="text-sm text-gray-500 mt-4">
                * eGFR calculated using CKD-EPI 2021 formula (race-free)
              </p>
            </motion.div>

            {/* CKD Stage */}
            {ckdStage ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">CKD Stage</h2>
                <div className="flex items-center space-x-4">
                  <div className={`text-4xl font-bold ${
                    ckdStage === 'G2' ? 'text-yellow-600' :
                    ckdStage === 'G3a' || ckdStage === 'G3b' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {ckdStage}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      {ckdStage === 'G2' && 'Mildly decreased kidney function'}
                      {ckdStage === 'G3a' && 'Mild to moderate reduction'}
                      {ckdStage === 'G3b' && 'Moderate to severe reduction'}
                      {ckdStage === 'G4' && 'Severe reduction'}
                      {ckdStage === 'G5' && 'Kidney failure'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-green-50 border-l-4 border-green-500 p-6 mb-8"
              >
                <h2 className="text-xl font-bold text-green-900 mb-2">No CKD Detected</h2>
                <p className="text-green-800">
                  Latest eGFR is ≥90 mL/min/1.73m², indicating normal kidney function.
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Latest Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(latestValues).map(([key, point]) => (
              <MarkerCard
                key={key}
                name={point.test_name}
                value={point.value}
                unit={point.unit}
                date={point.date_iso}
              />
            ))}
          </div>
        </motion.div>

        {/* Detected Tests Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Detected Tests</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['creatinine', 'urea', 'hemoglobin', 'egfr', 'pth', 'phosphorus', 'bicarbonate', 'calcium'].map(test => {
              const count = countOccurrences(dataPoints, test)
              if (count === 0) return null
              return (
                <div key={test} className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600 capitalize">{test}</div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">occurrence(s)</div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Debug Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            {showDebug ? '▼' : '▶'} Debug Information
          </button>
          
          {showDebug && (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Analysis Status</h3>
                <pre className="bg-gray-50 p-3 rounded text-xs">
{`Can Analyze: ${canAnalyze}
Block Reason: ${blockReason || 'None'}
eGFR Points: ${egfrSeries.length}
Trend: ${trend ? trend.trend : 'N/A'}
CKD Stage: ${ckdStage || 'None'}`}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data Points ({dataPoints.length})</h3>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(dataPoints, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Analyze Another Report
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
