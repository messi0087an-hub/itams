import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { logHistory } from "../../lib/logHistory"

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  const handleDelete = async () => {
    await logHistory(deleteModal.id, "Deleted", `Asset "${deleteModal.name}" was deleted from ITAMS`)
    await supabase.from("assets").delete().eq("id", deleteModal.id)
    setAssets(assets.filter(a => a.id !== deleteModal.id))
    setDeleteModal(null)
  }

  const filtered = assets.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
    a.assigned_user?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = {
    available: "bg-green-500/20 text-green-400",
    assigned: "bg-blue-500/20 text-blue-400",
    maintenance: "bg-yellow-500/20 text-yellow-400",
    retired: "bg-red-500/20 text-red-400",
  }

  return (
    <div className="p-4 md:p-8">

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl"
              style={{ boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)" }}
            >
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
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-medium transition-all"
                  style={{ boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)" }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">All Assets</h1>
          <p className="text-gray-400 mt-1 text-sm">{assets.length} total assets</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-asset")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all text-sm"
        >
          + Add
        </button>
      </div>

      <input
        type="text"
        placeholder="Search assets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 border border-gray-800 focus:border-blue-500 focus:outline-none mb-4"
      />

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">No assets found</p>
        ) : (
          filtered.map((asset) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/admin/assets/${asset.id}`)}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white font-medium">{asset.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{asset.category}</p>
                  <p className="text-gray-400 text-sm mt-1">{asset.serial_number || "No serial"}</p>
                  <p className="text-gray-400 text-sm">{asset.assigned_user || "Unassigned"}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {asset.status}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit-asset/${asset.id}`) }}
                      className="text-blue-400 text-xs px-2 py-1 rounded border border-blue-400/30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteModal(asset) }}
                      className="text-red-400 text-xs px-2 py-1 rounded border border-red-400/30"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Asset</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Serial No.</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Assigned To</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Status</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Location</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-12">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-12">No assets found</td></tr>
            ) : (
              filtered.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => navigate(`/admin/assets/${asset.id}`)}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-all cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{asset.name}</p>
                    <p className="text-gray-500 text-sm">{asset.category}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{asset.serial_number || "—"}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{asset.assigned_user || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{asset.location || "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit-asset/${asset.id}`) }}
                        className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded border border-blue-400/30 hover:border-blue-300 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteModal(asset) }}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded border border-red-400/30 hover:border-red-300 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}