import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion } from "framer-motion"

const C = {
  accent: "#06b6d4", teal: "#14b8a6",
  card: "rgba(6,182,212,0.06)", border: "rgba(6,182,212,0.18)",
  text: "#ffffff", sub: "#94a3b8",
  success: "#10b981", warning: "#f59e0b", error: "#ef4444",
}

const TYPE_ICONS = {
  stock_in: { icon: "📥", color: "#10b981", label: "Stock In" },
  stock_out: { icon: "📤", color: "#ef4444", label: "Stock Out" },
  class_gift: { icon: "🎁", color: "#a78bfa", label: "Class Gift" },
  event_collateral: { icon: "🎪", color: "#f59e0b", label: "Event Collateral" },
  approval: { icon: "✅", color: "#06b6d4", label: "Approval" },
  stocktake: { icon: "🔢", color: "#14b8a6", label: "Stocktake" },
}

export default function MarketingHistory() {
  const { userProfile, canManageMarketing } = useAuth()
  const [movements, setMovements] = useState([])
  const [approvals, setApprovals] = useState([])
  const [stocktakes, setStocktakes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("All")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [activeTab, setActiveTab] = useState("movements")

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const userId = userProfile?.id
    const isAdmin = canManageMarketing

    const movQ = supabase
      .from("marketing_stock_movements")
      .select("*, marketing_items(name)")
      .order("created_at", { ascending: false })
      .limit(200)
    if (!isAdmin) movQ.eq("performed_by", userId)

    const appQ = supabase
      .from("marketing_approvals")
      .select("*, marketing_items(name)")
      .order("created_at", { ascending: false })
      .limit(100)
    if (!isAdmin) appQ.eq("requested_by", userId)

    const stQ = supabase
      .from("marketing_stocktake")
      .select("*, marketing_items(name)")
      .order("created_at", { ascending: false })
      .limit(100)
    if (!isAdmin) stQ.eq("performed_by", userId)

    const [{ data: m }, { data: a }, { data: s }] = await Promise.all([movQ, appQ, stQ])
    setMovements(m || [])
    setApprovals(a || [])
    setStocktakes(s || [])
    setLoading(false)
  }

  const filtered = (list) => {
    return list.filter(item => {
      const date = new Date(item.created_at)
      if (filterFrom && date < new Date(filterFrom)) return false
      if (filterTo && date > new Date(filterTo + "T23:59:59")) return false
      return true
    })
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: C.text, fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>📜 History</h1>
        <p style={{ color: C.sub, fontSize: "13px" }}>
          {canManageMarketing ? "Full audit trail — all users" : "Your activity only"}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[["movements", "📊 Stock Movements"], ["approvals", "✅ Approvals"], ["stocktake", "🔢 Stocktake"]].map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px",
            background: activeTab === t ? `linear-gradient(135deg, ${C.accent}, ${C.teal})` : "rgba(6,182,212,0.08)",
            color: activeTab === t ? "#fff" : C.sub,
          }}>{label}</button>
        ))}
      </div>

      {/* Date filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From date"
          style={{ background: "rgba(6,182,212,0.06)", color: C.text, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To date"
          style={{ background: "rgba(6,182,212,0.06)", color: C.text, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
        {(filterFrom || filterTo) && (
          <button onClick={() => { setFilterFrom(""); setFilterTo("") }}
            style={{ background: "rgba(239,68,68,0.1)", color: C.error, border: "none", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", cursor: "pointer" }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? <p style={{ color: C.sub }}>Loading...</p> : (
        <>
          {/* Movements */}
          {activeTab === "movements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered(movements).map(m => (
                <motion.div key={m.id} whileHover={{ scale: 1.002 }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>{m.movement_type === "stock_in" ? "📥" : "📤"}</span>
                      <div>
                        <p style={{ color: C.text, fontSize: "13px", fontWeight: "600" }}>
                          {m.marketing_items?.name || "Unknown"}{" · "}
                          <span style={{ color: m.movement_type === "stock_in" ? C.success : C.error }}>
                            {m.movement_type === "stock_in" ? "+" : "-"}{m.quantity} units
                          </span>
                        </p>
                        <p style={{ color: C.sub, fontSize: "11px", marginTop: "2px" }}>
                          {m.movement_type === "stock_in" ? "Stock In" : "Stock Out"}
                          {m.reason ? ` · ${m.reason}` : ""}
                          {m.performed_by_name ? ` · by ${m.performed_by_name}` : ""}
                        </p>
                        {m.notes && <p style={{ color: C.sub, fontSize: "11px", fontStyle: "italic" }}>{m.notes}</p>}
                      </div>
                    </div>
                    <p style={{ color: C.sub, fontSize: "11px" }}>{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
              {filtered(movements).length === 0 && <EmptyState text="No stock movements found" />}
            </div>
          )}

          {/* Approvals */}
          {activeTab === "approvals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered(approvals).map(a => (
                <div key={a.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <p style={{ color: C.text, fontSize: "13px", fontWeight: "600" }}>
                        {a.requested_by_name} requested {a.marketing_items?.name} × {a.quantity}
                      </p>
                      {a.reason && <p style={{ color: C.sub, fontSize: "11px" }}>Reason: {a.reason}</p>}
                      {a.rejection_reason && <p style={{ color: C.error, fontSize: "11px" }}>Rejected: {a.rejection_reason}</p>}
                      {a.approver_name && <p style={{ color: C.sub, fontSize: "11px" }}>By: {a.approver_name}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{
                        background: a.status === "approved" ? "rgba(16,185,129,0.15)" : a.status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.15)",
                        color: a.status === "approved" ? C.success : a.status === "rejected" ? C.error : C.warning,
                        borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600",
                      }}>{a.status}</span>
                      <p style={{ color: C.sub, fontSize: "11px" }}>{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filtered(approvals).length === 0 && <EmptyState text="No approvals found" />}
            </div>
          )}

          {/* Stocktake */}
          {activeTab === "stocktake" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered(stocktakes).map(s => (
                <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <p style={{ color: C.text, fontSize: "13px", fontWeight: "600" }}>{s.marketing_items?.name}</p>
                      <p style={{ color: C.sub, fontSize: "12px" }}>
                        System: {s.system_quantity} · Actual: {s.actual_quantity} ·{" "}
                        <span style={{ color: s.discrepancy !== 0 ? C.error : C.success }}>
                          Discrepancy: {s.discrepancy >= 0 ? "+" : ""}{s.discrepancy}
                        </span>
                      </p>
                      {s.notes && <p style={{ color: C.sub, fontSize: "11px", fontStyle: "italic" }}>{s.notes}</p>}
                      {s.performed_by_name && <p style={{ color: C.sub, fontSize: "11px" }}>by {s.performed_by_name}</p>}
                    </div>
                    <p style={{ color: C.sub, fontSize: "11px" }}>{s.stocktake_date}</p>
                  </div>
                </div>
              ))}
              {filtered(stocktakes).length === 0 && <EmptyState text="No stocktake records found" />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px", color: "#64748b", background: "rgba(6,182,212,0.04)", border: "1px dashed rgba(6,182,212,0.2)", borderRadius: "12px" }}>
      {text}
    </div>
  )
}
