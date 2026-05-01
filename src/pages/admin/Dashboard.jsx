import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAssets: 0, available: 0, assigned: 0, issues: 0
  })
  const [recentAssets, setRecentAssets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentAssets()
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from("assets").select("status")
    const total = data?.length || 0
    const available = data?.filter(a => a.status === "available").length || 0
    const assigned = data?.filter(a => a.status === "assigned").length || 0
    const { data: issuesData } = await supabase
      .from("issues").select("status").eq("status", "open")
    setStats({ totalAssets: total, available, assigned, issues: issuesData?.length || 0 })
    setLoading(false)
  }

  const fetchRecentAssets = async () => {
    const { data } = await supabase
      .from("assets").select("*")
      .order("created_at", { ascending: false }).limit(5)
    setRecentAssets(data || [])
  }

  const cards = [
    {
      label: "Total Assets",
      value: stats.totalAssets,
      bg: "bg-blue-600",
      shadow: "shadow-blue-500/20",
      emoji: "📦"
    },
    {
      label: "Available",
      value: stats.available,
      bg: "bg-green-600",
      shadow: "shadow-green-500/20",
      emoji: "✅"
    },
    {
      label: "Assigned",
      value: stats.assigned,
      bg: "bg-purple-600",
      shadow: "shadow-purple-500/20",
      emoji: "👤"
    },
    {
      label: "Open Issues",
      value: stats.issues,
      bg: "bg-red-600",
      shadow: "shadow-red-500/20",
      emoji: "⚠️"
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to ITAMS — Trainocate Singapore</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-6 shadow-lg ${card.shadow}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-sm font-medium">{card.label}</span>
              <span className="text-2xl">{card.emoji}</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {loading ? "..." : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Recently Added Assets</h2>
          <span className="text-gray-500 text-sm">Last 5 assets</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-sm font-medium py-3">Name</th>
              <th className="text-left text-gray-400 text-sm font-medium py-3">Category</th>
              <th className="text-left text-gray-400 text-sm font-medium py-3">Assigned To</th>
              <th className="text-left text-gray-400 text-sm font-medium py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentAssets.map((asset) => (
              <tr key={asset.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-all">
                <td className="py-3 text-white text-sm font-medium">{asset.name}</td>
                <td className="py-3 text-gray-400 text-sm">{asset.category || "—"}</td>
                <td className="py-3 text-gray-400 text-sm">{asset.assigned_user || "—"}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    asset.status === "available" ? "bg-green-500/20 text-green-400" :
                    asset.status === "assigned" ? "bg-blue-500/20 text-blue-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {asset.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}