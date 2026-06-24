import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import * as XLSX from "xlsx"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

export default function ImportAssets() {
  const { userCountry, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState([])
  const [imported, setImported] = useState(false)
  const [count, setCount] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [updatedCount, setUpdatedCount] = useState(0)
  const [importMode, setImportMode] = useState("add") // "add" | "update"
  const [importHistory, setImportHistory] = useState([])

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    const { data } = await supabase
      .from("import_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
    setImportHistory(data || [])
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: "binary" })
      const sheet = workbook.Sheets["Laptop & Desktop"]
      if (!sheet) {
        alert("Could not find 'Laptop & Desktop' sheet!")
        return
      }
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      const assets = []
      const seenSerials = new Set()

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row[0] || row[0] === "ITEM") continue

        const name = row[0]
        if (!name || typeof name !== "string") continue

        let serial = row[1] ? String(row[1]).trim() : null
        const usage = row[4] ? String(row[4]).trim() : null
        const assetTag = row[5] ? String(row[5]).trim() : null
        const remarks = row[6] ? String(row[6]).trim() : null

        if (serial && seenSerials.has(serial)) {
          serial = `${serial}_${i}`
        }
        if (serial) seenSerials.add(serial)

        const category =
          name.toLowerCase().includes("desktop") ? "Desktop" : "Laptop"

        assets.push({
          name: name.trim(),
          serial_number: serial || null,
          assigned_user: usage || null,
          asset_tag: assetTag || null,
          remarks: remarks || null,
          category,
          status: "available",
          country: userCountry || "Singapore",
          location: userCountry || "Singapore"
        })
      }

      setPreview(assets.slice(0, 5))
      setCount(assets.length)
      setImported(false)
      setImportedCount(0)
      setUpdatedCount(0)
      window._importData = assets
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!window._importData || window._importData.length === 0) return
    setLoading(true)

    const data = window._importData
    let successCount = 0
    let updateCount = 0
    const fileName = `Import_${new Date().toISOString().split("T")[0]}`

    for (let i = 0; i < data.length; i++) {
      const item = data[i]

      if (importMode === "update" && item.serial_number) {
        const { data: existing } = await supabase
          .from("assets")
          .select("id")
          .eq("serial_number", item.serial_number)
          .single()

        if (existing?.id) {
          const { error } = await supabase.from("assets").update(item).eq("id", existing.id)
          if (!error) updateCount++
          setUpdatedCount(updateCount)
          continue
        }
      }

      const { error } = await supabase.from("assets").insert([item])
      if (!error) successCount++
      setImportedCount(successCount)
    }

    // Save import history
    await supabase.from("import_history").insert([{
      file_name: fileName,
      imported_by: userProfile?.name || userProfile?.email || "Unknown",
      total_count: data.length,
      success_count: successCount,
      updated_count: updateCount,
      status: "Success",
    }])

    setImported(true)
    setLoading(false)
    loadHistory()
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-2">Import Assets</h1>
      <p className="text-gray-400 mb-8">Upload your asset list{userCountry ? ` — assets will be imported to ${userCountry}` : ""}</p>

      <AnimatePresence>
        {imported && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 mb-6">
            ✅ {importedCount} new asset{importedCount !== 1 ? "s" : ""} added
            {updatedCount > 0 ? `, ${updatedCount} existing updated` : ""}!
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-3 mb-6">
          ⏳ Importing... {importedCount + updatedCount} / {count} done
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        {/* Import Mode */}
        <div className="mb-5">
          <label className="text-gray-400 text-sm mb-3 block font-medium">Import Mode</label>
          <div className="space-y-2">
            {[
              { value: "add", label: "Add new assets only", desc: "Skip assets with existing serial numbers" },
              { value: "update", label: "Add new + update existing", desc: "Update asset details if serial number matches" },
            ].map(opt => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                <input type="radio" name="importMode" value={opt.value} checked={importMode === opt.value}
                  onChange={() => setImportMode(opt.value)} className="mt-0.5" />
                <div>
                  <p className={`text-sm font-medium ${importMode === opt.value ? "text-white" : "text-gray-400"}`}>{opt.label}</p>
                  <p className="text-gray-600 text-xs">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <label className="text-gray-400 text-sm mb-3 block">Select Excel File (IT_Asset_Tracking.xlsx)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>

      {preview.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Preview — {count} assets found</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 py-2 px-3">Name</th>
                  <th className="text-left text-gray-400 py-2 px-3">Serial</th>
                  <th className="text-left text-gray-400 py-2 px-3">Assigned To</th>
                  <th className="text-left text-gray-400 py-2 px-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((a, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="text-white py-2 px-3">{a.name}</td>
                    <td className="text-gray-400 py-2 px-3">{a.serial_number || "—"}</td>
                    <td className="text-gray-400 py-2 px-3">{a.assigned_user || "—"}</td>
                    <td className="text-gray-400 py-2 px-3">{a.category}</td>
                  </tr>
                ))}
                {count > 5 && (
                  <tr>
                    <td colSpan={4} className="text-gray-500 py-2 px-3 text-center">
                      ... and {count - 5} more assets
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading
              ? `Importing ${importedCount + updatedCount}/${count}...`
              : `Import ${count} Assets (${importMode === "update" ? "Add + Update" : "Add Only"})`}
          </button>
        </div>
      )}

      {/* Import History */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-white font-semibold mb-4">Import History</h2>
        {importHistory.length === 0 ? (
          <p className="text-gray-500 text-sm">No import history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 py-2 px-3">File</th>
                  <th className="text-left text-gray-400 py-2 px-3">Date</th>
                  <th className="text-left text-gray-400 py-2 px-3">By</th>
                  <th className="text-left text-gray-400 py-2 px-3">Added</th>
                  <th className="text-left text-gray-400 py-2 px-3">Updated</th>
                  <th className="text-left text-gray-400 py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((h, i) => (
                  <tr key={h.id || i} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="text-white py-2 px-3 max-w-xs truncate">{h.file_name || "—"}</td>
                    <td className="text-gray-400 py-2 px-3 text-xs whitespace-nowrap">
                      {h.created_at ? new Date(h.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="text-gray-400 py-2 px-3">{h.imported_by || "—"}</td>
                    <td className="text-gray-400 py-2 px-3">{h.success_count ?? "—"}</td>
                    <td className="text-gray-400 py-2 px-3">{h.updated_count ?? 0}</td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        h.status === "Success"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {h.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-gray-600 text-xs mt-3">Showing last 10 imports</p>
      </div>
    </div>
  )
}
