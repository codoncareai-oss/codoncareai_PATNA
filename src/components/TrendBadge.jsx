export default function TrendBadge({ status }) {
  const styles = {
    'Stable': 'bg-green-100 text-green-800 border-green-300',
    'Moderate Decline': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Progressive': 'bg-red-100 text-red-800 border-red-300'
  }
  
  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-full border ${styles[status] || styles['Stable']}`}>
      <span className="font-semibold">eGFR Trend Status: {status}</span>
    </div>
  )
}
