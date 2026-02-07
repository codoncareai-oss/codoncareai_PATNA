import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">CodonCareAI</span>
          </Link>
          <div className="flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition">Home</Link>
            <Link to="/upload" className="text-gray-700 hover:text-blue-600 transition">Analyze</Link>
            <Link to="/about" className="text-gray-700 hover:text-blue-600 transition">About</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
