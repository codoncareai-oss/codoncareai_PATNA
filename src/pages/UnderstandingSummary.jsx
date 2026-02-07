import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import Disclaimer from '../components/Disclaimer'

export default function UnderstandingSummary() {
  const navigate = useNavigate()
  const location = useLocation()
  const { understanding, normalizedData, validation } = location.state || {}
  
  if (!understanding) {
    navigate('/upload')
    return null
  }
  
  const canAnalyze = validation?.can_proceed || false
  
  const handleConfirm = () => {
    navigate('/results', { 
      state: { 
        understanding, 
        normalizedData,
        validation,
        confirmed: true 
      } 
    })
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Understanding Summary</h1>
          
          <p className="text-gray-600 mb-8">
            We've analyzed your uploaded reports. Review what we detected before proceeding to clinical analysis.
          </p>
          
          {/* Detected Tests */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detected Tests</h2>
            {understanding.detected_tests.length > 0 ? (
              <div className="space-y-2">
                {understanding.detected_tests.map((test, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div>
                      <span className="font-medium text-gray-900">{test.display_name}</span>
                      <span className="text-sm text-gray-500 ml-2">({test.raw})</span>
                    </div>
                    <span className="text-sm text-gray-600">{test.count} occurrence(s)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No medical tests detected</p>
            )}
          </div>
          
          {/* Detected Dates */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detected Dates</h2>
            {understanding.detected_dates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {understanding.detected_dates.map((date, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Raw: {date.raw}</div>
                    <div className="text-sm font-medium text-gray-900">Parsed: {date.iso_candidate}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No dates detected</p>
            )}
          </div>
          
          {/* Format & Confidence */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Report Format</div>
              <div className="font-medium text-gray-900 capitalize">{understanding.format.replace('_', ' ')}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600 mb-1">Extraction Confidence</div>
              <div className={`font-medium capitalize ${
                understanding.extraction_confidence === 'high' ? 'text-green-600' :
                understanding.extraction_confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {understanding.extraction_confidence}
              </div>
            </div>
          </div>
          
          {/* Source Hints */}
          {understanding.source_hints.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Source Hints</h2>
              <div className="flex flex-wrap gap-2">
                {understanding.source_hints.map((hint, i) => (
                  <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Analysis Status */}
          <div className={`p-6 rounded-lg border-l-4 mb-8 ${
            canAnalyze ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
          }`}>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {canAnalyze ? 'Ready for Analysis' : 'Cannot Proceed with Analysis'}
            </h2>
            
            {validation && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className={`mr-2 ${validation.reasons.has_kidney_markers ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.reasons.has_kidney_markers ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-700">
                    Kidney markers detected (creatinine or eGFR)
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={`mr-2 ${validation.reasons.has_multiple_dates ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.reasons.has_multiple_dates ? '✓' : '✗'}
                  </span>
                  <span className="text-gray-700">
                    Multiple dates found ({validation.reasons.actual_dates} dates, minimum {validation.reasons.min_dates_required} required)
                  </span>
                </div>
                
                {!canAnalyze && (
                  <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
                    <p className="text-sm text-gray-700 font-medium">Why analysis cannot proceed:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                      {!validation.reasons.has_kidney_markers && (
                        <li>No kidney function markers (creatinine or eGFR) detected in the reports</li>
                      )}
                      {!validation.reasons.has_multiple_dates && (
                        <li>Insufficient dates for trend analysis (need at least 2 time points)</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex space-x-4">
            {canAnalyze ? (
              <button
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Confirm & Analyze Kidney Function
              </button>
            ) : (
              <button
                onClick={() => navigate('/upload')}
                className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
              >
                Upload Different Reports
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
