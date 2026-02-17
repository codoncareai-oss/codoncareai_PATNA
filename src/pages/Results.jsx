import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import EGFRChart from '../components/EGFRChart'
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

  const { egfr_values = [], stages = [], trend } = result

  const hasData = egfr_values.length >= 2

  // Convert backend format to chart format
  const chartData = egfr_values.map(([date, value]) => ({
    date,
    egfr: value
  }))

  const latestStage = stages.length > 0 ? stages[stages.length - 1] : null
  const latestEGFR =
    egfr_values.length > 0
      ? egfr_values[egfr_values.length - 1][1]
      : null

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Kidney Function Analysis
          </h1>
          <p className="text-gray-600">
            Patient: {patientInfo.gender === 'male' ? 'Male' : 'Female'},
            Born {patientInfo.birthYear}
          </p>
        </motion.div>

        {hasData ? (
          <>
            {/* eGFR Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  eGFR Trend
                </h2>
                {trend && <TrendBadge trend={trend} />}
              </div>

              <EGFRChart data={chartData} />

              <p className="text-sm text-gray-500 mt-4">
                * eGFR calculated using CKD-EPI 2021 formula (race-free)
              </p>
            </motion.div>

            {/* Stage Card */}
            {latestStage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  CKD Stage
                </h2>

                <div className="text-4xl font-bold text-red-600 mb-2">
                  {latestStage}
                </div>

                <div className="text-lg font-semibold text-gray-900">
                  {latestStage === 'Stage 1' && 'Normal or high kidney function'}
                  {latestStage === 'Stage 2' && 'Mild decrease in kidney function'}
                  {latestStage === 'Stage 3' && 'Moderate decrease in kidney function'}
                  {latestStage === 'Stage 4' && 'Severe decrease in kidney function'}
                  {latestStage === 'Stage 5' && 'Kidney failure (ESRD)'}
                </div>
              </motion.div>
            )}

            {/* Latest eGFR */}
            {latestEGFR !== null && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Latest eGFR
                </h2>
                <div className="text-3xl font-bold text-blue-600">
                  {latestEGFR} mL/min/1.73m²
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-yellow-900 mb-2">
              Partial Data Detected
            </h2>
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
