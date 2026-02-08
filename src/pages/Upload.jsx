import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import { extractTextFromPDF } from '../utils/pdfTextExtract'
import { extractTextFromImage } from '../utils/ocrExtract'
import { extractClinicalDataPoints } from '../utils/clinicalDataExtractor'
import { refineClinicalData, convertToDataPoints } from '../utils/llmPrimaryRefiner'

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
    
    const allDataPoints = []
    let allExtractedText = ''
    let totalDeterministic = 0
    let totalLLM = 0
    let totalDiscarded = 0
    let llmActuallyRan = false

    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentFile(`${i + 1}/${files.length}: ${file.name}`)
        
        let extractedText = ''
        
        // Extract text based on file type
        if (file.name.endsWith('.csv')) {
          setProcessingStatus('Reading CSV...')
          extractedText = await file.text()
        } else if (file.name.endsWith('.pdf')) {
          setProcessingStatus('Extracting text from PDF...')
          extractedText = await extractTextFromPDF(file)
          
          if (!extractedText || extractedText.length < 50) {
            console.warn(`Could not extract text from ${file.name}`)
            continue
          }
        } else if (file.name.match(/\.(png|jpg|jpeg)$/i)) {
          setProcessingStatus(`Running OCR on image ${i + 1}...`)
          const ocrResult = await extractTextFromImage(file, setOcrProgress)
          
          if (!ocrResult || !ocrResult.text) {
            console.warn(`OCR failed for ${file.name}`)
            continue
          }
          
          extractedText = ocrResult.text
        }
        
        if (extractedText) {
          console.log(`📄 Processing ${file.name}: ${extractedText.length} chars extracted`)
          
          // STEP 1: Deterministic extraction
          const deterministicPoints = extractClinicalDataPoints(extractedText, file.name, 1)
          console.log(`🔍 Deterministic: ${deterministicPoints.length} points`)
          totalDeterministic += deterministicPoints.length
          
          // STEP 2: LLM PRIMARY REFINER (ALWAYS RUNS)
          setProcessingStatus('🤖 AI refining with Phi-4...')
          
          try {
            const llmResult = await refineClinicalData(extractedText)
            
            if (llmResult.success && llmResult.data?.measurements?.length > 0) {
              llmActuallyRan = true
              const llmPoints = convertToDataPoints(llmResult.data, file.name)
              console.log(`🤖 LLM refined: ${llmPoints.length} points`)
              totalLLM += llmPoints.length
              
              // STEP 3: Merge - LLM has priority, deduplicate by (test + date)
              const mergedPoints = [...llmPoints]
              const llmKeys = new Set(llmPoints.map(p => `${p.canonical_test_key}:${p.date_iso}`))
              
              for (const detPoint of deterministicPoints) {
                const key = `${detPoint.canonical_test_key}:${detPoint.date_iso}`
                if (!llmKeys.has(key)) {
                  mergedPoints.push(detPoint)
                }
              }
              
              console.log(`✅ Merged: ${mergedPoints.length} total (LLM priority)`)
              allDataPoints.push(...mergedPoints)
            } else {
              console.warn(`⚠️ LLM returned no data for ${file.name}`)
              allDataPoints.push(...deterministicPoints)
            }
          } catch (error) {
            console.error(`❌ LLM refiner failed for ${file.name}:`, error.message)
            throw error // Hard fail as per requirements
          }
          
          allExtractedText += `\n\n=== ${file.name} ===\n${extractedText}`
        }
      }

      console.log(`📊 FINAL EXTRACTION SUMMARY`)
      console.log(`  Deterministic: ${totalDeterministic} rows`)
      console.log(`  LLM accepted: ${totalLLM} rows`)
      console.log(`  Total: ${allDataPoints.length} data points`)
      console.log(`  LLM ran: ${llmActuallyRan ? 'YES' : 'NO'}`)

      setExtractionStats({
        deterministic: totalDeterministic,
        llm: totalLLM,
        total: allDataPoints.length,
        llmRan: llmActuallyRan
      })

      if (allDataPoints.length === 0) {
        setProcessing(false)
        alert('No clinical data could be extracted from the uploaded files.')
        return
      }

      // Store and navigate
      sessionStorage.setItem('clinicalDataPoints', JSON.stringify(allDataPoints))
      sessionStorage.setItem('patientInfo', JSON.stringify({ birthYear: year, gender, notes }))
      sessionStorage.setItem('extractedText', allExtractedText)
      
      navigate('/understanding', {
        state: {
          dataPoints: allDataPoints
        }
      })
      
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
                <div className="flex items-center gap-2 mb-2">
                  {extractionStats.llmRan && (
                    <span className="text-sm font-semibold text-blue-700">
                      🤖 AI-refined using Phi-4
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Deterministic rows: {extractionStats.deterministic}</p>
                  <p>LLM accepted rows: {extractionStats.llm}</p>
                  <p className="font-semibold">Total extracted: {extractionStats.total}</p>
                </div>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}
