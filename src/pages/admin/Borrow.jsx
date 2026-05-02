import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Borrow() {
  const [borrows, setBorrows] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      setShowForm(false)
      setForm({ asset_id: "", borrower_name: "", borrower_email: "", notes: "" })
      fetchBorrows()
      fetchAssets()
    } else {
      alert(error.message)
    }
  }

  const handleReturn = async (borrow) => {
    if (!confirm("Confirm return of asset?")) return
    await supabase.from("borrow_history").update({
      returned_at: new Date().toISOString()
    }).eq("id", borrow.id)
    await supabase.from("assets").update({
      status: "available",
      assigned_user: null
    }).eq("id", borrow.asset_id)
    fetchBorrows()
    fetchAssets()
  }

  const activeBorrows = borrows.filter(b => !b.returned_at)
  const returnedBorrows = borrows.filter(b => b.returned_at)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Borrow / Return</h1>
          <p className="text-gray-400 mt-1 text-sm">{activeBorrows.length} active borrows</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all text-sm"
        >
          + Borrow
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleBorrow} className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
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
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm">
              Confirm Borrow
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active Borrows — Cards on mobile */}
      <div className="mb-6">
        <h2 className="text-white font-semibold mb-4">Active Borrows</h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : activeBorrows.length === 0 ? (
          <p className="text-gray-500 text-sm">No active borrows</p>
        ) : (
          <div className="space-y-3">
            {activeBorrows.map((borrow) => (
              <div key={borrow.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                    <p className="text-gray-500 text-xs mt-1">{borrow.assets?.serial_number || ""}</p>
                    <p className="text-gray-400 text-sm mt-2">{borrow.notes || "—"}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(borrow.borrowed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReturn(borrow)}
                    className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all shrink-0 ml-2"
                  >
                    Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return History — Cards on mobile */}
      {returnedBorrows.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-4">Return History</h2>
          <div className="space-y-3">
            {returnedBorrows.map((borrow) => (
              <div key={borrow.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
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