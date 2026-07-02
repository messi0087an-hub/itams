import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

const C = {
  accent: "#06b6d4", teal: "#14b8a6",
  card: "rgba(6,182,212,0.06)", border: "rgba(6,182,212,0.18)",
  text: "#ffffff", sub: "#94a3b8",
  success: "#10b981", warning: "#f59e0b", error: "#ef4444",
}

const inputStyle = {
  width: "100%", background: "rgba(6,182,212,0.06)", color: "#fff",
  border: "1px solid rgba(6,182,212,0.2)", borderRadius: "8px",
  padding: "9px 12px", fontSize: "13px", outline: "none", boxSizing: "border-box",
}

function Field({ label, children }) {
  return (
    <div>
      <p style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "5px", fontWeight: "600" }}>{label}</p>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = {
    pending: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" },
    approved: { bg: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" },
    rejected: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" },
  }[status] || {}
  return <span style={{ ...cfg, borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600", textTransform: "capitalize" }}>{status}</span>
}

export default function MarketingApprovals() {
  const { userProfile, canManageMarketing, role } = useAuth()
  const [tab, setTab] = useState("pending")
  const [approvals, setApprovals] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [form, setForm] = useState({ item_id: "", quantity: "", reason: "", request_type: "stock_request" })

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 7000)
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from("marketing_approvals").select("*").eq("status", "pending").order("created_at"),
      supabase.from("marketing_approvals").select("*").eq("requested_by", userProfile?.id).order("created_at", { ascending: false }),
    ])
    const { data: itemList } = await supabase.from("marketing_items").select("id, name").order("name")
    setApprovals(all || [])
    setMyRequests(mine || [])
    setItems(itemList || [])
    setLoading(false)
  }

  const daysSince = (dateStr) => Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60 * 24))

  const handleApprove = async (id) => {
    setSaving(true)
    const { error } = await supabase.from("marketing_approvals").update({
      status: "approved",
      approver_id: userProfile.id,
      approver_name: userProfile?.name || userProfile?.email,
      approved_at: new Date().toISOString(),
    }).eq("id", id)
    if (error) {
      setSaving(false)
      showSuccess(`❌ Could not approve: ${error.message}`)
      return
    }
    const approval = approvals.find(a => a.id === id)
    if (approval?.requested_by) {
      await supabase.from("marketing_notifications").insert({
        user_id: approval.requested_by,
        title: "Request Approved ✅",
        message: `Your request for ${items.find(i => i.id === approval.item_id)?.name || "item"} has been approved.`,
        type: "approved",
        related_id: id,
        related_type: "approval",
      })
    }
    setSaving(false)
    showSuccess("✅ Request approved!")
    fetchAll()
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    setSaving(true)
    const { error } = await supabase.from("marketing_approvals").update({
      status: "rejected",
      approver_id: userProfile.id,
      approver_name: userProfile?.name || userProfile?.email,
      rejection_reason: rejectReason,
    }).eq("id", rejectModal.id)
    if (error) {
      setSaving(false)
      setSaveError(`Could not reject: ${error.message}`)
      return
    }
    if (rejectModal.requested_by) {
      await supabase.from("marketing_notifications").insert({
        user_id: rejectModal.requested_by,
        title: "Request Rejected ❌",
        message: `Your request was rejected. Reason: ${rejectReason}`,
        type: "rejected",
        related_id: rejectModal.id,
        related_type: "approval",
      })
    }
    setSaving(false)
    setRejectModal(null)
    setRejectReason("")
    setSaveError(null)
    showSuccess("Request rejected.")
    fetchAll()
  }

  const handleSubmitRequest = async () => {
    if (!form.item_id || !form.quantity || !form.reason) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from("marketing_approvals").insert({
      request_type: form.request_type,
      requested_by: userProfile.id,
      requested_by_name: userProfile?.name || userProfile?.email,
      item_id: form.item_id,
      quantity: parseInt(form.quantity),
      reason: form.reason,
      status: "pending",
    })
    if (error) {
      setSaving(false)
      setSaveError(`Could not submit request: ${error.message}`)
      return
    }
    setSaving(false)
    setShowRequestModal(false)
    setSaveError(null)
    setForm({ item_id: "", quantity: "", reason: "", request_type: "stock_request" })
    showSuccess("✅ Request submitted successfully!")
    fetchAll()
    setTab("my")
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: "fixed", top: "72px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#10b981", color: "#fff", padding: "12px 24px", borderRadius: "12px", fontWeight: "600", fontSize: "14px", boxShadow: "0 4px 20px rgba(16,185,129,0.4)", whiteSpace: "nowrap" }}
          >
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: C.text, fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>✅ Approvals</h1>
          <p style={{ color: C.sub, fontSize: "13px" }}>{approvals.length} pending requests</p>
        </div>
        <button onClick={() => { setShowRequestModal(true); setSaveError(null) }} style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
          + New Request
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px" }}>
        {[["pending", `⏳ Pending (${approvals.length})`], ["my", "📋 My Requests"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 18px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px",
            background: tab === t ? `linear-gradient(135deg, ${C.accent}, ${C.teal})` : "rgba(6,182,212,0.08)",
            color: tab === t ? "#fff" : C.sub,
          }}>{label}</button>
        ))}
      </div>

      {/* Pending */}
      {tab === "pending" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {!canManageMarketing && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", padding: "12px 16px", color: C.warning, fontSize: "13px" }}>
              ⚠️ Only marketing admins and managers can approve requests.
            </div>
          )}
          {approvals.map(req => {
            const days = daysSince(req.created_at)
            const isUrgent = days >= 3
            return (
              <motion.div
                key={req.id}
                whileHover={{ scale: 1.005 }}
                style={{ background: C.card, border: `1px solid ${isUrgent ? "rgba(239,68,68,0.3)" : C.border}`, borderRadius: "14px", padding: "18px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <p style={{ color: C.text, fontWeight: "600", fontSize: "14px" }}>{req.requested_by_name || "Unknown"}</p>
                      {isUrgent && <span style={{ background: "rgba(239,68,68,0.15)", color: C.error, border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "1px 7px", fontSize: "10px", fontWeight: "700" }}>⏰ {days}d waiting</span>}
                    </div>
                    <p style={{ color: C.sub, fontSize: "13px" }}>
                      Requesting: <b style={{ color: C.text }}>{items.find(i => i.id === req.item_id)?.name || "Unknown item"}</b> × {req.quantity}
                    </p>
                    {req.quantity > 30 && <p style={{ color: C.warning, fontSize: "11px", marginTop: "2px" }}>⚠️ Large quantity — requires senior approval (April)</p>}
                    {req.reason && <p style={{ color: C.sub, fontSize: "12px", marginTop: "4px", fontStyle: "italic" }}>Reason: {req.reason}</p>}
                    <p style={{ color: C.sub, fontSize: "11px", marginTop: "4px" }}>
                      Submitted: {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {canManageMarketing && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleApprove(req.id)} disabled={saving}
                        style={{ background: "rgba(16,185,129,0.15)", color: C.success, border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                        ✅ Approve
                      </button>
                      <button onClick={() => { setRejectModal(req); setRejectReason(""); setSaveError(null) }}
                        style={{ background: "rgba(239,68,68,0.12)", color: C.error, border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
          {approvals.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px", color: C.sub }}>
              <p style={{ fontSize: "40px", marginBottom: "12px" }}>✅</p>
              <p>No pending requests</p>
            </div>
          )}
        </div>
      )}

      {/* My Requests */}
      {tab === "my" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {myRequests.map(req => (
            <div key={req.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ color: C.text, fontSize: "14px", fontWeight: "600" }}>
                    {items.find(i => i.id === req.item_id)?.name || "Item"} × {req.quantity}
                  </p>
                  {req.reason && <p style={{ color: C.sub, fontSize: "12px", marginTop: "2px" }}>Reason: {req.reason}</p>}
                  {req.rejection_reason && <p style={{ color: C.error, fontSize: "12px", marginTop: "2px" }}>Rejected: {req.rejection_reason}</p>}
                  <p style={{ color: C.sub, fontSize: "11px", marginTop: "4px" }}>{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            </div>
          ))}
          {myRequests.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: C.sub }}>No requests submitted yet</div>
          )}
        </div>
      )}

      {/* New Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
            onClick={e => e.target === e.currentTarget && setShowRequestModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{ background: "#0f2730", border: `1px solid ${C.border}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <h2 style={{ color: C.text, fontSize: "17px", fontWeight: "700" }}>New Request</h2>
                <button onClick={() => { setShowRequestModal(false); setSaveError(null) }} style={{ color: C.sub, background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {saveError && (
                  <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", color: C.error, fontSize: "13px" }}>
                    {saveError}
                  </div>
                )}
                <Field label="Request Type">
                  <select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })} style={inputStyle}>
                    <option value="stock_request">Stock Request</option>
                    <option value="restock">Restock Request</option>
                    <option value="purchase">Purchase Approval</option>
                  </select>
                </Field>
                <Field label="Item *">
                  <select value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} required style={inputStyle}>
                    <option value="">Select item</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </Field>
                <Field label="Quantity *">
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
                </Field>
                {form.quantity && parseInt(form.quantity) > 30 && (
                  <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "8px", padding: "10px 12px", color: C.warning, fontSize: "12px" }}>
                    ⚠️ Quantities above 30 require approval from April.
                  </div>
                )}
                <Field label="Reason *">
                  <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Why do you need this?" style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => { setShowRequestModal(false); setSaveError(null) }} style={{ flex: 1, background: "rgba(148,163,184,0.1)", color: C.sub, border: "none", borderRadius: "10px", padding: "10px", cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSubmitRequest} disabled={saving || !form.item_id || !form.quantity || !form.reason} style={{ flex: 2, background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "10px", padding: "10px", fontWeight: "600", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Submitting..." : "Submit Request"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              style={{ background: "#0f2730", border: `1px solid rgba(239,68,68,0.3)`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px" }}>
              <h2 style={{ color: C.text, fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Reject Request</h2>
              {saveError && (
                <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", color: C.error, fontSize: "13px", marginBottom: "12px" }}>
                  {saveError}
                </div>
              )}
              <Field label="Rejection Reason *">
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Explain why this request is rejected..." style={{ ...inputStyle, resize: "vertical" }} />
              </Field>
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button onClick={() => { setRejectModal(null); setSaveError(null) }} style={{ flex: 1, background: "rgba(148,163,184,0.1)", color: C.sub, border: "none", borderRadius: "10px", padding: "10px", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleReject} disabled={!rejectReason.trim() || saving} style={{ flex: 2, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", borderRadius: "10px", padding: "10px", fontWeight: "600", cursor: "pointer", opacity: saving || !rejectReason.trim() ? 0.6 : 1 }}>Reject</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
