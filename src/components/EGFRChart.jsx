import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { motion } from 'framer-motion'

export default function EGFRChart({ data }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-4">eGFR Trend Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" />
          <YAxis stroke="#6b7280" label={{ value: 'eGFR (mL/min/1.73m²)', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
          <ReferenceLine y={90} stroke="#10B981" strokeDasharray="3 3" label="Normal" />
          <ReferenceLine y={60} stroke="#F59E0B" strokeDasharray="3 3" label="Stage 2" />
          <ReferenceLine y={30} stroke="#EF4444" strokeDasharray="3 3" label="Stage 4" />
          <Line 
            type="monotone" 
            dataKey="egfr" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 5 }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
