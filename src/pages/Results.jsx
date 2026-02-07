import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import EGFRChart from '../components/EGFRChart'
import MarkerCard from '../components/MarkerCard'
import TrendBadge from '../components/TrendBadge'
import { calculateSlope, getTrendStatus } from '../utils/slope'

export default function Results() {
  const navigate = useNavigate()
  const [reportData, setReportData] = useState([])
  const [patientInfo, setPatientInfo] = useState({})
  const [trendStatus, setTrendStatus] = useState('Stable')
  const [slope, setSlope] = useState(0)

  useEffect(() => {
    const data = sessionStorage.getItem('reportData')
    const info = sessionStorage.getItem('patientInfo')
    
    if (!data || !info) {
      navigate('/upload')
      return
    }

    const parsedData = JSON.parse(data)
    const parsedInfo = JSON.parse(info)
    
    setReportData(parsedData)
    setPatientInfo(parsedInfo)
    
    const calculatedSlope = calculateSlope(parsedData)
    setSlope(calculatedSlope)
    setTrendStatus(getTrendStatus(calculatedSlope))
  }, [navigate])

  if (reportData.length === 0) return null

  const latestData = reportData[reportData.length - 1]
  const firstData = reportData[0]

  const creatinineData = reportData.map(d => ({ value: d.creatinine })).filter(d => d.value)
  const pthData = reportData.map(d => ({ value: d.pth })).filter(d => d.value)
  const hemoglobinData = reportData.map(d => ({ value: d.hemoglobin })).filter(d => d.value)

  const creatinineTrend = latestData.creatinine > firstData.creatinine ? 'up' : 'down'
  const pthTrend = latestData.pth > firstData.pth ? 'up' : 'down'
  const hemoglobinTrend = latestData.hemoglobin < firstData.hemoglobin ? 'down' : 'up'

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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Health Analysis Dashboard</h1>
          <div className="flex items-center space-x-6 text-gray-600">
            <div>
              <span className="font-medium">Age:</span> {patientInfo.age}
            </div>
            <div>
              <span className="font-medium">Gender:</span> {patientInfo.gender}
            </div>
          </div>
          <div className="mt-4">
            <TrendBadge status={trendStatus} />
          </div>
        </motion.div>

        {/* Main Chart */}
        <EGFRChart data={reportData} />

        {/* Supporting Markers */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {latestData.creatinine && (
            <MarkerCard
              title="Serum Creatinine"
              value={latestData.creatinine.toFixed(2)}
              unit="mg/dL"
              data={creatinineData}
              trend={creatinineTrend}
            />
          )}
          {latestData.pth && (
            <MarkerCard
              title="PTH"
              value={latestData.pth.toFixed(1)}
              unit="pg/mL"
              data={pthData}
              trend={pthTrend}
            />
          )}
          {latestData.hemoglobin && (
            <MarkerCard
              title="Hemoglobin"
              value={latestData.hemoglobin.toFixed(1)}
              unit="g/dL"
              data={hemoglobinData}
              trend={hemoglobinTrend}
            />
          )}
        </div>

        {/* Interpretation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 rounded-xl p-6 mt-6 border-l-4 border-blue-500"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Trend Interpretation</h3>
          <div className="space-y-2 text-gray-700">
            <p>
              <strong>eGFR Slope:</strong> {slope > 0 ? '+' : ''}{slope} mL/min/1.73m² per year
            </p>
            <p>
              <strong>Status:</strong> {trendStatus}
            </p>
            <p className="text-sm mt-4 text-gray-600">
              This analysis shows trends based on your uploaded data. A declining eGFR trend may warrant 
              discussion with your nephrologist or primary care provider. This is NOT a diagnosis.
            </p>
            {trendStatus === 'Progressive' && (
              <p className="text-sm text-red-700 font-medium mt-2">
                ⚠️ Progressive decline detected. Please consult your healthcare provider for clinical evaluation.
              </p>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={() => navigate('/upload')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Upload New Report
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
