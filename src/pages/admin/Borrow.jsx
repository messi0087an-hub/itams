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
    
    // Add borrow record
    const { error } = await supabase.from("borrow_history").insert([{
      asset_id: form.asset_id,
      borrowed_at: new Date().toISOString(),
      notes: `Borrowed by ${form.borrower_name}${form.borrower_email ? ` (${form.borrower_email})` : ""}${form.notes ? ` - ${form.notes}` : ""}`
    }])

    if (!error) {
      // Update asset status to assigned
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
    if (!confirm(`Confirm return of asset?`)) return

    // Update borrow record
    await supabase.from("borrow_history").update({
      returned_at: new Date().toISOString()
    }).eq("id", borrow.id)

    // Update asset status back to available
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Borrow / Return</h1>
          <p className="text-gray-400 mt-1">{activeBorrows.length} active borrows</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          + Borrow Asset
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleBorrow} className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Borrow an Asset</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Active Borrows */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Active Borrows</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Asset</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Borrowed By</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Date</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-12">Loading...</td></tr>
            ) : activeBorrows.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-gray-500 py-12">No active borrows</td></tr>
            ) : (
              activeBorrows.map((borrow) => (
                <tr key={borrow.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                    <p className="text-gray-500 text-xs">{borrow.assets?.serial_number || ""}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{borrow.notes || "—"}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(borrow.borrowed_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleReturn(borrow)}
                      className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all"
                    >
                      Return
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Return History */}
      {returnedBorrows.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Return History</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Asset</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Borrowed By</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Borrowed</th>
                <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Returned</th>
              </tr>
            </thead>
            <tbody>
              {returnedBorrows.map((borrow) => (
                <tr key={borrow.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{borrow.assets?.name || "—"}</p>
                    <p className="text-gray-500 text-xs">{borrow.assets?.serial_number || ""}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{borrow.notes || "—"}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(borrow.borrowed_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(borrow.returned_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}