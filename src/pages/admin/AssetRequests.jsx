import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { EmptyState, LoadingSkeleton } from "../../components/EmptyState"
import { sendAssetRequestNotification } from "../../lib/emailService"

const PRIORITY_STYLES = {
  low:    { pill: "bg-gray-500/20 text-gray-400 border-gray-500/30",    label: "Low" },
  medium: { pill: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Medium" },
  high:   { pill: "bg-red-500/20 text-red-400 border-red-500/30",       label: "High" },
}

const STATUS_STYLES = {
  pending:  { pill: "bg-blue-500/20 text-blue-400 border-blue-500/30",   label: "Pending",  emoji: "⏳" },
  approved: { pill: "bg-green-500/20 text-green-400 border-green-500/30", label: "Approved", emoji: "✅" },
  rejected: { pill: "bg-red-500/20 text-red-400 border-red-500/30",      label: "Rejected", emoji: "❌" },
}

export default function AssetRequests() {
  const { userProfile, isAdmin, canEdit } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [actionModal, setActionModal] = useState(null) // { request, type: "approve"|"reject" }
  const [actionReason, setActionReason] = useState("")
  const [actioning, setActioning] = useState(false)
  const [tab, setTab] = useState("all") // all | pending | mine
  const [form, setForm] = useState({ asset_type: "", reason: "", priority: "medium", notes: "" })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("asset_requests")
      .select("*")
      .order("created_at", { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from("asset_requests").insert([{
      asset_type: form.asset_type,
      reason: form.reason,
      priority: form.priority,
      notes: form.notes || null,
      status: "pending",
      requested_by: userProfile?.name || userProfile?.email || "Unknown",
      requested_by_email: userProfile?.email || null,
    }])
    if (!error) {
      setForm({ asset_type: "", reason: "", priority: "medium", notes: "" })
      setShowForm(false)
      setSubmitSuccess(true)
      // Fire-and-forget email to approving officer
      sendAssetRequestNotification({
        requestedBy: userProfile?.name || userProfile?.email || "Unknown",
        assetType: form.asset_type,
        reason: form.reason,
        priority: form.priority,
        createdAt: new Date().toISOString(),
      })
      setTimeout(() => { setSubmitSuccess(false); fetchRequests() }, 2500)
    } else {
      alert(error.message)
    }
  }

  const handleAction = async () => {
    if (!actionModal) return
    setActioning(true)
    const { error } = await supabase
      .from("asset_requests")
      .update({
        status: actionModal.type === "approve" ? "approved" : "rejected",
        admin_response: actionReason || null,
        actioned_at: new Date().toISOString(),
        actioned_by: userProfile?.name || userProfile?.email,
      })
      .eq("id", actionModal.request.id)

    if (!error) {
      setActionModal(null)
      setActionReason("")
      fetchRequests()
    } else {
      alert(error.message)
    }
    setActioning(false)
  }

  const filtered = requests.filter(r => {
    if (tab === "pending") return r.status === "pending"
    if (tab === "mine") return r.requested_by_email === userProfile?.email
    return true
  })

  const pendingCount = requests.filter(r => r.status === "pending").length

  return (
    <div className="p-4 md:p-8">

      {/* Submit success animation */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 200 }}
              className="text-center">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 bg-blue-500/20 border-2 border-blue-500/50 rounded-full mb-4"
                style={{ boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}>
                <span className="text-5xl">📋</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Request Submitted!</h2>
              <p className="text-gray-400">Your request has been sent to the admin</p>
              <div className="mt-4 w-48 mx-auto h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "linear" }} className="h-full bg-blue-500 rounded-full" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Approve / Reject modal */}
      <AnimatePresence>
        {actionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 200 }}
              className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm shadow-2xl">
              <div className="text-center mb-5">
                <span className="text-4xl">{actionModal.type === "approve" ? "✅" : "❌"}</span>
                <h3 className="text-white font-bold text-lg mt-3">
                  {actionModal.type === "approve" ? "Approve Request?" : "Reject Request?"}
                </h3>
                <p className="text-gray-400 text-sm mt-1">{actionModal.request.asset_type}</p>
              </div>
              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">
                  {actionModal.type === "approve" ? "Approval note" : "Reason for rejection"}{" "}
                  <span className="text-gray-600">(optional)</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  rows={3}
                  placeholder={actionModal.type === "approve" ? "e.g. Approved, item ordered" : "e.g. Budget not available this quarter"}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setActionModal(null); setActionReason("") }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-all">
                  Cancel
                </button>
                <button onClick={handleAction} disabled={actioning}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    actionModal.type === "approve"
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}>
                  {actioning ? "..." : actionModal.type === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Asset Requests</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {pendingCount > 0
              ? <span className="text-yellow-400">{pendingCount} pending review</span>
              : "All requests up to date"}
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + New Request
        </motion.button>
      </div>

      {/* New Request Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} onSubmit={handleSubmit}
            className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-6">
            <h2 className="text-white font-semibold mb-4">New Asset Request</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-gray-400 text-sm mb-2 block">Asset Type / Name *</label>
                <input type="text" value={form.asset_type}
                  onChange={e => setForm({ ...form, asset_type: e.target.value })}
                  placeholder="e.g. MacBook Pro 14-inch, Standing Desk, USB-C Hub"
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-gray-400 text-sm mb-2 block">Reason *</label>
                <textarea value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Why do you need this asset?"
                  required rows={2}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Additional Notes <span className="text-gray-600">(optional)</span></label>
                <input type="text" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Needed by end of month"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                Submit Request
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
          { key: "mine", label: "My Requests" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <LoadingSkeleton rows={3} cols={2} />
      ) : filtered.length === 0 ? (
        <EmptyState preset="requests" />
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const status = STATUS_STYLES[req.status] || STATUS_STYLES.pending
            const priority = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.medium
            const isOwn = req.requested_by_email === userProfile?.email
            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-gray-900/80 rounded-xl border p-4 ${
                  req.status === "pending" ? "border-gray-800" :
                  req.status === "approved" ? "border-green-500/20" : "border-red-500/20"
                }`}>

                {/* Notification banner for own request that got actioned */}
                {isOwn && req.status !== "pending" && (
                  <div className={`mb-3 rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${
                    req.status === "approved"
                      ? "bg-green-500/10 border border-green-500/30 text-green-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}>
                    <span>{status.emoji}</span>
                    <span className="font-medium">
                      Your request was {req.status}
                      {req.admin_response ? `: "${req.admin_response}"` : "."}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-white font-medium">{req.asset_type}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priority.pill}`}>
                        {priority.label}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.pill}`}>
                        {status.emoji} {status.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{req.reason}</p>
                    {req.notes && <p className="text-gray-500 text-xs mt-1">{req.notes}</p>}
                    <div className="flex flex-wrap gap-3 mt-2">
                      <p className="text-gray-600 text-xs">By {req.requested_by}</p>
                      <p className="text-gray-600 text-xs">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                      {req.actioned_by && (
                        <p className="text-gray-600 text-xs">
                          {req.status === "approved" ? "Approved" : "Rejected"} by {req.actioned_by}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Admin actions — only on pending requests */}
                  {isAdmin && req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setActionModal({ request: req, type: "approve" })}
                        className="text-green-400 hover:text-green-300 text-sm px-3 py-1 rounded border border-green-400/30 transition-all">
                        Approve
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setActionModal({ request: req, type: "reject" })}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded border border-red-400/30 transition-all">
                        Reject
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
