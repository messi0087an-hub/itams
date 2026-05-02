import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { motion } from "framer-motion"

export default function AssetHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("asset_history")
      .select("*, assets(name, serial_number)")
      .order("created_at", { ascending: false })
      .limit(100)
    setHistory(data || [])
    setLoading(false)
  }

  const actionColor = {
    "Created": "bg-green-500/20 text-green-400",
    "Updated": "bg-blue-500/20 text-blue-400",
    "Deleted": "bg-red-500/20 text-red-400",
    "Borrowed": "bg-purple-500/20 text-purple-400",
    "Returned": "bg-yellow-500/20 text-yellow-400",
    "Issue Reported": "bg-orange-500/20 text-orange-400",
    "Issue Resolved": "bg-teal-500/20 text-teal-400",
  }

  const actionEmoji = {
    "Created": "✅",
    "Updated": "✏️",
    "Deleted": "🗑️",
    "Borrowed": "📤",
    "Returned": "📥",
    "Issue Reported": "⚠️",
    "Issue Resolved": "✅",
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Asset History</h1>
        <p className="text-gray-400 mt-1 text-sm">Complete audit trail of all asset activities</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : history.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-white font-semibold mb-2">No history yet</p>
          <p className="text-gray-400 text-sm">Asset activities will appear here as you use ITAMS</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-start gap-4"
            >
              <div className="text-2xl shrink-0">
                {actionEmoji[item.action] || "📝"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColor[item.action] || "bg-gray-500/20 text-gray-400"}`}>
                    {item.action}
                  </span>
                  <p className="text-white font-medium text-sm">
                    {item.assets?.name || "Unknown Asset"}
                  </p>
                </div>
                {item.details && (
                  <p className="text-gray-400 text-sm mt-1">{item.details}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {item.changed_by && (
                    <p className="text-gray-500 text-xs">By: {item.changed_by}</p>
                  )}
                  <p className="text-gray-600 text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}