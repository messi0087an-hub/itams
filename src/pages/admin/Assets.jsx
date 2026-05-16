import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { logHistory } from "../../lib/logHistory"
import { useAuth } from "../../context/AuthContext"
import { calculateHealthScore, HEALTH_COLORS } from "../../lib/healthScore"
import { EmptyState, LoadingSkeleton } from "../../components/EmptyState"
import QRLabelModal from "../../components/QRLabelModal"

const STATUS_OPTIONS = ["available", "assigned", "maintenance", "retired"]

function exportToPDF(selectedAssets) {
  const rows = selectedAssets.map(a => `
    <tr>
      <td>${a.name}</td>
      <td>${a.category || "—"}</td>
      <td>${a.serial_number || "—"}</td>
      <td>${a.asset_tag || "—"}</td>
      <td>${a.assigned_user || "—"}</td>
      <td>${a.location || "—"}</td>
      <td>${a.status}</td>
      <td>${a.purchase_price ? "SGD " + Number(a.purchase_price).toLocaleString() : "—"}</td>
    </tr>`).join("")

  const win = window.open("")
  win.document.write(`
    <html>
    <head>
      <title>Asset Export — ITAMS</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p.sub { color: #666; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e293b; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>ITAMS — Asset Export</h1>
      <p class="sub">Exported ${selectedAssets.length} asset${selectedAssets.length !== 1 ? "s" : ""} on ${new Date().toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}</p>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Serial No.</th><th>Asset Tag</th>
            <th>Assigned To</th><th>Location</th><th>Status</th><th>Purchase Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>`)
  win.document.close()
  win.print()
}

export default function Assets() {
  const { canEdit, canDelete, userCountry, profileLoading } = useAuth()
  const [assets, setAssets] = useState([])
  const [maintByAsset, setMaintByAsset] = useState({})
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState(null)
  const navigate = useNavigate()

  // Bulk state
  const [selected, setSelected] = useState(new Set())
  const [bulkModal, setBulkModal] = useState(null) // "assign" | "status" | "delete"
  const [bulkInput, setBulkInput] = useState("")
  const [bulkWorking, setBulkWorking] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)

  useEffect(() => { if (!profileLoading) fetchAssets() }, [profileLoading, userCountry])

  const fetchAssets = async () => {
    let assetQuery = supabase.from("assets").select("*").order("created_at", { ascending: false })
    if (userCountry) assetQuery = assetQuery.eq("country", userCountry)
    const [{ data: a }, { data: m }] = await Promise.all([
      assetQuery,
      supabase.from("maintenance_schedules").select("asset_id, status, scheduled_date"),
    ])
    setAssets(a || [])
    const byAsset = {}
    ;(m || []).forEach(r => {
      if (!byAsset[r.asset_id]) byAsset[r.asset_id] = []
      byAsset[r.asset_id].push(r)
    })
    setMaintByAsset(byAsset)
    setLoading(false)
  }

  const handleDelete = async () => {
    await logHistory(deleteModal.id, "Deleted", `Asset "${deleteModal.name}" was deleted from ITAMS`)
    await supabase.from("assets").delete().eq("id", deleteModal.id)
    setAssets(prev => prev.filter(a => a.id !== deleteModal.id))
    setDeleteModal(null)
  }

  // Bulk helpers
  const toggleSelect = (id, e) => {
    e?.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(a => a.id)))
    }
  }

  const clearSelected = () => setSelected(new Set())

  const selectedAssets = assets.filter(a => selected.has(a.id))

  const handleBulkAssign = async () => {
    if (!bulkInput.trim()) return
    setBulkWorking(true)
    const ids = [...selected]
    await supabase.from("assets").update({ assigned_user: bulkInput.trim(), status: "assigned" }).in("id", ids)
    await Promise.all(ids.map(id => {
      const a = assets.find(x => x.id === id)
      return logHistory(id, "Updated", `Bulk assigned to "${bulkInput.trim()}"`)
    }))
    await fetchAssets()
    setBulkModal(null); setBulkInput(""); clearSelected(); setBulkWorking(false)
  }

  const handleBulkStatus = async () => {
    if (!bulkInput) return
    setBulkWorking(true)
    const ids = [...selected]
    await supabase.from("assets").update({ status: bulkInput }).in("id", ids)
    await Promise.all(ids.map(id => logHistory(id, "Updated", `Bulk status changed to "${bulkInput}"`)))
    await fetchAssets()
    setBulkModal(null); setBulkInput(""); clearSelected(); setBulkWorking(false)
  }

  const handleBulkDelete = async () => {
    setBulkWorking(true)
    const ids = [...selected]
    await Promise.all(ids.map(id => {
      const a = assets.find(x => x.id === id)
      return logHistory(id, "Deleted", `Asset "${a?.name}" bulk deleted`)
    }))
    await supabase.from("assets").delete().in("id", ids)
    await fetchAssets()
    setBulkModal(null); clearSelected(); setBulkWorking(false)
  }

  const filtered = assets.filter(a => {
    const q = search.toLowerCase()
    return (
      a.name?.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q) ||
      a.assigned_user?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q)
    )
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  const statusColor = {
    available: "bg-green-500/20 text-green-400",
    assigned:  "bg-blue-500/20 text-blue-400",
    maintenance: "bg-yellow-500/20 text-yellow-400",
    retired:   "bg-red-500/20 text-red-400",
  }

  return (
    <div className="p-4 md:p-8">

      {/* Single delete modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }} transition={{ type: "spring", stiffness: 200 }}
              className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl"
              style={{ boxShadow: "0 0 40px rgba(239,68,68,0.15)" }}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full mb-4">
                  <span className="text-3xl">🗑️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Asset?</h3>
                <p className="text-gray-400 text-sm">You are about to delete</p>
                <p className="text-white font-semibold mt-1">"{deleteModal.name}"</p>
                <p className="text-gray-500 text-xs mt-2">This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-all">Cancel</button>
                <button onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-medium transition-all"
                  style={{ boxShadow: "0 0 20px rgba(239,68,68,0.3)" }}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action modals */}
      <AnimatePresence>
        {bulkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 200 }}
              className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl">

              {bulkModal === "delete" ? (
                <>
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full mb-3">
                      <span className="text-3xl">🗑️</span>
                    </div>
                    <h3 className="text-white font-bold text-lg mt-1">Delete {selected.size} Asset{selected.size !== 1 ? "s" : ""}?</h3>
                    <p className="text-gray-400 text-sm mt-2">This will permanently delete all selected assets. This cannot be undone.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setBulkModal(null)}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all">Cancel</button>
                    <button onClick={handleBulkDelete} disabled={bulkWorking}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
                      {bulkWorking ? "Deleting..." : `Delete ${selected.size}`}
                    </button>
                  </div>
                </>
              ) : bulkModal === "assign" ? (
                <>
                  <h3 className="text-white font-bold text-lg mb-1">Assign {selected.size} Asset{selected.size !== 1 ? "s" : ""}</h3>
                  <p className="text-gray-500 text-sm mb-4">All selected assets will be assigned and set to "assigned" status.</p>
                  <input type="text" value={bulkInput} onChange={e => setBulkInput(e.target.value)}
                    placeholder="Employee name..."
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm mb-4" />
                  <div className="flex gap-3">
                    <button onClick={() => { setBulkModal(null); setBulkInput("") }}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all">Cancel</button>
                    <button onClick={handleBulkAssign} disabled={bulkWorking || !bulkInput.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
                      {bulkWorking ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                </>
              ) : bulkModal === "status" ? (
                <>
                  <h3 className="text-white font-bold text-lg mb-1">Change Status</h3>
                  <p className="text-gray-500 text-sm mb-4">Set status for {selected.size} selected asset{selected.size !== 1 ? "s" : ""}.</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} onClick={() => setBulkInput(s)}
                        className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all border ${
                          bulkInput === s ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                        }`}>{s}</button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setBulkModal(null); setBulkInput("") }}
                      className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all">Cancel</button>
                    <button onClick={handleBulkStatus} disabled={bulkWorking || !bulkInput}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
                      {bulkWorking ? "Updating..." : "Apply"}
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">All Assets</h1>
          <p className="text-gray-400 mt-1 text-sm">{assets.length} total assets</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate("/admin/add-asset")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all text-sm">
            + Add
          </button>
        )}
      </div>

      <input type="text" placeholder="Search assets..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 border border-gray-800 focus:border-blue-500 focus:outline-none mb-4" />

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-blue-300 font-semibold text-sm">{selected.size} selected</span>
            <div className="flex flex-wrap gap-2 flex-1">
              <button onClick={() => { setBulkInput(""); setBulkModal("assign") }}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-all">
                👤 Assign
              </button>
              <button onClick={() => { setBulkInput(""); setBulkModal("status") }}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-all">
                🔄 Change Status
              </button>
              <button onClick={() => exportToPDF(selectedAssets)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-all">
                📄 Export PDF
              </button>
              <button onClick={() => setShowLabelModal(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-all">
                🏷️ Print Labels
              </button>
              {canDelete && (
                <button onClick={() => setBulkModal("delete")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all">
                  🗑️ Delete
                </button>
              )}
            </div>
            <button onClick={clearSelected} className="text-gray-500 hover:text-gray-300 text-xs transition-all">✕ Clear</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <LoadingSkeleton rows={4} cols={2} />
        ) : filtered.length === 0 ? (
          <EmptyState preset={search ? "search" : "assets"} />
        ) : (
          filtered.map((asset) => {
            const { score, band } = calculateHealthScore(asset, maintByAsset[asset.id] || [])
            const hc = HEALTH_COLORS[band]
            const isChecked = selected.has(asset.id)
            return (
              <motion.div key={asset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/admin/assets/${asset.id}`)}
                className={`bg-gray-900 rounded-xl border p-4 cursor-pointer transition-all ${
                  isChecked ? "border-blue-500/50 bg-blue-500/5" : "border-gray-800"
                }`}>
                <div className="flex items-start gap-3">
                  <div onClick={e => toggleSelect(asset.id, e)} className="mt-1 shrink-0">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      isChecked ? "bg-blue-600 border-blue-600" : "border-gray-600 hover:border-gray-400"
                    }`}>
                      {isChecked && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{asset.name}</p>
                    <p className="text-gray-500 text-xs mt-1">{asset.category}</p>
                    <p className="text-gray-400 text-sm mt-1">{asset.serial_number || "No serial"}</p>
                    <p className="text-gray-400 text-sm">{asset.assigned_user || "Unassigned"}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden max-w-[80px]">
                        <div className={`h-full ${hc.bar} rounded-full`} style={{ width: `${score}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${hc.text}`}>{score}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                      {asset.status}
                    </span>
                    <div className="flex gap-1">
                      {canEdit && (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit-asset/${asset.id}`) }}
                          className="text-blue-400 text-xs px-2 py-1 rounded border border-blue-400/30">Edit</button>
                      )}
                      {canDelete && (
                        <button onClick={(e) => { e.stopPropagation(); setDeleteModal(asset) }}
                          className="text-red-400 text-xs px-2 py-1 rounded border border-red-400/30">Del</button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-4 w-10">
                <div onClick={toggleAll}
                  className={`w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${
                    allSelected ? "bg-blue-600 border-blue-600" : someSelected ? "bg-blue-600/40 border-blue-500" : "border-gray-600 hover:border-gray-400"
                  }`}>
                  {(allSelected || someSelected) && <span className="text-white text-xs leading-none">{allSelected ? "✓" : "–"}</span>}
                </div>
              </th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Asset</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Serial No.</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Assigned To</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Status</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Health</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Location</th>
              <th className="text-left text-gray-400 text-sm font-medium px-4 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><LoadingSkeleton rows={4} cols={2} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}><EmptyState preset={search ? "search" : "assets"} /></td></tr>
            ) : (
              filtered.map((asset) => {
                const { score, band } = calculateHealthScore(asset, maintByAsset[asset.id] || [])
                const hc = HEALTH_COLORS[band]
                const isChecked = selected.has(asset.id)
                return (
                  <tr key={asset.id} onClick={() => navigate(`/admin/assets/${asset.id}`)}
                    className={`border-b border-gray-800 transition-all cursor-pointer ${
                      isChecked ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-gray-800/50"
                    }`}>
                    <td className="px-4 py-4" onClick={e => toggleSelect(asset.id, e)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        isChecked ? "bg-blue-600 border-blue-600" : "border-gray-600 hover:border-gray-400"
                      }`}>
                        {isChecked && <span className="text-white text-xs leading-none">✓</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white font-medium">{asset.name}</p>
                      <p className="text-gray-500 text-sm">{asset.category}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">{asset.serial_number || "—"}</td>
                    <td className="px-4 py-4 text-gray-400 text-sm">{asset.assigned_user || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${hc.bar} rounded-full`} style={{ width: `${score}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${hc.text}`}>{score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">{asset.location || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {canEdit && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit-asset/${asset.id}`) }}
                            className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded border border-blue-400/30 hover:border-blue-300 transition-all">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={(e) => { e.stopPropagation(); setDeleteModal(asset) }}
                            className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded border border-red-400/30 hover:border-red-300 transition-all">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QR Label bulk print modal */}
      <AnimatePresence>
        {showLabelModal && selected.size > 0 && (
          <QRLabelModal
            assets={selectedAssets}
            assetUrlBase={`${window.location.origin}/admin/assets/`}
            onClose={() => setShowLabelModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
