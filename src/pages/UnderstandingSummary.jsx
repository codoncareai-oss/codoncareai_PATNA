import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import Disclaimer from '../components/Disclaimer'
import { countOccurrences } from '../utils/clinicalDataExtractor'

export default function UnderstandingSummary() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dataPoints, capabilities } = location.state || {}
  
  if (!dataPoints) {
    navigate('/upload')
    return null
  }
  
  const handleConfirm = () => {
    navigate('/results', { state: { confirmed: true } })
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-6">What We Detected</h1>
          
          <p className="text-gray-600 mb-8">
            Review the extracted clinical data before proceeding to analysis.
          </p>
          
          {/* Detected Tests */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detected Tests</h2>
            <div className="space-y-2">
              {['creatinine', 'egfr', 'urea', 'hemoglobin', 'pth', 'phosphorus', 'bicarbonate'].map(test => {
                const count = countOccurrences(dataPoints, test)
                if (count === 0) return null
                return (
                  <div key={test} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="font-medium text-gray-900 capitalize">{test}</span>
                    <span className="text-sm text-gray-600">{count} time point(s)</span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Capabilities */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What We Can Calculate</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className={`mr-2 ${capabilities.can_calculate_egfr ? 'text-green-600' : 'text-gray-400'}`}>
                  {capabilities.can_calculate_egfr ? '✓' : '○'}
                </span>
                <span className="text-gray-700">Calculate eGFR from creatinine</span>
              </div>
              <div className="flex items-center">
                <span className={`mr-2 ${capabilities.can_show_graph ? 'text-green-600' : 'text-gray-400'}`}>
                  {capabilities.can_show_graph ? '✓' : '○'}
                </span>
                <span className="text-gray-700">Show eGFR trend graph</span>
              </div>
              <div className="flex items-center">
                <span className={`mr-2 ${capabilities.can_show_trend ? 'text-green-600' : 'text-gray-400'}`}>
                  {capabilities.can_show_trend ? '✓' : '○'}
                </span>
                <span className="text-gray-700">Classify trend (Improving/Stable/Declining)</span>
              </div>
              <div className="flex items-center">
                <span className={`mr-2 ${capabilities.can_stage_ckd ? 'text-green-600' : 'text-gray-400'}`}>
                  {capabilities.can_stage_ckd ? '✓' : '○'}
                </span>
                <span className="text-gray-700">Determine CKD stage (if applicable)</span>
              </div>
            </div>
          </div>
          
          {/* What We Could Not Calculate */}
          {capabilities.reasons.length > 0 && (
            <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">What We Could Not Calculate (and why)</h2>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {capabilities.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Summary Stats */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Total Data Points</div>
              <div className="text-2xl font-bold text-gray-900">{dataPoints.length}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Creatinine Values</div>
              <div className="text-2xl font-bold text-gray-900">{capabilities.detected.creatinine_count}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Unique Dates</div>
              <div className="text-2xl font-bold text-gray-900">{capabilities.detected.unique_dates}</div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Proceed to Analysis
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Upload Different Files
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
