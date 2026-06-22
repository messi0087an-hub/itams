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

const ALL_REPORTS = [
  { id: "monthly_stock", label: "Monthly Stock Balance", icon: "📊", adminOnly: false },
  { id: "class_distribution", label: "Items Distributed Per Class", icon: "🎁", adminOnly: false },
  { id: "event_distribution", label: "Items Distributed Per Event", icon: "🎪", adminOnly: false },
  { id: "budget_actual", label: "Budget vs Actual", icon: "💰", adminOnly: true },
  { id: "low_stock", label: "Low Stock Alert Report", icon: "⚠️", adminOnly: false },
  { id: "supplier_history", label: "Supplier Purchase History", icon: "🏭", adminOnly: true },
  { id: "defective", label: "Defective Items Report", icon: "🔴", adminOnly: false },
  { id: "movement_history", label: "Full Stock Movement History", icon: "📋", adminOnly: false },
  { id: "per_person", label: "Items Per Person / Trainer", icon: "👤", adminOnly: false },
  { id: "monthly_spending", label: "Monthly Spending Summary", icon: "💳", adminOnly: true },
]

export default function MarketingReports() {
  const { canManageMarketing, marketingRole, role } = useAuth()
  const showAdminReports = ["marketing_admin", "marketing_manager"].includes(marketingRole) || role === "admin"
  const [selectedReport, setSelectedReport] = useState(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const visibleReports = ALL_REPORTS.filter(r => !r.adminOnly || showAdminReports)

  const generateReport = async () => {
    if (!selectedReport) return
    setLoading(true)
    setReportData(null)

    const from = dateFrom || "2020-01-01"
    const to = dateTo || new Date().toISOString().split("T")[0]

    try {
      let data = []
      switch (selectedReport) {
        case "monthly_stock": {
          const { data: stock } = await supabase
            .from("marketing_stock")
            .select("*, marketing_items(name, unit, minimum_stock_level), marketing_locations(name)")
          data = stock || []
          break
        }
        case "class_distribution": {
          const { data: gifts } = await supabase
            .from("marketing_class_gifts")
            .select("*, marketing_classes(class_name, class_date), marketing_items(name)")
            .gte("created_at", from).lte("created_at", to + "T23:59:59")
          data = gifts || []
          break
        }
        case "event_distribution": {
          const { data: cols } = await supabase
            .from("marketing_event_collaterals")
            .select("*, marketing_events(event_name, event_date), marketing_items(name)")
            .gte("created_at", from).lte("created_at", to + "T23:59:59")
          data = cols || []
          break
        }
        case "budget_actual": {
          const { data: events } = await supabase
            .from("marketing_events")
            .select("event_name, event_date, budget, actual_cost, status")
            .gte("event_date", from).lte("event_date", to)
          data = events || []
          break
        }
        case "low_stock": {
          const { data: stock } = await supabase
            .from("marketing_stock")
            .select("*, marketing_items(name, unit, minimum_stock_level)")
          data = (stock || []).filter(s => s.quantity <= (s.marketing_items?.minimum_stock_level || 0))
          break
        }
        case "movement_history": {
          const { data: movements } = await supabase
            .from("marketing_stock_movements")
            .select("*, marketing_items(name)")
            .gte("created_at", from).lte("created_at", to + "T23:59:59")
            .order("created_at", { ascending: false })
          data = movements || []
          break
        }
        case "per_person": {
          const { data: movements } = await supabase
            .from("marketing_stock_movements")
            .select("performed_by_name, marketing_items(name), quantity, movement_type, created_at")
            .eq("movement_type", "stock_out")
            .gte("created_at", from).lte("created_at", to + "T23:59:59")
          data = movements || []
          break
        }
        default:
          data = []
      }
      setReportData({ type: selectedReport, rows: data, generatedAt: new Date().toLocaleString() })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const exportCSV = () => {
    if (!reportData?.rows?.length) return
    const rows = reportData.rows
    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== "object")
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(","))
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `marketing_${selectedReport}_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="pt-20 md:pt-6" style={{ paddingLeft: "24px", paddingRight: "24px", paddingBottom: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: C.text, fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>📋 Reports</h1>
        <p style={{ color: C.sub, fontSize: "13px" }}>Generate and export marketing reports</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>
        {/* Report selector */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "16px" }}>
          <p style={{ color: C.sub, fontSize: "11px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Select Report</p>
          {visibleReports.map(r => (
            <button key={r.id} onClick={() => { setSelectedReport(r.id); setReportData(null) }}
              style={{
                display: "flex", alignItems: "center", gap: "8px", width: "100%",
                padding: "9px 12px", borderRadius: "9px", marginBottom: "4px",
                background: selectedReport === r.id ? "rgba(6,182,212,0.15)" : "transparent",
                border: selectedReport === r.id ? `1px solid ${C.border}` : "1px solid transparent",
                color: selectedReport === r.id ? C.accent : C.sub,
                cursor: "pointer", fontSize: "13px", fontWeight: selectedReport === r.id ? "600" : "400",
                textAlign: "left",
              }}>
              <span>{r.icon}</span>
              <span>{r.label}</span>
              {r.adminOnly && <span style={{ marginLeft: "auto", background: "rgba(167,139,250,0.15)", color: "#a78bfa", borderRadius: "4px", padding: "1px 5px", fontSize: "9px" }}>Admin</span>}
            </button>
          ))}
        </div>

        {/* Report config + output */}
        <div>
          {selectedReport ? (
            <div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
                <p style={{ color: C.text, fontWeight: "600", fontSize: "15px", marginBottom: "16px" }}>
                  {visibleReports.find(r => r.id === selectedReport)?.icon}{" "}
                  {visibleReports.find(r => r.id === selectedReport)?.label}
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <div>
                    <p style={{ color: C.sub, fontSize: "11px", marginBottom: "4px" }}>From Date</p>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      style={{ background: "rgba(6,182,212,0.06)", color: C.text, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div>
                    <p style={{ color: C.sub, fontSize: "11px", marginBottom: "4px" }}>To Date</p>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      style={{ background: "rgba(6,182,212,0.06)", color: C.text, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={generateReport} disabled={loading}
                    style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`, color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: "600", fontSize: "13px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                    {loading ? "Generating..." : "Generate Report"}
                  </button>
                  {reportData && (
                    <button onClick={exportCSV}
                      style={{ background: "rgba(16,185,129,0.15)", color: C.success, border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", padding: "10px 20px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                      Export CSV
                    </button>
                  )}
                </div>
              </div>

              {/* Report output */}
              {reportData && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <p style={{ color: C.text, fontWeight: "600", fontSize: "14px" }}>{reportData.rows.length} records</p>
                    <p style={{ color: C.sub, fontSize: "11px" }}>Generated: {reportData.generatedAt}</p>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <ReportTable type={reportData.type} rows={reportData.rows} />
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div style={{ background: "rgba(6,182,212,0.04)", border: "1px dashed rgba(6,182,212,0.2)", borderRadius: "16px", padding: "60px", textAlign: "center" }}>
              <p style={{ fontSize: "40px", marginBottom: "12px" }}>📋</p>
              <p style={{ color: C.sub }}>Select a report from the left to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReportTable({ type, rows }) {
  const C = { text: "#fff", sub: "#94a3b8", border: "rgba(6,182,212,0.18)", accent: "#06b6d4" }
  if (!rows.length) return <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>No data for selected period</p>

  const renderRow = (row, i) => {
    if (type === "monthly_stock") return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Td>{row.marketing_items?.name}</Td>
        <Td>{row.marketing_locations?.name}</Td>
        <Td align="right">{row.quantity}</Td>
        <Td align="right">{row.marketing_items?.minimum_stock_level}</Td>
        <Td>{row.marketing_items?.unit}</Td>
      </tr>
    )
    if (type === "class_distribution") return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Td>{row.marketing_classes?.class_name}</Td>
        <Td>{row.marketing_classes?.class_date}</Td>
        <Td>{row.marketing_items?.name}</Td>
        <Td align="right">{row.quantity}</Td>
        <Td>{row.is_distributed ? "✅" : row.is_packed ? "📦" : "—"}</Td>
      </tr>
    )
    if (type === "movement_history") return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Td>{new Date(row.created_at).toLocaleDateString()}</Td>
        <Td>{row.marketing_items?.name}</Td>
        <Td>{row.movement_type === "stock_in" ? "📥 In" : "📤 Out"}</Td>
        <Td align="right">{row.quantity}</Td>
        <Td>{row.performed_by_name}</Td>
        <Td>{row.reason}</Td>
      </tr>
    )
    if (type === "low_stock") return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Td>{row.marketing_items?.name}</Td>
        <Td align="right" style={{ color: "#ef4444" }}>{row.quantity}</Td>
        <Td align="right">{row.marketing_items?.minimum_stock_level}</Td>
        <Td align="right" style={{ color: "#ef4444" }}>{(row.marketing_items?.minimum_stock_level || 0) - row.quantity}</Td>
      </tr>
    )
    if (type === "budget_actual") return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Td>{row.event_name}</Td>
        <Td>{row.event_date}</Td>
        <Td align="right">${row.budget || "—"}</Td>
        <Td align="right" style={{ color: row.actual_cost > row.budget ? "#ef4444" : "#10b981" }}>${row.actual_cost || "—"}</Td>
        <Td>{row.status}</Td>
      </tr>
    )
    if (type === "per_person") return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Td>{row.performed_by_name}</Td>
        <Td>{row.marketing_items?.name}</Td>
        <Td align="right">{row.quantity}</Td>
        <Td>{new Date(row.created_at).toLocaleDateString()}</Td>
      </tr>
    )
    // Generic fallback
    return (
      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
        {Object.entries(row).filter(([k, v]) => typeof v !== "object").map(([k, v]) => (
          <Td key={k}>{String(v ?? "")}</Td>
        ))}
      </tr>
    )
  }

  const headers = {
    monthly_stock: ["Item", "Location", "Qty", "Min Level", "Unit"],
    class_distribution: ["Class", "Date", "Item", "Qty", "Status"],
    movement_history: ["Date", "Item", "Type", "Qty", "By", "Reason"],
    low_stock: ["Item", "Current Qty", "Min Level", "Shortage"],
    budget_actual: ["Event", "Date", "Budget", "Actual", "Status"],
    per_person: ["Person", "Item", "Qty", "Date"],
  }[type] || Object.keys(rows[0]).filter(k => typeof rows[0][k] !== "object")

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
      <thead>
        <tr>
          {headers.map(h => (
            <th key={h} style={{ color: "#94a3b8", textAlign: "left", padding: "8px 12px", borderBottom: `1px solid rgba(6,182,212,0.2)`, fontSize: "11px", fontWeight: "600", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => renderRow(row, i))}
      </tbody>
    </table>
  )
}

function Td({ children, align = "left", style = {} }) {
  return (
    <td style={{ color: "#e2e8f0", padding: "9px 12px", textAlign: align, ...style }}>
      {children}
    </td>
  )
}
