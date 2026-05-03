import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalAssets: 0, available: 0, assigned: 0, issues: 0
  })
  const [categoryData, setCategoryData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [recentAssets, setRecentAssets] = useState([])
  const [expiringAssets, setExpiringAssets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentAssets()
    fetchExpiringWarranties()
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from("assets").select("status, category")
    const total = data?.length || 0
    const available = data?.filter(a => a.status === "available").length || 0
    const assigned = data?.filter(a => a.status === "assigned").length || 0

    const { data: issuesData } = await supabase
      .from("issues").select("status").eq("status", "open")

    setStats({ totalAssets: total, available, assigned, issues: issuesData?.length || 0 })

    const catCount = data?.reduce((acc, a) => {
      const cat = a.category || "Unknown"
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    setCategoryData(Object.entries(catCount || {}).map(([name, value]) => ({ name, value })))

    setStatusData([
      { name: t("available"), value: available, color: "#22c55e" },
      { name: t("assigned"), value: assigned, color: "#3b82f6" },
      { name: "Maintenance", value: data?.filter(a => a.status === "maintenance").length || 0, color: "#eab308" },
      { name: "Retired", value: data?.filter(a => a.status === "retired").length || 0, color: "#ef4444" },
    ].filter(d => d.value > 0))

    setLoading(false)
  }

  const fetchRecentAssets = async () => {
    const { data } = await supabase
      .from("assets").select("*")
      .order("created_at", { ascending: false }).limit(5)
    setRecentAssets(data || [])
  }

  const fetchExpiringWarranties = async () => {
    const today = new Date()
    const in90Days = new Date()
    in90Days.setDate(today.getDate() + 90)

    const { data } = await supabase
      .from("assets")
      .select("id, name, warranty_expiry, assigned_user")
      .not("warranty_expiry", "is", null)
      .lte("warranty_expiry", in90Days.toISOString().split("T")[0])
      .gte("warranty_expiry", today.toISOString().split("T")[0])
      .order("warranty_expiry", { ascending: true })
      .limit(5)

    setExpiringAssets(data || [])
  }

  const getDaysUntilExpiry = (date) => {
    const today = new Date()
    const expiry = new Date(date)
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  const cards = [
    { label: t("totalAssets"), value: stats.totalAssets, bg: "bg-blue-600", shadow: "shadow-blue-500/20", emoji: "📦" },
    { label: t("available"), value: stats.available, bg: "bg-green-600", shadow: "shadow-green-500/20", emoji: "✅" },
    { label: t("assigned"), value: stats.assigned, bg: "bg-purple-600", shadow: "shadow-purple-500/20", emoji: "👤" },
    { label: t("openIssues"), value: stats.issues, bg: "bg-red-600", shadow: "shadow-red-500/20", emoji: "⚠️" },
  ]

  return (
    <div className="p-4 md:p-8 relative min-h-screen">
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold text-white"
        >
          {t("dashboard")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 mt-1 text-sm"
        >
          {t("welcomeMessage")}
        </motion.p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            className={`${card.bg} rounded-2xl p-4 md:p-6 shadow-lg ${card.shadow} cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-xs md:text-sm font-medium">{card.label}</span>
              <span className="text-xl md:text-2xl">{card.emoji}</span>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">
              {loading ? "..." : card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Warranty Expiry Alerts */}
      {expiringAssets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 md:p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-yellow-400 font-semibold">{t("warrantyExpiring")}</h2>
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">
              {expiringAssets.length} assets
            </span>
          </div>
          <div className="space-y-2">
            {expiringAssets.map((asset) => {
              const days = getDaysUntilExpiry(asset.warranty_expiry)
              return (
                <div key={asset.id} className="flex items-center justify-between bg-yellow-500/5 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{asset.name}</p>
                    <p className="text-gray-400 text-xs">{asset.assigned_user || "Unassigned"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${days <= 30 ? "text-red-400" : "text-yellow-400"}`}>
                      {days} days left
                    </p>
                    <p className="text-gray-500 text-xs">{asset.warranty_expiry}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6"
        >
          <h2 className="text-white font-semibold mb-4">Assets by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#9ca3af" }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6"
        >
          <h2 className="text-white font-semibold mb-4">Assets by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#9ca3af" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-400 text-xs">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Assets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{t("recentAssets")}</h2>
          <span className="text-gray-500 text-sm">Last 5</span>
        </div>
        <div className="space-y-3">
          {recentAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{asset.name}</p>
                <p className="text-gray-500 text-xs">{asset.category} — {asset.assigned_user || "Unassigned"}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                asset.status === "available" ? "bg-green-500/20 text-green-400" :
                asset.status === "assigned" ? "bg-blue-500/20 text-blue-400" :
                "bg-gray-500/20 text-gray-400"
              }`}>
                {asset.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}