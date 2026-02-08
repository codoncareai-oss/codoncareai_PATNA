export default function LLMBadge({ llmCount, totalCount }) {
  if (llmCount === 0) return null

  return (
    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full shadow-lg">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 7H7v6h6V7z"/>
        <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
      </svg>
      <div className="flex flex-col">
        <span className="text-xs font-semibold">AI-Powered Extraction</span>
        <span className="text-xs opacity-90">{llmCount}/{totalCount} values refined by Phi-4</span>
      </div>
    </div>
  )
}
