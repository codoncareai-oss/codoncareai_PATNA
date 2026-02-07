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
  const [timeline, setTimeline] = useState(null)
  const [patientInfo, setPatientInfo] = useState({})
  const [trendStatus, setTrendStatus] = useState('Insufficient Data')
  const [slope, setSlope] = useState(0)
  const [trendConfidence, setTrendConfidence] = useState('Insufficient')
  const [ckdStage, setCkdStage] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const [tableDebugInfo, setTableDebugInfo] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const [showDataTable, setShowDataTable] = useState(false)

  useEffect(() => {
    const timelineData = sessionStorage.getItem('timeline')
    const info = sessionStorage.getItem('patientInfo')
    const text = sessionStorage.getItem('extractedText')
    const reports = sessionStorage.getItem('extractedReports')
    const tableDebug = sessionStorage.getItem('tableDebugInfo')
    
    if (!timelineData || !info) {
      navigate('/upload')
      return
    }

    const parsedTimeline = JSON.parse(timelineData)
    const parsedInfo = JSON.parse(info)
    const parsedReports = reports ? JSON.parse(reports) : []
    
    setTimeline(parsedTimeline)
    setPatientInfo(parsedInfo)
    setExtractedText(text || '')
    setTableDebugInfo(tableDebug || '')
    
    // Calculate trend metrics
    if (parsedTimeline.egfr.length >= 2) {
      const calculatedSlope = calculateSlope(parsedTimeline.egfr)
      const confidence = calculateTrendConfidence(parsedTimeline.egfr)
      const stage = determineCKDStage(parsedTimeline.egfr)
      
      setSlope(calculatedSlope)
      setTrendConfidence(confidence)
      setTrendStatus(getTrendStatus(calculatedSlope, confidence))
      setCkdStage(stage)
    }
    
    // Generate debug info
    const debug = generateDebugInfo(parsedReports, parsedTimeline)
    setDebugInfo(formatDebugPanel(debug))
  }, [navigate])

  if (!timeline) return null

  const chartData = timelineToChartData(timeline)
  const latestValues = getLatestValues(timeline)
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
          <div className="flex items-center space-x-6 text-gray-600 mb-4">
            <div>
              <span className="font-medium">Birth Year:</span> {patientInfo.birthYear}
            </div>
            <div>
              <span className="font-medium">Gender:</span> {patientInfo.gender}
            </div>
            <div>
              <span className="font-medium">Data Points:</span> {timeline.egfr.length}
            </div>
            <div>
              <span className="font-medium">Trend Confidence:</span>{' '}
              <span className={`font-semibold ${
                trendConfidence === 'High' ? 'text-green-600' : 
                trendConfidence === 'Medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {trendConfidence}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <TrendBadge status={trendStatus} />
          </div>
          
          {/* CKD Stage */}
          {ckdStage && ckdStage.stage && (
            <div className="mt-4 bg-orange-50 border-l-4 border-orange-500 p-3">
              <p className="text-sm text-orange-800">
                <strong>CKD Stage:</strong> {ckdStage.stage} ({ckdStage.reason})
              </p>
              <p className="text-xs text-orange-700 mt-1">
                This is based on trend data only. Consult your healthcare provider for clinical diagnosis.
              </p>
            </div>
          )}
          
          {trendConfidence === 'Low' || trendConfidence === 'Insufficient' && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Insufficient data for reliable interpretation. More data points over time are needed for accurate trend analysis.
              </p>
            </div>
          )}
          
          {timeline.egfr.some(e => e.type === 'calculated') && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-3">
              <p className="text-sm text-blue-800">
                ℹ️ Some eGFR values were calculated from creatinine using CKD-EPI 2021 equation (age-adjusted).
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
              Insufficient data points for trend visualization. At least 2 eGFR values are required.
            </p>
          </div>
        )}

        {/* Supporting Markers */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {latestValues.creatinine && (
            <MarkerCard
              title="Serum Creatinine"
              value={latestValues.creatinine.toFixed(2)}
              unit="mg/dL"
              data={timeline.creatinine.map(e => ({ value: e.value }))}
              trend={calculateMarkerTrend(timeline.creatinine)}
            />
          )}
          {latestValues.hemoglobin && (
            <MarkerCard
              title="Hemoglobin"
              value={latestValues.hemoglobin.toFixed(1)}
              unit="g/dL"
              data={timeline.hemoglobin.map(e => ({ value: e.value }))}
              trend={calculateMarkerTrend(timeline.hemoglobin)}
            />
          )}
          {latestValues.pth && (
            <MarkerCard
              title="PTH"
              value={latestValues.pth.toFixed(1)}
              unit="pg/mL"
              data={timeline.pth.map(e => ({ value: e.value }))}
              trend={calculateMarkerTrend(timeline.pth)}
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
            {timeline.egfr.length >= 2 ? (
              <>
                <p>
                  <strong>eGFR Slope:</strong> {slope > 0 ? '+' : ''}{slope} mL/min/1.73m² per year
                </p>
                <p>
                  <strong>Status:</strong> {trendStatus}
                </p>
                <p>
                  <strong>Confidence:</strong> {trendConfidence}
                </p>
                <p className="text-sm mt-4 text-gray-600">
                  This analysis shows trends based on your uploaded data. 
                  {trendStatus === 'Declining' && ' A declining eGFR trend may warrant discussion with your nephrologist or primary care provider.'}
                  {' '}This is NOT a diagnosis.
                </p>
              </>
            ) : (
              <p className="text-gray-600">
                Insufficient data for reliable trend interpretation. Please upload more historical reports.
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
            Upload More Reports
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
          >
            Back to Home
          </button>
        </div>

        {/* Data Table */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200"
        >
          <button
            onClick={() => setShowDataTable(!showDataTable)}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center"
          >
            {showDataTable ? '▼' : '▶'} View data mapping table
          </button>
          {showDataTable && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">eGFR</th>
                    <th className="px-4 py-2 text-left">Creatinine</th>
                    <th className="px-4 py-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.egfr.map((entry, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{entry.date}</td>
                      <td className="px-4 py-2">{entry.value.toFixed(1)}</td>
                      <td className="px-4 py-2">
                        {timeline.creatinine.find(c => c.date === entry.date)?.value.toFixed(2) || '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          entry.type === 'calculated' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Debug Panel */}
        {debugInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200"
          >
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center"
            >
              {showDebug ? '▼' : '▶'} View extraction debug info
            </button>
            {showDebug && (
              <pre className="mt-4 text-xs text-gray-700 bg-white p-4 rounded border border-gray-300 overflow-auto max-h-96">
                {tableDebugInfo && (
                  <>
                    {tableDebugInfo}
                    {'\n\n'}
                  </>
                )}
                {debugInfo}
                {extractedText && (
                  <>
                    {'\n\n=== RAW EXTRACTED TEXT ===\n'}
                    {extractedText}
                  </>
                )}
              </pre>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
