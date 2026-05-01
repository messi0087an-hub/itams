import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import * as XLSX from "xlsx"

export default function Reports() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .order("name")
    setAssets(data || [])
    setStats({
      total: data?.length || 0,
      available: data?.filter(a => a.status === "available").length || 0,
      assigned: data?.filter(a => a.status === "assigned").length || 0,
      maintenance: data?.filter(a => a.status === "maintenance").length || 0,
      retired: data?.filter(a => a.status === "retired").length || 0,
    })
    setLoading(false)
  }

  const exportToExcel = () => {
    const rows = assets.map(a => ({
      "Asset Name": a.name,
      "Category": a.category || "",
      "Brand/Model": a.brand_model || "",
      "Serial Number": a.serial_number || "",
      "Asset Tag": a.asset_tag || "",
      "Status": a.status,
      "Location": a.location || "",
      "Assigned To": a.assigned_user || "",
      "Department": a.department || "",
      "Purchase Date": a.purchase_date || "",
      "Purchase Price (SGD)": a.purchase_price || "",
      "Warranty Expiry": a.warranty_expiry || "",
      "Remarks": a.remarks || "",
      "Country": a.country || "Singapore",
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Assets")
    XLSX.writeFile(wb, `ITAMS_Assets_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const statCards = [
    { label: "Total Assets", value: stats.total, color: "border-blue-500/20" },
    { label: "Available", value: stats.available, color: "border-green-500/20" },
    { label: "Assigned", value: stats.assigned, color: "border-purple-500/20" },
    { label: "Maintenance", value: stats.maintenance, color: "border-yellow-500/20" },
    { label: "Retired", value: stats.retired, color: "border-red-500/20" },
  ]

  const categoryCount = assets.reduce((acc, a) => {
    const cat = a.category || "Unknown"
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1">Asset summary and exports</p>
        </div>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          Export to Excel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className={`bg-gray-900 rounded-xl border ${card.color} p-4`}>
            <p className="text-gray-400 text-xs mb-2">{card.label}</p>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Assets by Category</h2>
        <div className="space-y-3">
          {Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-4">
              <span className="text-gray-400 text-sm w-32">{cat}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(count / stats.total) * 100}%` }}
                />
              </div>
              <span className="text-white text-sm w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Full Asset List</h2>
          <span className="text-gray-500 text-sm">{assets.length} assets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Name</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Category</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Serial No.</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Assigned To</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center text-gray-500 py-12">Loading...</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-3 text-white text-sm">{asset.name}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{asset.category || "—"}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{asset.serial_number || "—"}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{asset.assigned_user || "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        asset.status === "available" ? "bg-green-500/20 text-green-400" :
                        asset.status === "assigned" ? "bg-blue-500/20 text-blue-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}