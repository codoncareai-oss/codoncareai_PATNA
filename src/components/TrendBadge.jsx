export default function TrendBadge({ status }) {
  const styles = {
    'Improving': 'bg-green-100 text-green-800 border-green-300',
    'Stable': 'bg-green-100 text-green-800 border-green-300',
    'Progressive decline': 'bg-red-100 text-red-800 border-red-300',
    'Insufficient data to classify trend': 'bg-gray-100 text-gray-800 border-gray-300'
  }
  
  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-full border ${styles[status] || styles['Insufficient data to classify trend']}`}>
      <span className="font-semibold">Trend: {status}</span>
    </div>
  )
}
