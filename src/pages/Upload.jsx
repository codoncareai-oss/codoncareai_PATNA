import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import { extractRawRowsBackend } from '../utils/backendOCR'
import { extractRawRows } from '../utils/rawRowExtractor'
import { normalizeLLM } from '../utils/llmNormalizer'

export default function Upload() {
  const navigate = useNavigate()
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('Male')
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [currentFile, setCurrentFile] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [extractionStats, setExtractionStats] = useState(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!birthYear || files.length === 0) {
      alert('Please provide birth year and upload at least one file')
      return
    }

    const currentYear = new Date().getFullYear()
    const year = parseInt(birthYear)
    if (year < 1900 || year > currentYear) {
      alert('Please enter a valid birth year')
      return
    }

    setProcessing(true)
    setProcessingStatus('Processing files...')
    setExtractionStats(null)
    
    const allNormalizedRows = []
    let totalRawRows = 0
    let totalNormalizedRows = 0

    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentFile(`${i + 1}/${files.length}: ${file.name}`)
        
        let rawRows = []
        
        console.log(`\n========================================`)
        console.log(`📄 Processing: ${file.name}`)
        console.log(`========================================`)
        
        // PHASE 1: RAW ROW EXTRACTION (NO LLM)
        if (file.name.endsWith('.csv')) {
          // CSV: Use simple text extraction
          setProcessingStatus('Phase 1: Extracting CSV rows...')
          const csvText = await file.text()
          rawRows = extractRawRows(csvText, 'csv')
        } else if (file.name.endsWith('.pdf') || file.name.match(/\.(png|jpg|jpeg)$/i)) {
          // PDF/Image: Use backend PaddleOCR
          setProcessingStatus('Phase 1: Running PaddleOCR...')
          try {
            rawRows = await extractRawRowsBackend(file)
          } catch (error) {
            console.error(`❌ Backend OCR failed for ${file.name}:`, error.message)
            alert(`Backend OCR failed: ${error.message}. Make sure backend is running.`)
            throw error
          }
        } else {
          console.warn(`Unsupported file type: ${file.name}`)
          continue
        }
        
        if (rawRows.length === 0) {
          console.warn(`No rows extracted from ${file.name}`)
          continue
        }
        
        totalRawRows += rawRows.length
        console.log(`✅ Phase 1 complete: ${rawRows.length} raw rows`)
        
        // PHASE 2: LLM NORMALIZATION (STRICT MODE)
        setProcessingStatus('Phase 2: LLM normalizing rows...')
        const normalizeResult = await normalizeLLM(rawRows)
          
          if (!normalizeResult.success) {
            console.error(`❌ Phase 2 failed for ${file.name}:`, normalizeResult.error)
            throw new Error(normalizeResult.error)
          }
          
          totalNormalizedRows += normalizeResult.normalizedRows.length
          console.log(`✅ Phase 2 complete: ${normalizeResult.normalizedRows.length} normalized rows`)
          
          // CRITICAL VALIDATION
          if (rawRows.length !== normalizeResult.normalizedRows.length) {
            const error = `DATA LOSS DETECTED: ${rawRows.length} raw rows → ${normalizeResult.normalizedRows.length} normalized rows`
            console.error(`❌ ${error}`)
            throw new Error(error)
          }
          
          console.log(`✅ VALIDATION PASSED: No data loss`)
          
          allNormalizedRows.push(...normalizeResult.normalizedRows)
        }
      }

      console.log(`\n========================================`)
      console.log(`📊 FINAL SUMMARY`)
      console.log(`========================================`)
      console.log(`Total raw rows extracted: ${totalRawRows}`)
      console.log(`Total normalized rows: ${totalNormalizedRows}`)
      console.log(`✅ Data integrity: ${totalRawRows === totalNormalizedRows ? 'VERIFIED' : 'FAILED'}`)

      setExtractionStats({
        rawRows: totalRawRows,
        normalizedRows: totalNormalizedRows,
        dataIntegrity: totalRawRows === totalNormalizedRows
      })

      if (allNormalizedRows.length === 0) {
        setProcessing(false)
        alert('No clinical data could be extracted from the uploaded files.')
        return
      }

      // Store and navigate
      sessionStorage.setItem('normalizedRows', JSON.stringify(allNormalizedRows))
      sessionStorage.setItem('patientInfo', JSON.stringify({ birthYear: year, gender, notes }))
      
      // For now, navigate to results (Phase 3+ will handle conversion)
      navigate('/results')
      
    } catch (error) {
      console.error('Processing error:', error)
      setProcessing(false)
      alert('An error occurred while processing the files. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Analyze Your Report</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Birth Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birth Year * (for age-adjusted eGFR calculation)
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1965"
                min="1900"
                max={new Date().getFullYear()}
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <div className="flex space-x-4">
                {['Male', 'Female', 'Other'].map(g => (
                  <label key={g} className="flex items-center">
                    <input
                      type="radio"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Reports * (Multiple files supported)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  multiple
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG, or CSV (up to 200 files)</p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium">Selected files:</p>
                  <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                    {files.map((f, i) => (
                      <li key={i}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any symptoms, medications, or context you'd like to track..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {processing ? processingStatus : 'Analyze Report'}
            </button>
            
            {processing && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 text-center mb-2">{currentFile}</p>
                {ocrProgress > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-1">{ocrProgress}%</p>
                  </>
                )}
              </div>
            )}

            {extractionStats && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold">✅ Two-Phase Extraction Complete</p>
                  <p>Phase 1 (Raw): {extractionStats.rawRows} rows</p>
                  <p>Phase 2 (Normalized): {extractionStats.normalizedRows} rows</p>
                  <p className={extractionStats.dataIntegrity ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                    Data Integrity: {extractionStats.dataIntegrity ? '✅ VERIFIED (No data loss)' : '❌ FAILED'}
                  </p>
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}
