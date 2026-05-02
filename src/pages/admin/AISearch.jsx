import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AISearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState("")
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setResults([])
    setAnswer("")

    const { data: assets } = await supabase
      .from("assets")
      .select("id, name, category, serial_number, assigned_user, status, location, brand_model")

    const q = query.toLowerCase()
    const words = q.split(" ").filter(w => w.length > 2)

    let matched = assets.filter(a => {
      const text = `${a.name} ${a.category} ${a.serial_number} ${a.assigned_user} ${a.status} ${a.location} ${a.brand_model}`.toLowerCase()
      return words.some(w => text.includes(w))
    })

    // Smart filters
    if (q.includes("available")) matched = matched.filter(a => a.status === "available")
    if (q.includes("assigned")) matched = matched.filter(a => a.status === "assigned")
    if (q.includes("maintenance")) matched = matched.filter(a => a.status === "maintenance")
    if (q.includes("laptop")) matched = matched.filter(a => a.category?.toLowerCase() === "laptop")
    if (q.includes("desktop")) matched = matched.filter(a => a.category?.toLowerCase() === "desktop")
    if (q.includes("no serial") || q.includes("without serial") || q.includes("missing serial")) {
      matched = assets.filter(a => !a.serial_number)
    }
    if (q.includes("unassigned") || q.includes("no one") || q.includes("nobody")) {
      matched = assets.filter(a => !a.assigned_user)
    }

    // Generate smart answer
    let smartAnswer = ""
    if (matched.length === 0) {
      smartAnswer = `I couldn't find any assets matching "${query}". Try different keywords!`
    } else if (q.includes("how many") || q.includes("count")) {
      smartAnswer = `There are ${matched.length} assets matching your query.`
    } else if (q.includes("dell")) {
      smartAnswer = `Found ${matched.length} Dell assets in the system.`
    } else if (q.includes("lenovo")) {
      smartAnswer = `Found ${matched.length} Lenovo assets in the system.`
    } else if (q.includes("available")) {
      smartAnswer = `There are ${matched.length} available assets ready to be assigned.`
    } else if (q.includes("assigned")) {
      smartAnswer = `Found ${matched.length} assets currently assigned to users.`
    } else if (q.includes("no serial") || q.includes("missing serial")) {
      smartAnswer = `Found ${matched.length} assets with no serial number recorded.`
    } else {
      smartAnswer = `Found ${matched.length} assets matching "${query}".`
    }

    setAnswer(smartAnswer)
    setResults(matched)
    setLoading(false)
  }

  const statusColor = {
    available: "bg-green-500/20 text-green-400",
    assigned: "bg-blue-500/20 text-blue-400",
    maintenance: "bg-yellow-500/20 text-yellow-400",
    retired: "bg-red-500/20 text-red-400",
  }

  const suggestions = [
    "Show me all Dell laptops",
    "Which assets are assigned?",
    "Show Lenovo ThinkPads",
    "Available laptops",
    "Assets with no serial number",
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">🤖 AI Search</h1>
        <p className="text-gray-400 mt-1 text-sm">Ask anything about your assets in plain English</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Show me all Dell laptops"
            className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            {loading ? "..." : "Ask"}
          </button>
        </div>
      </form>

      {!searched && (
        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 px-3 py-2 rounded-lg text-sm transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {answer && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-blue-300 text-sm font-medium mb-1">🤖 ITAMS AI says:</p>
          <p className="text-white">{answer}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <p className="text-white font-semibold">{results.length} matching assets</p>
          </div>
          <div className="divide-y divide-gray-800">
            {results.map((asset) => (
              <div key={asset.id} className="px-6 py-4 hover:bg-gray-800/50 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{asset.name}</p>
                    <p className="text-gray-500 text-sm">{asset.category} — {asset.serial_number || "No serial"}</p>
                    <p className="text-gray-400 text-sm">{asset.assigned_user || "Unassigned"} · {asset.location || "No location"}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {asset.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
          <p className="text-gray-500">No matching assets found</p>
        </div>
      )}
    </div>
  )
}