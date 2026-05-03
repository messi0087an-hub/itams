import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { motion } from "framer-motion"

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
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Assets")
    XLSX.writeFile(wb, `ITAMS_Assets_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 30, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("ITAMS — IT Asset Report", 14, 18)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Trainocate Singapore · Generated: ${new Date().toLocaleDateString()}`, 14, 25)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Summary", 14, 42)

    autoTable(doc, {
      startY: 46,
      head: [["Category", "Count"]],
      body: [
        ["Total Assets", stats.total],
        ["Available", stats.available],
        ["Assigned", stats.assigned],
        ["Maintenance", stats.maintenance],
        ["Retired", stats.retired],
      ],
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14 },
      tableWidth: 80,
    })

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Asset List", 14, doc.lastAutoTable.finalY + 15)

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 19,
      head: [["Asset Name", "Category", "Serial No.", "Assigned To", "Status"]],
      body: assets.map(a => [
        a.name,
        a.category || "—",
        a.serial_number || "—",
        a.assigned_user || "—",
        a.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
      margin: { left: 14 },
    })

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `ITAMS — Trainocate Singapore · Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      )
    }

    doc.save(`ITAMS_Report_${new Date().toISOString().split("T")[0]}.pdf`)
  }

  const statCards = [
    { label: "Total Assets", value: stats.total, color: "border-blue-500/20", text: "text-blue-400" },
    { label: "Available", value: stats.available, color: "border-green-500/20", text: "text-green-400" },
    { label: "Assigned", value: stats.assigned, color: "border-purple-500/20", text: "text-purple-400" },
    { label: "Maintenance", value: stats.maintenance, color: "border-yellow-500/20", text: "text-yellow-400" },
    { label: "Retired", value: stats.retired, color: "border-red-500/20", text: "text-red-400" },
  ]

  const categoryCount = assets.reduce((acc, a) => {
    const cat = a.category || "Unknown"
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1 text-sm">Asset summary and exports</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium"
          >
            📄 PDF
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium"
          >
            📊 Excel
          </motion.button>
        </div>
      </div>

      {/* Stats - 2 col on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-gray-900/80 rounded-xl border ${card.color} p-4`}
          >
            <p className="text-gray-400 text-xs mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.text}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 md:p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Assets by Category</h2>
        <div className="space-y-3">
          {Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-24 shrink-0">{cat}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / stats.total) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-blue-500 h-2 rounded-full"
                />
              </div>
              <span className="text-white text-sm w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Asset List — Cards on mobile, Table on desktop */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Full Asset List</h2>
          <span className="text-gray-500 text-sm">{assets.length} assets</span>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-gray-800">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading...</p>
          ) : (
            assets.map((asset) => (
              <div key={asset.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{asset.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{asset.category || "—"}</p>
                    <p className="text-gray-400 text-xs mt-1">{asset.serial_number || "No serial"}</p>
                    <p className="text-gray-400 text-xs">{asset.assigned_user || "Unassigned"}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${
                    asset.status === "available" ? "bg-green-500/20 text-green-400" :
                    asset.status === "assigned" ? "bg-blue-500/20 text-blue-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {asset.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
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