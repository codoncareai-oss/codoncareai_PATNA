import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import { parseCSV } from '../utils/parseCSV'
import { extractTextFromPDF } from '../utils/pdfTextExtract'
import { extractTextFromImage } from '../utils/ocrExtract'
import { understandReport, canAnalyzeKidneyFunction } from '../utils/understandingMode'
import { normalizeLabData, validateForClinicalAnalysis } from '../utils/normalizationMode'

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
    
    let allExtractedText = ''
    const allUnderstandings = []

    try {
      // LAYER 1: UNDERSTANDING MODE - Extract and detect without interpretation
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
          // LAYER 1: Understand the report
          const understanding = understandReport(extractedText)
          understanding.sourceFile = file.name
          allUnderstandings.push(understanding)
          allExtractedText += `\n\n=== ${file.name} ===\n${extractedText}`
        }
      }

      if (allUnderstandings.length === 0) {
        setProcessing(false)
        navigate('/understanding', {
          state: {
            understanding: {
              detected_tests: [],
              detected_dates: [],
              format: 'unknown',
              tables_detected: false,
              extraction_confidence: 'low',
              source_hints: []
            },
            normalizedData: [],
            validation: {
              can_proceed: false,
              reasons: {
                has_kidney_markers: false,
                has_multiple_dates: false,
                min_dates_required: 2,
                actual_dates: 0
              }
            }
          }
        })
        return
      }

      // Merge all understandings
      const mergedUnderstanding = mergeUnderstandings(allUnderstandings)
      
      // Check if kidney analysis is possible
      const analysisCheck = canAnalyzeKidneyFunction(mergedUnderstanding)
      
      // LAYER 2: NORMALIZATION MODE - Convert to canonical format
      setProcessingStatus('Normalizing data...')
      let allNormalizedData = []
      
      for (const understanding of allUnderstandings) {
        const fileText = allExtractedText.split(`=== ${understanding.sourceFile} ===`)[1]?.split('===')[0] || ''
        const normalized = normalizeLabData(fileText, understanding)
        allNormalizedData.push(...normalized)
      }
      
      // Validate for clinical analysis
      const validation = validateForClinicalAnalysis(allNormalizedData)
      
      // Store data and navigate to Understanding Summary
      sessionStorage.setItem('understanding', JSON.stringify(mergedUnderstanding))
      sessionStorage.setItem('normalizedData', JSON.stringify(allNormalizedData))
      sessionStorage.setItem('extractedText', allExtractedText)
      sessionStorage.setItem('patientInfo', JSON.stringify({ birthYear: year, gender, notes }))
      
      navigate('/understanding', {
        state: {
          understanding: mergedUnderstanding,
          normalizedData: allNormalizedData,
          validation: {
            can_proceed: analysisCheck.possible && validation.can_proceed,
            ...analysisCheck.reasons,
            ...validation
          }
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

  function mergeUnderstandings(understandings) {
    const merged = {
      detected_tests: [],
      detected_dates: [],
      format: 'mixed',
      tables_detected: false,
      extraction_confidence: 'medium',
      source_hints: []
    }
    
    const testMap = new Map()
    const dateSet = new Set()
    const sourceSet = new Set()
    
    for (const u of understandings) {
      // Merge tests
      for (const test of u.detected_tests) {
        if (testMap.has(test.normalized_candidate)) {
          const existing = testMap.get(test.normalized_candidate)
          existing.count += test.count
        } else {
          testMap.set(test.normalized_candidate, { ...test })
        }
      }
      
      // Merge dates
      for (const date of u.detected_dates) {
        dateSet.add(JSON.stringify(date))
      }
      
      // Merge sources
      for (const source of u.source_hints) {
        sourceSet.add(source)
      }
      
      if (u.tables_detected) merged.tables_detected = true
    }
    
    merged.detected_tests = Array.from(testMap.values())
    merged.detected_dates = Array.from(dateSet).map(d => JSON.parse(d))
    merged.source_hints = Array.from(sourceSet)
    
    return merged
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
          </form>
        </motion.div>
      </div>
    </div>
  )
}
