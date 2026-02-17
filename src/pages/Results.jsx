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

  const {
    egfr_values = [],
    stages = [],
    trend,
    risk_level,
    clinical_summary,
  } = result

  const hasData = Array.isArray(egfr_values) && egfr_values.length >= 1

  const chartData = egfr_values.map(([date, value]) => ({
    date,
    egfr: value,
  }))

  const latestStage =
    stages.length > 0 ? stages[stages.length - 1] : null

  const latestEgfr =
    egfr_values.length > 0
      ? egfr_values[egfr_values.length - 1][1]
      : null

  const getRiskColor = (risk) => {
    if (!risk) return "text-gray-600"
    if (risk.toLowerCase() === "low") return "text-green-600"
    if (risk.toLowerCase() === "moderate") return "text-yellow-600"
    if (risk.toLowerCase() === "high") return "text-red-600"
    return "text-gray-600"
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Kidney Function Analysis
          </h1>
          <p className="text-gray-600">
            Patient: {patientInfo.gender === "male" ? "Male" : "Female"},
            Born {patientInfo.birthYear}
          </p>
        </motion.div>

        {hasData && (
          <>
            {/* Trend Card */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
            >
              <div className="flex justify-between items-center mb-4">
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

            {/* CKD Stage */}
            {latestStage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold mb-4">CKD Stage</h2>
                <div className="text-4xl font-bold text-red-600">
                  {latestStage}
                </div>
              </motion.div>
            )}

            {/* Risk Level */}
            {risk_level && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold mb-4">
                  Risk Level
                </h2>
                <div className={`text-3xl font-bold ${getRiskColor(risk_level)}`}>
                  {risk_level}
                </div>
              </motion.div>
            )}

            {/* Clinical Summary */}
            {clinical_summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold mb-4">
                  Clinical Summary
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {clinical_summary}
                </p>
              </motion.div>
            )}

            {/* Latest eGFR */}
            {latestEgfr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl shadow-lg p-6 mb-8"
              >
                <h2 className="text-2xl font-bold mb-4">
                  Latest eGFR
                </h2>
                <div className="text-3xl font-bold text-blue-600">
                  {latestEgfr} mL/min/1.73m²
                </div>
              </motion.div>
            )}
          </>
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
