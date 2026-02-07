import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import { parseCSV } from '../utils/parseCSV'
import { calculateEGFR } from '../utils/calculateEGFR'

export default function Upload() {
  const navigate = useNavigate()
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [dragActive, setDragActive] = useState(false)

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

    let reportData = []

    // If CSV, parse it
    if (file.name.endsWith('.csv')) {
      const text = await file.text()
      const parsed = parseCSV(text)
      
      reportData = parsed.map(row => {
        const egfr = row.egfr ? parseFloat(row.egfr) : 
                     row.creatinine ? calculateEGFR(parseFloat(row.creatinine), parseInt(age), gender) : null
        
        return {
          date: row.date || new Date().toISOString().split('T')[0],
          egfr: egfr,
          creatinine: row.creatinine ? parseFloat(row.creatinine) : null,
          pth: row.pth ? parseFloat(row.pth) : null,
          hemoglobin: row.hemoglobin ? parseFloat(row.hemoglobin) : null
        }
      })
    } else {
      // Generate mock data for PDF/images
      const today = new Date()
      reportData = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(today)
        date.setMonth(date.getMonth() - (5 - i) * 2)
        const creatinine = 1.2 + (i * 0.15)
        return {
          date: date.toISOString().split('T')[0],
          egfr: calculateEGFR(creatinine, parseInt(age), gender),
          creatinine: creatinine,
          pth: 45 + (i * 8),
          hemoglobin: 13.5 - (i * 0.3)
        }
      })
    }

    // Store in sessionStorage and navigate
    sessionStorage.setItem('reportData', JSON.stringify(reportData))
    sessionStorage.setItem('patientInfo', JSON.stringify({ age, gender, notes }))
    navigate('/results')
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
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Analyze Report
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
