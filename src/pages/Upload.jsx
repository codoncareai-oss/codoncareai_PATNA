import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import { parseCSV } from '../utils/parseCSV'
import { calculateEGFR } from '../utils/calculateEGFR'
import { extractTextFromPDF } from '../utils/pdfTextExtract'
import { extractTextFromImage } from '../utils/ocrExtract'
import { parseMedicalData, calculateConfidence } from '../utils/medicalParser'
import { mapToTimeline } from '../utils/dateValueMapper'

export default function Upload() {
  const navigate = useNavigate()
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!age || !file) {
      alert('Please provide age and upload a file')
      return
    }

    setProcessing(true)
    setProcessingStatus('Processing file...')
    
    let reportData = []
    let extractedText = ''
    let confidence = 'High'

    try {
      // CSV - direct parsing
      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const parsed = parseCSV(text)
        
        reportData = parsed.map(row => {
          const egfr = row.egfr ? parseFloat(row.egfr) : 
                       row.creatinine ? calculateEGFR(parseFloat(row.creatinine), parseInt(age), gender) : null
          
          return {
            date: row.date || null,
            egfr: egfr,
            creatinine: row.creatinine ? parseFloat(row.creatinine) : null,
            pth: row.pth ? parseFloat(row.pth) : null,
            hemoglobin: row.hemoglobin ? parseFloat(row.hemoglobin) : null,
            phosphorus: row.phosphorus ? parseFloat(row.phosphorus) : null,
            bicarbonate: row.bicarbonate ? parseFloat(row.bicarbonate) : null
          }
        }).filter(d => d.date && d.egfr)
      } 
      // PDF - extract text
      else if (file.name.endsWith('.pdf')) {
        setProcessingStatus('Extracting text from PDF...')
        extractedText = await extractTextFromPDF(file)
        
        if (!extractedText || extractedText.length < 50) {
          setProcessing(false)
          alert('Could not extract text from PDF. It may be scanned. Try uploading as an image (PNG/JPG) for OCR.')
          return
        }
        
        const parsed = parseMedicalData(extractedText)
        confidence = calculateConfidence(parsed)
        
        if (parsed.date && (parsed.egfr || parsed.creatinine)) {
          reportData = mapToTimeline([parsed], parseInt(age), gender)
        }
      }
      // Image - OCR
      else if (file.name.match(/\.(png|jpg|jpeg)$/i)) {
        setProcessingStatus('Running OCR on image...')
        const ocrResult = await extractTextFromImage(file, setOcrProgress)
        
        if (!ocrResult || !ocrResult.text) {
          setProcessing(false)
          alert('OCR failed. Please try a clearer image or PDF.')
          return
        }
        
        extractedText = ocrResult.text
        
        if (ocrResult.confidence < 60) {
          confidence = 'Low'
        }
        
        const parsed = parseMedicalData(extractedText)
        const dataConfidence = calculateConfidence(parsed)
        if (dataConfidence === 'Low') confidence = 'Low'
        
        if (parsed.date && (parsed.egfr || parsed.creatinine)) {
          reportData = mapToTimeline([parsed], parseInt(age), gender)
        }
      }

      // Validation
      if (reportData.length === 0) {
        setProcessing(false)
        alert('We could not reliably extract structured data from this report. Please check the file or try CSV format.')
        return
      }

      // Store and navigate
      sessionStorage.setItem('reportData', JSON.stringify(reportData))
      sessionStorage.setItem('patientInfo', JSON.stringify({ age, gender, notes }))
      sessionStorage.setItem('extractedText', extractedText)
      sessionStorage.setItem('confidence', confidence)
      
      navigate('/results')
    } catch (error) {
      console.error('Processing error:', error)
      setProcessing(false)
      alert('An error occurred while processing the file. Please try again.')
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
            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age *
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your age"
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
                Upload Report *
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
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG, or CSV</p>
                </label>
              </div>
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
            
            {processing && ocrProgress > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center mt-1">{ocrProgress}%</p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}
