export default function TrendBadge({ trend }) {
  const styles = {
    'increasing': 'bg-green-100 text-green-800 border-green-300',
    'stable': 'bg-blue-100 text-blue-800 border-blue-300',
    'decreasing': 'bg-red-100 text-red-800 border-red-300',
    'insufficient-data': 'bg-gray-100 text-gray-800 border-gray-300'
  }
  
  const labels = {
    'increasing': 'Improving',
    'stable': 'Stable',
    'decreasing': 'Declining',
    'insufficient-data': 'Insufficient Data'
  }
  
  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-full border ${styles[trend] || styles['insufficient-data']}`}>
      <span className="font-semibold">Trend: {labels[trend] || 'Unknown'}</span>
    </div>
  )
}
