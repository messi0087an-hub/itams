import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts"
import { motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { checkWarrantyAlerts, checkLicenseAlerts } from "../../lib/emailService"
import { calculateHealthScore, HEALTH_COLORS } from "../../lib/healthScore"
import { calcDepreciation, fmtSGD } from "../../lib/depreciation"

const CHART_TOOLTIP = {
  contentStyle: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#9ca3af" },
}

const DONUT_COLORS = ["#3b82f6","#8b5cf6","#06b6d4","#ec4899","#f59e0b","#22c55e","#ef4444","#f97316"]

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ totalAssets: 0, available: 0, assigned: 0, issues: 0 })
  const [categoryData, setCategoryData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [recentAssets, setRecentAssets] = useState([])
  const [expiringAssets, setExpiringAssets] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [procurementData, setProcurementData] = useState([])
  const [conditionData, setConditionData] = useState([])
  const [healthStats, setHealthStats] = useState(null)
  const [deprStats, setDeprStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentAssets()
    fetchExpiringWarranties()
    fetchDepartmentValue()
    fetchProcurement()
    fetchCondition()
    fetchHealthStats()
    fetchDeprStats()
    checkWarrantyAlerts()
    checkLicenseAlerts()
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from("assets").select("status, category")
    const total = data?.length || 0
    const available = data?.filter(a => a.status === "available").length || 0
    const assigned = data?.filter(a => a.status === "assigned").length || 0
    const { data: issuesData } = await supabase.from("issues").select("status").eq("status", "open")
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
    const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false }).limit(5)
    setRecentAssets(data || [])
  }

  const fetchExpiringWarranties = async () => {
    const today = new Date()
    const in90Days = new Date()
    in90Days.setDate(today.getDate() + 90)
    const { data } = await supabase
      .from("assets").select("id, name, warranty_expiry, assigned_user")
      .not("warranty_expiry", "is", null)
      .lte("warranty_expiry", in90Days.toISOString().split("T")[0])
      .gte("warranty_expiry", today.toISOString().split("T")[0])
      .order("warranty_expiry", { ascending: true }).limit(5)
    setExpiringAssets(data || [])
  }

  const fetchDepartmentValue = async () => {
    const { data } = await supabase.from("assets").select("department, purchase_price")
    const map = {}
    data?.forEach(a => {
      const dept = a.department || "Unassigned"
      map[dept] = (map[dept] || 0) + (parseFloat(a.purchase_price) || 0)
    })
    setDepartmentData(
      Object.entries(map)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    )
  }

  const fetchProcurement = async () => {
    const { data } = await supabase.from("assets").select("purchase_date, purchase_price")
      .not("purchase_date", "is", null).not("purchase_price", "is", null)
    const map = {}
    data?.forEach(a => {
      const d = new Date(a.purchase_date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("en-SG", { month: "short", year: "2-digit" })
      if (!map[key]) map[key] = { name: label, value: 0, key }
      map[key].value += parseFloat(a.purchase_price) || 0
    })
    setProcurementData(
      Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-12)
        .map(d => ({ ...d, value: Math.round(d.value) }))
    )
  }

  const fetchCondition = async () => {
    const { data } = await supabase.from("assets").select("warranty_expiry")
    const today = new Date()
    const in30 = new Date(); in30.setDate(today.getDate() + 30)
    const in90 = new Date(); in90.setDate(today.getDate() + 90)
    let good = 0, soon = 0, critical = 0, expired = 0, none = 0
    data?.forEach(a => {
      if (!a.warranty_expiry) { none++; return }
      const exp = new Date(a.warranty_expiry)
      if (exp < today) expired++
      else if (exp <= in30) critical++
      else if (exp <= in90) soon++
      else good++
    })
    setConditionData([
      { name: "Good (>90d)", value: good, color: "#22c55e" },
      { name: "Expiring (30-90d)", value: soon, color: "#eab308" },
      { name: "Critical (<30d)", value: critical, color: "#f97316" },
      { name: "Expired", value: expired, color: "#ef4444" },
      { name: "No Warranty", value: none, color: "#6b7280" },
    ].filter(d => d.value > 0))
  }

  const fetchHealthStats = async () => {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, purchase_date, warranty_expiry, status")

    if (error || !assets || assets.length === 0) {
      setHealthStats({ avg: 0, green: 0, yellow: 0, red: 0, total: 0 })
      return
    }

    // Maintenance records optional — table may not exist yet
    const { data: maint } = await supabase
      .from("maintenance_schedules")
      .select("asset_id, status, scheduled_date")

    const byAsset = {}
    ;(maint || []).forEach(m => {
      if (!byAsset[m.asset_id]) byAsset[m.asset_id] = []
      byAsset[m.asset_id].push(m)
    })

    let green = 0, yellow = 0, red = 0, scoreSum = 0
    assets.forEach(a => {
      const { score, band } = calculateHealthScore(a, byAsset[a.id] || [])
      scoreSum += score
      if (band === "green") green++
      else if (band === "yellow") yellow++
      else red++
    })
    setHealthStats({ avg: Math.round(scoreSum / assets.length), green, yellow, red, total: assets.length })
  }

  const fetchDeprStats = async () => {
    const { data } = await supabase
      .from("assets")
      .select("purchase_price, purchase_date")
      .not("purchase_price", "is", null)
      .not("purchase_date", "is", null)
    if (!data?.length) { setDeprStats({ totalOriginal: 0, totalCurrent: 0, totalLost: 0, count: 0 }); return }
    let totalOriginal = 0, totalCurrent = 0
    data.forEach(a => {
      const d = calcDepreciation(a.purchase_price, a.purchase_date)
      if (d) { totalOriginal += d.originalPrice; totalCurrent += d.currentValue }
    })
    setDeprStats({
      totalOriginal: Math.round(totalOriginal),
      totalCurrent: Math.round(totalCurrent),
      totalLost: Math.round(totalOriginal - totalCurrent),
      count: data.length,
    })
  }

  const getDaysUntilExpiry = (date) =>
    Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

  const cards = [
    { label: t("totalAssets"), value: stats.totalAssets, bg: "bg-blue-600", shadow: "shadow-blue-500/20", emoji: "📦" },
    { label: t("available"), value: stats.available, bg: "bg-green-600", shadow: "shadow-green-500/20", emoji: "✅" },
    { label: t("assigned"), value: stats.assigned, bg: "bg-purple-600", shadow: "shadow-purple-500/20", emoji: "👤" },
    { label: t("openIssues"), value: stats.issues, bg: "bg-red-600", shadow: "shadow-red-500/20", emoji: "⚠️" },
  ]

  return (
    <div className="p-4 md:p-8 relative min-h-screen">
      <div className="mb-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold text-white">{t("dashboard")}</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-gray-400 mt-1 text-sm">{t("welcomeMessage")}</motion.p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            className={`${card.bg} rounded-2xl p-4 md:p-6 shadow-lg ${card.shadow} cursor-pointer`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-xs md:text-sm font-medium">{card.label}</span>
              <span className="text-xl md:text-2xl">{card.emoji}</span>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-white">{loading ? "..." : card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Fleet Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-5 mb-6">
        {!healthStats ? (
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-36" />
                <div className="h-3 bg-gray-700 rounded w-52" />
              </div>
              <div className="h-9 bg-gray-700 rounded w-12" />
            </div>
            <div className="h-2 bg-gray-700 rounded-full" />
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => <div key={i} className="h-14 bg-gray-700 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold">Fleet Health Score</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {healthStats.total > 0
                    ? `Overall asset condition across ${healthStats.total} assets`
                    : "Add assets to see health scores"}
                </p>
              </div>
              {healthStats.total > 0 && (
                <div className="text-right">
                  <p className={`text-3xl font-bold ${
                    healthStats.avg >= 71 ? "text-green-400" :
                    healthStats.avg >= 41 ? "text-yellow-400" : "text-red-400"
                  }`}>{healthStats.avg}</p>
                  <p className="text-gray-500 text-xs">/ 100</p>
                </div>
              )}
            </div>
            {healthStats.total > 0 && (
              <>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${healthStats.avg}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      healthStats.avg >= 71 ? "bg-green-500" :
                      healthStats.avg >= 41 ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-500/10 rounded-xl p-3 text-center border border-green-500/20">
                    <p className="text-green-400 text-xl font-bold">{healthStats.green}</p>
                    <p className="text-green-400/70 text-xs mt-0.5">Healthy</p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
                    <p className="text-yellow-400 text-xl font-bold">{healthStats.yellow}</p>
                    <p className="text-yellow-400/70 text-xs mt-0.5">Fair</p>
                  </div>
                  <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
                    <p className="text-red-400 text-xl font-bold">{healthStats.red}</p>
                    <p className="text-red-400/70 text-xs mt-0.5">Needs Attention</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Fleet Depreciation */}
      {deprStats && deprStats.count > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📉</span>
            <h2 className="text-white font-semibold">Fleet Depreciation</h2>
            <span className="text-gray-500 text-xs">({deprStats.count} assets with price data)</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800/60 rounded-xl p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">Original Cost</p>
              <p className="text-white font-bold text-sm">{fmtSGD(deprStats.totalOriginal)}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">Current Book Value</p>
              <p className="text-blue-400 font-bold text-sm">{fmtSGD(deprStats.totalCurrent)}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">Total Depreciated</p>
              <p className="text-red-400 font-bold text-sm">{fmtSGD(deprStats.totalLost)}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }}
              animate={{ width: `${Math.round((deprStats.totalCurrent / deprStats.totalOriginal) * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-blue-500 rounded-full" />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{Math.round((deprStats.totalCurrent / deprStats.totalOriginal) * 100)}% remaining value</span>
            <span>{Math.round((deprStats.totalLost / deprStats.totalOriginal) * 100)}% depreciated</span>
          </div>
        </motion.div>
      )}

      {/* Warranty Expiry Alerts */}
      {expiringAssets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 md:p-6 mb-6">
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

      {/* Row 1 — existing charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Assets by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Assets by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...CHART_TOOLTIP} />
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

      {/* Row 2 — new charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-1">Asset Value by Department</h2>
          <p className="text-gray-500 text-xs mb-4">Total purchase value (SGD)</p>
          {departmentData.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-16">No department / price data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentData} layout="vertical">
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={80} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => [`$${v.toLocaleString()}`, "Value"]} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-1">Monthly Procurement Spending</h2>
          <p className="text-gray-500 text-xs mb-4">Last 12 months (SGD)</p>
          {procurementData.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-16">No purchase date / price data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={procurementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => [`$${v.toLocaleString()}`, "Spent"]} />
                <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2}
                  dot={{ fill: "#06b6d4", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: "#06b6d4" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Row 3 — new charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-1">Asset Condition</h2>
          <p className="text-gray-500 text-xs mb-4">Based on warranty status</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={conditionData} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                {conditionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip {...CHART_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {conditionData.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-400 text-xs">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
          className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-1">Category Distribution</h2>
          <p className="text-gray-500 text-xs mb-4">Asset count by type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip {...CHART_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {categoryData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-gray-400 text-xs">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Assets */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
        className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-800 p-6">
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
              }`}>{asset.status}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
