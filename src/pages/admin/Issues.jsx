import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

export default function Issues() {
  const [issues, setIssues] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [resolveSuccess, setResolveSuccess] = useState(false)
  const [form, setForm] = useState({
    asset_id: "", issue_type: "", description: ""
  })

  useEffect(() => {
    fetchIssues()
    fetchAssets()
  }, [])

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select("*, assets(name, serial_number)")
      .order("created_at", { ascending: false })
    setIssues(data || [])
    setLoading(false)
  }

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("assets")
      .select("id, name, serial_number")
      .order("name")
    setAssets(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from("issues").insert([{
      asset_id: form.asset_id,
      issue_type: form.issue_type,
      description: form.description,
      status: "open"
    }])
    if (!error) {
      setShowForm(false)
      setForm({ asset_id: "", issue_type: "", description: "" })
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        fetchIssues()
      }, 2500)
    } else {
      alert(error.message)
    }
  }

  const handleResolve = async (id) => {
    await supabase.from("issues").update({
      status: "resolved",
      resolved_at: new Date().toISOString()
    }).eq("id", id)
    setResolveSuccess(true)
    setTimeout(() => {
      setResolveSuccess(false)
      fetchIssues()
    }, 2500)
  }

  const statusColor = {
    open: "bg-red-500/20 text-red-400",
    "in-progress": "bg-yellow-500/20 text-yellow-400",
    resolved: "bg-green-500/20 text-green-400",
  }

  return (
    <div className="p-4 md:p-8">

      {/* Submit Issue Success */}
      <AnimatePresence>
        {submitSuccess && (
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
              className="text-center px-8"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-orange-500/20 border-2 border-orange-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(249, 115, 22, 0.4)" }}
              >
                <span className="text-5xl">⚠️</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Issue Reported!</h2>
              <p className="text-gray-400">Your issue has been submitted successfully</p>
              <div className="mt-4 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="h-full bg-orange-500 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolve Issue Success */}
      <AnimatePresence>
        {resolveSuccess && (
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
              className="text-center px-8"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 border-2 border-green-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(34, 197, 94, 0.4)" }}
              >
                <span className="text-5xl">✅</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Issue Resolved!</h2>
              <p className="text-gray-400">The issue has been marked as resolved</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-white">Issues</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {issues.filter(i => i.status === "open").length} open issues
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium"
        >
          + Report
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 mb-6"
          >
            <h2 className="text-white font-semibold mb-4">Report New Issue</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Asset</label>
                <select
                  value={form.asset_id}
                  onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Select asset...</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.serial_number ? `(${a.serial_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Issue Type</label>
                <select
                  value={form.issue_type}
                  onChange={(e) => setForm({ ...form, issue_type: e.target.value })}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Select type...</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="network">Network</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue..."
                  rows={3}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm resize-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Submit Issue
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : issues.length === 0 ? (
          <p className="text-gray-500 text-sm">No issues reported</p>
        ) : (
          issues.map((issue) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/80 rounded-xl border border-gray-800 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-white font-medium">{issue.assets?.name || "—"}</p>
                  <p className="text-gray-500 text-xs">{issue.assets?.serial_number || ""}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${statusColor[issue.status] || "bg-gray-500/20 text-gray-400"}`}>
                  {issue.status}
                </span>
              </div>
              <p className="text-gray-400 text-sm capitalize mb-1">{issue.issue_type}</p>
              <p className="text-gray-400 text-sm mb-3">{issue.description}</p>
              {issue.status === "open" && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleResolve(issue.id)}
                  className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all"
                >
                  Resolve
                </motion.button>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-gray-900/80 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Asset</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Type</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Description</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Status</th>
              <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">Loading...</td></tr>
            ) : issues.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">No issues reported</td></tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-all">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{issue.assets?.name || "—"}</p>
                    <p className="text-gray-500 text-xs">{issue.assets?.serial_number || ""}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm capitalize">{issue.issue_type}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm max-w-xs truncate">{issue.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[issue.status] || "bg-gray-500/20 text-gray-400"}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {issue.status === "open" && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleResolve(issue.id)}
                        className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all"
                      >
                        Resolve
                      </motion.button>
                    )}
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