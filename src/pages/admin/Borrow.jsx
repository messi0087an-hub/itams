import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

export default function Borrow() {
  const [borrows, setBorrows] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [borrowSuccess, setBorrowSuccess] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState(false)
  const [returnedAssetName, setReturnedAssetName] = useState("")
  const [borrowedAssetName, setBorrowedAssetName] = useState("")
  const [form, setForm] = useState({
    asset_id: "", borrower_name: "", borrower_email: "", notes: ""
  })

  useEffect(() => {
    fetchBorrows()
    fetchAssets()
  }, [])

  const fetchBorrows = async () => {
    const { data } = await supabase
      .from("borrow_history")
      .select("*, assets(name, serial_number)")
      .order("borrowed_at", { ascending: false })
    setBorrows(data || [])
    setLoading(false)
  }

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("assets")
      .select("id, name, serial_number, status")
      .eq("status", "available")
      .order("name")
    setAssets(data || [])
  }

  const handleBorrow = async (e) => {
    e.preventDefault()
    const selectedAsset = assets.find(a => a.id === form.asset_id)
    const { error } = await supabase.from("borrow_history").insert([{
      asset_id: form.asset_id,
      borrowed_at: new Date().toISOString(),
      notes: `Borrowed by ${form.borrower_name}${form.borrower_email ? ` (${form.borrower_email})` : ""}${form.notes ? ` - ${form.notes}` : ""}`
    }])

    if (!error) {
      await supabase.from("assets").update({
        status: "assigned",
        assigned_user: form.borrower_name
      }).eq("id", form.asset_id)

      setBorrowedAssetName(selectedAsset?.name || "Asset")
      setShowForm(false)
      setForm({ asset_id: "", borrower_name: "", borrower_email: "", notes: "" })
      setBorrowSuccess(true)
      setTimeout(() => {
        setBorrowSuccess(false)
        fetchBorrows()
        fetchAssets()
      }, 2500)
    } else {
      alert(error.message)
    }
  }

  const handleReturn = async (borrow) => {
    setReturnedAssetName(borrow.assets?.name || "Asset")
    await supabase.from("borrow_history").update({
      returned_at: new Date().toISOString()
    }).eq("id", borrow.id)
    await supabase.from("assets").update({
      status: "available",
      assigned_user: null
    }).eq("id", borrow.asset_id)

    setReturnSuccess(true)
    setTimeout(() => {
      setReturnSuccess(false)
      fetchBorrows()
      fetchAssets()
    }, 2500)
  }

  const activeBorrows = borrows.filter(b => !b.returned_at)
  const returnedBorrows = borrows.filter(b => b.returned_at)

  return (
    <div className="p-4 md:p-8">

      {/* Borrow Success Animation */}
      <AnimatePresence>
        {borrowSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center"
            >
              {["🎊", "📤", "🎊"].map((emoji, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -60 }}
                  transition={{ delay: i * 0.2, duration: 1 }}
                  className="absolute text-3xl"
                  style={{ left: `${40 + i * 10}%` }}
                >
                  {emoji}
                </motion.div>
              ))}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-blue-500/20 border-2 border-blue-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(59, 130, 246, 0.4)" }}
              >
                <span className="text-5xl">📤</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Asset Borrowed!</h2>
              <p className="text-gray-400">{borrowedAssetName} has been borrowed successfully</p>
              <div className="mt-4 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Return Success Animation */}
      <AnimatePresence>
        {returnSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 border-2 border-green-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(34, 197, 94, 0.4)" }}
              >
                <span className="text-5xl">📥</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Asset Returned!</h2>
              <p className="text-gray-400">{returnedAssetName} has been returned successfully</p>
              <div className="mt-4 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full bg-green-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Borrow / Return</h1>
          <p className="text-gray-400 mt-1 text-sm">{activeBorrows.length} active borrows</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
        >
          + Borrow Asset
        </motion.button>
      </div>

      {/* Borrow Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleBorrow}
            className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 mb-6"
          >
            <h2 className="text-white font-semibold mb-4">Borrow an Asset</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Asset</label>
                <select
                  value={form.asset_id}
                  onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Select available asset...</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.serial_number ? `(${a.serial_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Borrower Name</label>
                <input
                  type="text"
                  value={form.borrower_name}
                  onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Borrower Email</label>
                <input
                  type="email"
                  value={form.borrower_email}
                  onChange={(e) => setForm({ ...form, borrower_email: e.target.value })}
                  placeholder="e.g. john@trainocate.com"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Confirm Borrow
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Active Borrows */}
      <div className="mb-6">
        <h2 className="text-white font-semibold mb-4">Active Borrows</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : activeBorrows.length === 0 ? (
          <p className="text-gray-500 text-sm">No active borrows</p>
        ) : (
          <div className="space-y-3">
            {activeBorrows.map((borrow) => (
              <motion.div
                key={borrow.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/80 rounded-xl border border-gray-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                    <p className="text-gray-500 text-xs mt-1">{borrow.assets?.serial_number || ""}</p>
                    <p className="text-gray-400 text-sm mt-2">{borrow.notes || "—"}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(borrow.borrowed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleReturn(borrow)}
                    className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all shrink-0 ml-2"
                  >
                    Return
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Return History */}
      {returnedBorrows.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-4">Return History</h2>
          <div className="space-y-3">
            {returnedBorrows.map((borrow) => (
              <div key={borrow.id} className="bg-gray-900/80 rounded-xl border border-gray-800 p-4">
                <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                <p className="text-gray-500 text-xs mt-1">{borrow.assets?.serial_number || ""}</p>
                <p className="text-gray-400 text-sm mt-2">{borrow.notes || "—"}</p>
                <div className="flex gap-4 mt-2">
                  <p className="text-gray-500 text-xs">
                    Borrowed: {new Date(borrow.borrowed_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Returned: {new Date(borrow.returned_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}