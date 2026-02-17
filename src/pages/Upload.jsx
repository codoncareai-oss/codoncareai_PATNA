import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'
import { analyzeReport } from '../utils/backendOCR'

export default function Upload() {
  const navigate = useNavigate()
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('Male')
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

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

    try {
      setProcessing(true)

      // ✅ SEND ALL FILES
      const result = await analyzeReport(files)

      sessionStorage.setItem('analysisResult', JSON.stringify(result))
      sessionStorage.setItem(
        'patientInfo',
        JSON.stringify({ birthYear: year, gender, notes })
      )

      navigate('/results')

    } catch (error) {
      alert(`Analysis failed: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Disclaimer />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h1 className="text-3xl font-bold mb-6">Analyze Your Report</h1>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Birth Year */}
            <div>
              <label className="block mb-2">Birth Year *</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block mb-2">Gender *</label>
              <div className="flex space-x-4">
                {['Male', 'Female', 'Other'].map(g => (
                  <label key={g}>
                    <input
                      type="radio"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value)}
                    /> {g}
                  </label>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block mb-2">Upload Reports *</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.csv"
                multiple
                required
              />

              {files.length > 0 && (
                <ul className="mt-2 text-sm">
                  {files.map((f, i) => (
                    <li key={i}>{f.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block mb-2">Additional Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 rounded"
            >
              {processing ? 'Processing...' : 'Analyze Report'}
            </button>

          </form>
        </motion.div>
      </div>
    </div>
  )
}
