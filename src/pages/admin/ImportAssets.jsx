import { useState } from "react"
import { supabase } from "../../lib/supabase"
import * as XLSX from "xlsx"

export default function ImportAssets() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState([])
  const [imported, setImported] = useState(false)
  const [count, setCount] = useState(0)

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
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (!row[0] || row[0] === "ITEM") continue

        const name = row[0]
        const serial = row[1]
        const usage = row[4]
        const assetTag = row[5]
        const remarks = row[6]

        if (name && typeof name === "string") {
          assets.push({
            name,
            serial_number: serial ? String(serial) : null,
            assigned_user: usage ? String(usage) : null,
            asset_tag: assetTag ? String(assetTag) : null,
            remarks: remarks ? String(remarks) : null,
            category: name.toLowerCase().includes("laptop") || 
                      name.toLowerCase().includes("lenovo") || 
                      name.toLowerCase().includes("dell") || 
                      name.toLowerCase().includes("hp") ||
                      name.toLowerCase().includes("asus") ||
                      name.toLowerCase().includes("apple") ||
                      name.toLowerCase().includes("surface") ? "Laptop" : "Desktop",
            status: "available",
            country: "Singapore",
            location: "Singapore"
          })
        }
      }
      setPreview(assets.slice(0, 5))
      setCount(assets.length)
      window._importData = assets
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!window._importData || window._importData.length === 0) return
    setLoading(true)

    const batchSize = 50
    const data = window._importData
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      await supabase.from("assets").insert(batch)
    }

    setImported(true)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-2">Import Assets</h1>
      <p className="text-gray-400 mb-8">Upload the Singapore Excel file to import all assets</p>

      {imported && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 mb-6">
          ✅ Successfully imported {count} assets into ITAMS!
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
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
                <tr>
                  <td colSpan={4} className="text-gray-500 py-2 px-3 text-center">
                    ... and {count - 5} more assets
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all"
          >
            {loading ? "Importing..." : `Import All ${count} Assets`}
          </button>
        </div>
      )}
    </div>
  )
}