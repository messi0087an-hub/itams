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

export default function MarketingSettings() {
  const { canManageMarketing } = useAuth()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  const [approvalThreshold, setApprovalThreshold] = useState(30)
  const [tab, setTab] = useState("locations")

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase.from("marketing_locations").select("*").order("name")
    setLocations(data || [])
    setLoading(false)
  }

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return
    setSaving(true)
    await supabase.from("marketing_locations").insert({ name: newLocation.trim() })
    setNewLocation("")
    setSaving(false)
    fetchAll()
  }

  const handleDeleteLocation = async (id) => {
    if (!window.confirm("Delete this location? This may affect stock records.")) return
    await supabase.from("marketing_locations").delete().eq("id", id)
    fetchAll()
  }

  if (!canManageMarketing) {
    return (
      <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</p>
          <p style={{ color: C.text, fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Access Restricted</p>
          <p style={{ color: C.sub }}>Only Marketing Admins and Managers can access settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: C.text, fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>⚙️ Marketing Settings</h1>
        <p style={{ color: C.sub, fontSize: "13px" }}>Configure approval thresholds, locations, and more</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[["locations", "📍 Storage Locations"], ["approvals", "✅ Approval Settings"], ["export", "📤 Export Data"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 18px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px",
            background: tab === t ? `linear-gradient(135deg, ${C.accent}, ${C.teal})` : "rgba(6,182,212,0.08)",
            color: tab === t ? "#fff" : C.sub,
          }}>{label}</button>
        ))}
      </div>

      {/* Locations tab */}
      {tab === "locations" && (
        <div style={{ maxWidth: "600px" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
            <p style={{ color: C.text, fontWeight: "600", fontSize: "15px", marginBottom: "16px" }}>Add New Location</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Location name..."
                onKeyDown={e => e.key === "Enter" && handleAddLocation()}
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleAddLocation} disabled={saving || !newLocation.trim()}
                style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "8px", padding: "9px 18px", fontWeight: "600", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>
                Add Location
              </button>
            </div>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px" }}>
            <p style={{ color: C.text, fontWeight: "600", fontSize: "15px", marginBottom: "16px" }}>Storage Locations ({locations.length})</p>
            {loading ? <p style={{ color: C.sub }}>Loading...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {locations.map(loc => (
                  <div key={loc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(6,182,212,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "16px" }}>📍</span>
                      <div>
                        <p style={{ color: C.text, fontSize: "13px", fontWeight: "500" }}>{loc.name}</p>
                        {loc.description && <p style={{ color: C.sub, fontSize: "11px" }}>{loc.description}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteLocation(loc.id)}
                      style={{ background: "rgba(239,68,68,0.1)", color: C.error, border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                ))}
                {locations.length === 0 && <p style={{ color: C.sub, textAlign: "center", padding: "20px" }}>No locations yet</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval settings tab */}
      {tab === "approvals" && (
        <div style={{ maxWidth: "500px" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
            <p style={{ color: C.text, fontWeight: "600", fontSize: "15px", marginBottom: "20px" }}>Approval Thresholds</p>

            <Field label="Small Quantity Threshold (items ≤ this need Vivian or Siti)">
              <input type="number" min={1} value={approvalThreshold} onChange={e => setApprovalThreshold(parseInt(e.target.value))}
                style={inputStyle} />
            </Field>

            <div style={{ background: "rgba(6,182,212,0.04)", border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px", marginTop: "16px" }}>
              <p style={{ color: C.accent, fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>Approval Matrix</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.sub, fontSize: "12px" }}>Qty ≤ {approvalThreshold} items</span>
                  <span style={{ color: C.text, fontSize: "12px", fontWeight: "600" }}>Vivian or Siti</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.sub, fontSize: "12px" }}>Qty &gt; {approvalThreshold} items</span>
                  <span style={{ color: C.warning, fontSize: "12px", fontWeight: "600" }}>April (senior approval)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <p style={{ color: C.sub, fontSize: "12px", marginBottom: "8px" }}>Auto-reminder: Pending requests older than 3 days trigger a reminder notification to the approver.</p>
            </div>
          </div>
        </div>
      )}

      {/* Export tab */}
      {tab === "export" && (
        <div style={{ maxWidth: "500px" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "24px" }}>
            <p style={{ color: C.text, fontWeight: "600", fontSize: "15px", marginBottom: "20px" }}>Export All Marketing Data</p>
            <p style={{ color: C.sub, fontSize: "13px", marginBottom: "20px" }}>
              Export all data from the marketing module as CSV files. This includes items, stock, movements, classes, events, and approvals.
            </p>

            {[
              { label: "All Items", table: "marketing_items", icon: "📦" },
              { label: "Stock Levels", table: "marketing_stock", icon: "📊" },
              { label: "Stock Movements", table: "marketing_stock_movements", icon: "🔄" },
              { label: "Classes", table: "marketing_classes", icon: "🎁" },
              { label: "Events", table: "marketing_events", icon: "🎪" },
              { label: "Approvals", table: "marketing_approvals", icon: "✅" },
            ].map(({ label, table, icon }) => (
              <div key={table} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(6,182,212,0.08)` }}>
                <span style={{ color: C.text, fontSize: "13px" }}>{icon} {label}</span>
                <button
                  onClick={async () => {
                    const { data } = await supabase.from(table).select("*")
                    if (!data?.length) return
                    const headers = Object.keys(data[0])
                    const csv = [headers.join(","), ...data.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(","))].join("\n")
                    const blob = new Blob([csv], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a"); a.href = url; a.download = `${table}_export.csv`; a.click()
                  }}
                  style={{ background: "rgba(6,182,212,0.12)", color: C.accent, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 14px", fontSize: "12px", cursor: "pointer" }}>
                  Export CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
