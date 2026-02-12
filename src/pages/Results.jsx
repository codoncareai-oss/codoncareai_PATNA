import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import EGFRChart from '../components/EGFRChart'
import MarkerCard from '../components/MarkerCard'
import TrendBadge from '../components/TrendBadge'

export default function Results() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [patientInfo, setPatientInfo] = useState({})

  useEffect(() => {
    const data = JSON.parse(sessionStorage.getItem('analysisResult') || 'null')
    const info = JSON.parse(sessionStorage.getItem('patientInfo') || '{}')
    
    if (!data || !info.birthYear) {
      navigate('/upload')
      return
    }

    setResult(data)
    setPatientInfo(info)
  }, [navigate])

  if (!result) return null

  const { kidney_analysis, trend, ckd_detected } = result
  const hasData = kidney_analysis && kidney_analysis.length >= 2

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

        {hasData ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">eGFR Trend</h2>
                {trend && <TrendBadge trend={trend} />}
              </div>
              <EGFRChart data={kidney_analysis.map(d => ({ date: d.date, egfr: d.egfr }))} />
              <p className="text-sm text-gray-500 mt-4">
                * eGFR calculated using CKD-EPI 2021 formula (race-free)
              </p>
            </motion.div>

            {kidney_analysis[kidney_analysis.length - 1].stage ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">CKD Stage</h2>
                <div className="flex items-center space-x-4">
                  <div className={`text-4xl font-bold ${
                    kidney_analysis[kidney_analysis.length - 1].stage === 'G2' ? 'text-yellow-600' :
                    kidney_analysis[kidney_analysis.length - 1].stage === 'G3a' || kidney_analysis[kidney_analysis.length - 1].stage === 'G3b' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {kidney_analysis[kidney_analysis.length - 1].stage}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {kidney_analysis[kidney_analysis.length - 1].stage === 'G2' && 'Mildly decreased kidney function'}
                    {kidney_analysis[kidney_analysis.length - 1].stage === 'G3a' && 'Mild to moderate reduction'}
                    {kidney_analysis[kidney_analysis.length - 1].stage === 'G3b' && 'Moderate to severe reduction'}
                    {kidney_analysis[kidney_analysis.length - 1].stage === 'G4' && 'Severe reduction'}
                    {kidney_analysis[kidney_analysis.length - 1].stage === 'G5' && 'Kidney failure'}
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kidney_analysis.slice(-1).map((entry, idx) => (
                  <MarkerCard
                    key={idx}
                    name="Creatinine"
                    value={entry.creatinine}
                    unit="mg/dL"
                    date={entry.date}
                  />
                ))}
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-yellow-900 mb-2">Partial Data Detected</h2>
            <p className="text-yellow-800">
              Need creatinine values from at least 2 different dates for complete analysis.
            </p>
          </motion.div>
        )}

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
