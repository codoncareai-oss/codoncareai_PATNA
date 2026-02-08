import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import Disclaimer from '../components/Disclaimer'
import { countOccurrences } from '../utils/clinicalDataExtractor'

export default function UnderstandingSummary() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dataPoints } = location.state || {}
  
  if (!dataPoints || dataPoints.length === 0) {
    navigate('/upload')
    return null
  }

  // Count unique dates
  const uniqueDates = new Set(dataPoints.map(p => p.date_iso))
  
  // Count creatinine occurrences
  const creatinineCount = countOccurrences(dataPoints, 'creatinine')
  
  const handleConfirm = () => {
    navigate('/results')
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
          
          <div className="mb-6 flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z"/>
            </svg>
            <span>Data extracted by AI • Review before proceeding</span>
          </div>
          
          <p className="text-gray-600 mb-8">
            Our AI has read your lab report and extracted the following clinical data.
          </p>
          
          {/* Summary Stats */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Total Data Points</div>
              <div className="text-2xl font-bold text-gray-900">{dataPoints.length}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Creatinine Values</div>
              <div className="text-2xl font-bold text-gray-900">{creatinineCount}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Unique Dates</div>
              <div className="text-2xl font-bold text-gray-900">{uniqueDates.size}</div>
            </div>
          </div>
          
          {/* Detected Tests */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detected Tests</h2>
            <div className="space-y-2">
              {['creatinine', 'egfr', 'urea', 'hemoglobin', 'pth', 'phosphorus', 'bicarbonate', 'calcium'].map(test => {
                const count = countOccurrences(dataPoints, test)
                if (count === 0) return null
                return (
                  <div key={test} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="font-medium text-gray-900 capitalize">{test}</span>
                    <span className="text-sm text-gray-600">{count} occurrence(s)</span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Analysis Requirements */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Capability</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className={`mr-2 ${creatinineCount >= 2 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {creatinineCount >= 2 ? '✓' : '⚠'}
                </span>
                <span className="text-gray-700">
                  {creatinineCount >= 2 
                    ? `Full trend analysis available (${creatinineCount} creatinine values found)`
                    : `Partial data only (${creatinineCount} creatinine value${creatinineCount === 1 ? '' : 's'} found, need ≥2 for trends)`
                  }
                </span>
              </div>
            </div>
          </div>
          
          {creatinineCount < 2 && (
            <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">Partial Data Available</h2>
              <p className="text-sm text-yellow-800">
                We found {creatinineCount} creatinine value{creatinineCount === 1 ? '' : 's'}. 
                For complete trend analysis, we need values from at least 2 different dates.
                You can still view the available data.
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {creatinineCount >= 2 ? 'Proceed to Full Analysis' : 'View Available Data'}
            </button>
                Upload Different Files
              </button>
            )}
            <button
              onClick={() => navigate('/upload')}
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Upload Different Report
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
