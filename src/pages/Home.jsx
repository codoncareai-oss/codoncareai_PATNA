import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Disclaimer from '../components/Disclaimer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Disclaimer />
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            Early Awareness Saves Kidneys
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Longitudinal Kidney Health Awareness
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Chronic Kidney Disease (CKD) is often silent until advanced stages. 
            CodonCareAI supports multi-report uploads spanning 10+ years, using format-agnostic parsing 
            to track trends in your kidney health markers over time, empowering early awareness and 
            informed conversations with your healthcare provider.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/upload" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Start Analyzing My Report
            </Link>
            <Link 
              to="/about" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
            >
              Learn More
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Your Trends</h3>
            <p className="text-gray-600">
              Visualize eGFR, creatinine, and other kidney markers over time to understand your health trajectory.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Report Upload</h3>
            <p className="text-gray-600">
              Upload unlimited lab reports (PDF, image, CSV) from any laboratory. Format-agnostic parsing works across 10+ years of data.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy First</h3>
            <p className="text-gray-600">
              All processing happens in your browser. No data is sent to servers or stored in databases.
            </p>
          </motion.div>
        </div>

        {/* Personal Mission */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-blue-50 rounded-xl p-8 border-l-4 border-blue-500"
        >
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Personal Mission</h3>
          <p className="text-gray-700 italic mb-4">
            "Inspired by my mother's late-stage CKD diagnosis in Bihar, India, I built CodonCareAI 
            to help others recognize kidney health trends earlier. Early awareness can change outcomes."
          </p>
          <p className="text-gray-600 text-sm">
            This tool is dedicated to all families navigating chronic kidney disease. 
            May it serve as a bridge between data and awareness, empowering conversations with healthcare providers.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
