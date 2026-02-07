import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

export default function MarkerCard({ title, value, unit, data, trend }) {
  const trendColor = trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-lg shadow p-4 border border-gray-200"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <span className={`text-lg font-bold ${trendColor}`}>{trendIcon}</span>
      </div>
      <div className="mb-3">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500 ml-1">{unit}</span>
      </div>
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
