import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    available: 0,
    assigned: 0,
    issues: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from("assets").select("*", { count: "exact", head: true })
    const { count: available } = await supabase
      .from("assets").select("*", { count: "exact", head: true })
      .eq("status", "available")
    const { count: assigned } = await supabase
      .from("assets").select("*", { count: "exact", head: true })
      .eq("status", "assigned")
    const { count: issues } = await supabase
      .from("issues").select("*", { count: "exact", head: true })
      .eq("status", "open")

    setStats({
      totalAssets: total || 0,
      available: available || 0,
      assigned: assigned || 0,
      issues: issues || 0
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to ITAMS — Trainocate Singapore</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl p-6 border border-blue-500/20 bg-gray-900">
          <p className="text-gray-400 text-sm mb-4">Total Assets</p>
          <p className="text-4xl font-bold text-white">{stats.totalAssets}</p>
        </div>
        <div className="rounded-xl p-6 border border-green-500/20 bg-gray-900">
          <p className="text-gray-400 text-sm mb-4">Available</p>
          <p className="text-4xl font-bold text-white">{stats.available}</p>
        </div>
        <div className="rounded-xl p-6 border border-purple-500/20 bg-gray-900">
          <p className="text-gray-400 text-sm mb-4">Assigned</p>
          <p className="text-4xl font-bold text-white">{stats.assigned}</p>
        </div>
        <div className="rounded-xl p-6 border border-red-500/20 bg-gray-900">
          <p className="text-gray-400 text-sm mb-4">Open Issues</p>
          <p className="text-4xl font-bold text-white">{stats.issues}</p>
        </div>
      </div>
    </div>
  )
}