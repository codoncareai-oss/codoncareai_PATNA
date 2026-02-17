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

  // ✅ FIXED MAPPING (object based)
  const chartData = egfr_values.map(item => ({
    date: item.date,
    egfr: item.value,
  }))

  const latestStage =
    stages.length > 0 ? stages[stages.length - 1] : null

  const latestEgfr =
    egfr_values.length > 0
      ? egfr_values[egfr_values.length - 1].value
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
      <div className="max-w-6xl mx-auto px-4">
        <Disclaimer />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-4xl font-bold mb-2">
            Kidney Function Analysis
          </h1>
          <p className="text-gray-600 mb-8">
            {patientInfo.gender}, Born {patientInfo.birthYear}
          </p>
        </motion.div>

        {hasData && (
          <>
            {/* Trend */}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">eGFR Trend</h2>
                {trend && <TrendBadge trend={trend} />}
              </div>
              <EGFRChart data={chartData} />
            </div>

            {/* Stage */}
            {latestStage && (
              <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">CKD Stage</h2>
                <div className="text-4xl font-bold text-red-600">
                  {latestStage}
                </div>
              </div>
            )}

            {/* Risk */}
            {risk_level && (
              <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">Risk Level</h2>
                <div className={`text-3xl font-bold ${getRiskColor(risk_level)}`}>
                  {risk_level}
                </div>
              </div>
            )}

            {/* Summary */}
            {clinical_summary && (
              <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">
                  Clinical Summary
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {clinical_summary}
                </p>
              </div>
            )}

            {/* Latest eGFR */}
            {latestEgfr && (
              <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">
                  Latest eGFR
                </h2>
                <div className="text-3xl font-bold text-blue-600">
                  {latestEgfr} mL/min/1.73m²
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded"
          >
            Analyze Another Report
          </button>
        </div>
      </div>
    </div>
  )
}
