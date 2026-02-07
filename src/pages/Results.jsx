import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import EGFRChart from '../components/EGFRChart'
import MarkerCard from '../components/MarkerCard'
import TrendBadge from '../components/TrendBadge'
import { calculateEGFRFromCreatinine, determineCKDStage, calculateTrend } from '../utils/clinicalAnalyzer'

export default function Results() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dataPoints, setDataPoints] = useState([])
  const [capabilities, setCapabilities] = useState({})
  const [patientInfo, setPatientInfo] = useState({})
  const [egfrData, setEgfrData] = useState([])
  const [ckdStage, setCkdStage] = useState(null)
  const [trend, setTrend] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    if (!location.state?.confirmed) {
      navigate('/upload')
      return
    }

    const points = JSON.parse(sessionStorage.getItem('clinicalDataPoints') || '[]')
    const caps = JSON.parse(sessionStorage.getItem('capabilities') || '{}')
    const info = JSON.parse(sessionStorage.getItem('patientInfo') || '{}')
    
    if (points.length === 0 || !info.birthYear) {
      navigate('/upload')
      return
    }

    setDataPoints(points)
    setCapabilities(caps)
    setPatientInfo(info)
    
    // Calculate eGFR if possible
    if (caps.can_calculate_egfr) {
      const creatininePoints = points.filter(p => p.canonical_test_key === 'creatinine')
      const calculatedEgfr = calculateEGFRFromCreatinine(creatininePoints, info.birthYear, info.gender)
      
      // Combine with reported eGFR
      const reportedEgfr = points.filter(p => p.canonical_test_key === 'egfr')
      const allEgfr = [...reportedEgfr, ...calculatedEgfr].sort((a, b) => a.date_iso.localeCompare(b.date_iso))
      setEgfrData(allEgfr)
      
      // Determine CKD stage
      if (caps.can_stage_ckd && allEgfr.length > 0) {
        const latest = allEgfr[allEgfr.length - 1]
        const stage = determineCKDStage(latest.value)
        setCkdStage(stage)
      }
      
      // Calculate trend
      if (caps.can_show_trend && allEgfr.length >= 2) {
        const trendResult = calculateTrend(allEgfr)
        setTrend(trendResult)
      }
    }
  }, [navigate, location])

  if (dataPoints.length === 0) return null

  const chartData = egfrData.map(e => ({
    date: e.date_iso,
    egfr: e.value,
    calculated: e.source === 'calculated'
  }))

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

        {/* eGFR Chart */}
        {capabilities.can_show_graph && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">eGFR Trend</h2>
              {trend && <TrendBadge trend={trend.label} confidence={trend.confidence} />}
            </div>
            <EGFRChart data={chartData} />
            {egfrData.some(e => e.source === 'calculated') && (
              <p className="text-sm text-gray-500 mt-4">
                * Calculated values derived from creatinine using CKD-EPI 2021 formula
              </p>
            )}
          </motion.div>
        )}

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
                ckdStage.stage === 'G2' ? 'text-yellow-600' :
                ckdStage.stage === 'G3a' || ckdStage.stage === 'G3b' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {ckdStage.stage}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{ckdStage.description}</div>
                <div className="text-sm text-gray-600">eGFR: {ckdStage.egfr_range}</div>
              </div>
            </div>
          </motion.div>
        ) : capabilities.can_stage_ckd === false && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-50 border-l-4 border-green-500 p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-green-900 mb-2">No CKD Detected</h2>
            <p className="text-green-800">
              Latest eGFR is ≥90 mL/min/1.73m², indicating normal or high kidney function.
            </p>
          </motion.div>
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

        {/* Debug Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
                <h3 className="font-semibold text-gray-900 mb-2">Capabilities</h3>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(capabilities, null, 2)}
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
