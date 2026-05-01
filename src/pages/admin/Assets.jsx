import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState(null)
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

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this asset?")) return
    await supabase.from("assets").delete().eq("id", id)
    setAssets(assets.filter(a => a.id !== id))
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">All Assets</h1>
          <p className="text-gray-400 mt-1">{assets.length} total assets</p>
        </div>
        <button
          onClick={() => navigate("/admin/add-asset")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          + Add Asset
        </button>
      </div>

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search by name, serial number, or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 border border-gray-800 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
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
                <tr key={asset.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-all">
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
                        onClick={() => navigate(`/admin/edit-asset/${asset.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 rounded border border-blue-400/30 hover:border-blue-300 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
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