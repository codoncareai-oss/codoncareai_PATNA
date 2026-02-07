import { motion } from 'framer-motion'
import Disclaimer from '../components/Disclaimer'

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Disclaimer />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About CodonCareAI</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Our Mission</h2>
              <p>
                CodonCareAI is an educational awareness tool designed to help individuals track trends 
                in their kidney health markers over time. We believe that early awareness of declining 
                kidney function can empower patients to have more informed conversations with their 
                healthcare providers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Trend-Based Monitoring</h2>
              <p>
                Rather than focusing on single test results, CodonCareAI emphasizes longitudinal trends. 
                Research shows that the rate of eGFR decline is a critical indicator of kidney disease 
                progression. By visualizing these trends, patients can better understand their health trajectory.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Inspired by KDIGO 2024</h2>
              <p>
                Our approach is inspired by the KDIGO 2024 Clinical Practice Guideline for the Evaluation 
                and Management of Chronic Kidney Disease, which emphasizes risk-based care and monitoring 
                of kidney function trends. We translate these clinical concepts into an accessible format 
                for patients.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Synthetic Cohort Concept</h2>
              <p>
                For demonstration purposes, CodonCareAI can generate synthetic data patterns based on 
                typical CKD progression models. This allows users to understand how the tool works even 
                without historical lab data. All synthetic data is clearly labeled and never mixed with 
                real patient data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Ethics-First Approach</h2>
              <p className="mb-3">
                We are committed to responsible health technology:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>No medical diagnosis or treatment recommendations</li>
                <li>All data processing happens locally in your browser</li>
                <li>No data is sent to servers or stored in databases</li>
                <li>Clear disclaimers on every page</li>
                <li>Emphasis on consulting healthcare professionals</li>
                <li>Open-source and transparent methodology</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Technical Details</h2>
              <p className="mb-3">
                CodonCareAI uses the CKD-EPI 2021 equation (race-free) to calculate eGFR from serum 
                creatinine when needed. Trend analysis uses linear regression to calculate the rate of 
                eGFR change over time.
              </p>
              <p>
                The application is built with React, Recharts for visualization, and runs entirely 
                client-side for maximum privacy.
              </p>
            </section>

            <section className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Personal Story</h2>
              <p className="italic">
                "This project was born from personal experience. When my mother was diagnosed with 
                late-stage CKD in Bihar, India, I realized how silent this disease can be. Had we been 
                tracking trends in her kidney markers earlier, we might have caught it sooner. 
                CodonCareAI is my attempt to help others avoid that same regret."
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Limitations</h2>
              <p className="mb-3">
                Please understand what this tool cannot do:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-600">
                <li>It cannot diagnose kidney disease</li>
                <li>It cannot replace professional medical advice</li>
                <li>It cannot recommend treatments or medications</li>
                <li>It cannot predict future health outcomes with certainty</li>
                <li>It should not be used for medical decision-making</li>
              </ul>
            </section>

            <section className="text-center pt-6 border-t border-gray-200">
              <p className="text-gray-600">
                Always consult with qualified healthcare professionals for medical advice, 
                diagnosis, and treatment decisions.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
