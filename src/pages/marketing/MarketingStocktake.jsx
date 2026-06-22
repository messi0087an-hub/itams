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

export default function MarketingStocktake() {
  const { userProfile } = useAuth()
  const [items, setItems] = useState([])
  const [stock, setStock] = useState([])
  const [locations, setLocations] = useState([])
  const [stocktake, setStocktake] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterLocation, setFilterLocation] = useState("All")
  const [saved, setSaved] = useState({})

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: i }, { data: s }, { data: l }] = await Promise.all([
      supabase.from("marketing_items").select("id, name, unit, minimum_stock_level").order("name"),
      supabase.from("marketing_stock").select("*"),
      supabase.from("marketing_locations").select("*").order("name"),
    ])
    setItems(i || [])
    setStock(s || [])
    setLocations(l || [])
    setLoading(false)
  }

  const getSystemQty = (itemId, locationId) =>
    stock.filter(s => s.item_id === itemId && s.location_id === locationId).reduce((sum, s) => sum + s.quantity, 0)

  const getActual = (itemId, locationId) => {
    const key = `${itemId}_${locationId}`
    return stocktake[key]?.actual ?? ""
  }

  const setActual = (itemId, locationId, val) => {
    const key = `${itemId}_${locationId}`
    setStocktake(prev => ({
      ...prev,
      [key]: { actual: val, notes: prev[key]?.notes || "" },
    }))
  }

  const setNotes = (itemId, locationId, val) => {
    const key = `${itemId}_${locationId}`
    setStocktake(prev => ({
      ...prev,
      [key]: { actual: prev[key]?.actual ?? "", notes: val },
    }))
  }

  const handleSaveRow = async (item, location) => {
    const key = `${item.id}_${location.id}`
    const entry = stocktake[key]
    if (entry?.actual === "" || entry?.actual === undefined) return

    setSaving(true)
    const sysQty = getSystemQty(item.id, location.id)
    const actualQty = parseInt(entry.actual) || 0
    const discrepancy = actualQty - sysQty

    await supabase.from("marketing_stocktake").insert({
      item_id: item.id,
      location_id: location.id,
      system_quantity: sysQty,
      actual_quantity: actualQty,
      discrepancy,
      notes: entry.notes || null,
      performed_by: userProfile?.id,
      performed_by_name: userProfile?.full_name,
      stocktake_date: new Date().toISOString().split("T")[0],
    })

    // Override stock quantity
    const existing = stock.find(s => s.item_id === item.id && s.location_id === location.id)
    if (existing) {
      await supabase.from("marketing_stock").update({ quantity: actualQty, updated_at: new Date().toISOString() }).eq("id", existing.id)
    } else {
      await supabase.from("marketing_stock").insert({ item_id: item.id, location_id: location.id, quantity: actualQty })
    }

    setSaved(prev => ({ ...prev, [key]: true }))
    setSaving(false)
    fetchAll()
  }

  const exportCSV = () => {
    const rows = []
    items.forEach(item => {
      filteredLocations.forEach(loc => {
        const sysQty = getSystemQty(item.id, loc.id)
        const key = `${item.id}_${loc.id}`
        const actualQty = parseInt(stocktake[key]?.actual) || sysQty
        rows.push([item.name, loc.name, sysQty, actualQty, actualQty - sysQty])
      })
    })
    const csv = ["Item,Location,System Qty,Actual Qty,Discrepancy", ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stocktake_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const filteredLocations = filterLocation === "All" ? locations : locations.filter(l => l.id === filterLocation)

  // Only show items that have stock in at least one location (or all)
  const relevantItems = items.filter(item =>
    filteredLocations.some(loc => getSystemQty(item.id, loc.id) > 0 || stocktake[`${item.id}_${loc.id}`]?.actual !== undefined)
  )

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: C.text, fontSize: "24px", fontWeight: "800", marginBottom: "4px" }}>🔢 Stocktake</h1>
          <p style={{ color: C.sub, fontSize: "13px" }}>Monthly physical count — verify and override quantities</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={exportCSV} style={{ background: "rgba(16,185,129,0.15)", color: C.success, border: "1px solid rgba(16,185,129,0.3)", borderRadius: "10px", padding: "9px 16px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Location filter */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
          style={{ background: "#0f2730", color: C.text, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "9px 14px", fontSize: "13px", outline: "none" }}>
          <option value="All">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Info box */}
      <div style={{ background: "rgba(6,182,212,0.06)", border: `1px solid ${C.border}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "20px" }}>
        <p style={{ color: C.accent, fontSize: "12px", fontWeight: "600" }}>How to use:</p>
        <p style={{ color: C.sub, fontSize: "12px", marginTop: "2px" }}>
          Enter the actual physical count in the "Actual Qty" field. The system shows the current database quantity.
          Discrepancy = Actual - System. Click "Save" to update the database and record the stocktake.
        </p>
      </div>

      {loading ? (
        <p style={{ color: C.sub }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredLocations.map(location => {
            const locationItems = items.filter(item => getSystemQty(item.id, location.id) > 0)
            if (locationItems.length === 0 && filterLocation !== location.id) return null

            return (
              <div key={location.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "20px" }}>
                <h3 style={{ color: C.accent, fontSize: "15px", fontWeight: "700", marginBottom: "14px" }}>
                  📍 {location.name}
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "600px" }}>
                    <thead>
                      <tr>
                        {["Item", "Unit", "System Qty", "Actual Qty", "Discrepancy", "Notes", ""].map(h => (
                          <th key={h} style={{ color: C.sub, textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${C.border}`, fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const sysQty = getSystemQty(item.id, location.id)
                        const key = `${item.id}_${location.id}`
                        const actual = getActual(item.id, location.id)
                        const actualNum = actual !== "" ? parseInt(actual) || 0 : sysQty
                        const discrepancy = actual !== "" ? actualNum - sysQty : 0
                        const isSaved = saved[key]

                        return (
                          <tr key={item.id} style={{ borderBottom: `1px solid rgba(6,182,212,0.08)` }}>
                            <td style={{ color: C.text, padding: "8px 10px", fontWeight: "500" }}>{item.name}</td>
                            <td style={{ color: C.sub, padding: "8px 10px" }}>{item.unit}</td>
                            <td style={{ color: C.text, padding: "8px 10px", fontWeight: "600" }}>{sysQty}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <input
                                type="number"
                                min={0}
                                value={actual}
                                onChange={e => setActual(item.id, location.id, e.target.value)}
                                placeholder={String(sysQty)}
                                style={{ width: "70px", background: "rgba(6,182,212,0.08)", color: C.text, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "5px 8px", fontSize: "13px", outline: "none" }}
                              />
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              {actual !== "" && (
                                <span style={{ color: discrepancy > 0 ? C.success : discrepancy < 0 ? C.error : C.sub, fontWeight: "700", fontSize: "14px" }}>
                                  {discrepancy >= 0 ? "+" : ""}{discrepancy}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input
                                type="text"
                                value={stocktake[key]?.notes || ""}
                                onChange={e => setNotes(item.id, location.id, e.target.value)}
                                placeholder="Notes..."
                                style={{ width: "120px", background: "rgba(6,182,212,0.04)", color: C.sub, border: `1px solid rgba(6,182,212,0.1)`, borderRadius: "6px", padding: "5px 8px", fontSize: "12px", outline: "none" }}
                              />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              {isSaved ? (
                                <span style={{ color: C.success, fontSize: "12px" }}>✅ Saved</span>
                              ) : (
                                <button
                                  onClick={() => handleSaveRow(item, location)}
                                  disabled={saving || actual === ""}
                                  style={{ background: actual !== "" ? `linear-gradient(135deg, ${C.accent}, ${C.teal})` : "rgba(148,163,184,0.1)", color: actual !== "" ? "#fff" : C.sub, border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "11px", fontWeight: "600", cursor: actual !== "" ? "pointer" : "not-allowed" }}
                                >
                                  Save
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
