import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion } from "framer-motion"

const C = {
  accent: "#06b6d4",
  teal: "#14b8a6",
  card: "rgba(6,182,212,0.06)",
  border: "rgba(6,182,212,0.18)",
  text: "#ffffff",
  sub: "#94a3b8",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
}

function StatCard({ icon, label, value, color, sub, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: `0 8px 30px rgba(6,182,212,0.15)` }}
      onClick={onClick}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: "16px",
        padding: "20px",
        cursor: onClick ? "pointer" : "default",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ color: C.sub, fontSize: "12px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
          <p style={{ color: color || C.accent, fontSize: "32px", fontWeight: "800", lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ color: C.sub, fontSize: "11px", marginTop: "4px" }}>{sub}</p>}
        </div>
        <span style={{ fontSize: "28px", opacity: 0.9 }}>{icon}</span>
      </div>
    </motion.div>
  )
}

function PackingStatusBadge({ isDistributed, isPacked }) {
  if (isDistributed) return (
    <span style={{ background: "rgba(16,185,129,0.15)", color: C.success, border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}>🟢 Distributed</span>
  )
  if (isPacked) return (
    <span style={{ background: "rgba(245,158,11,0.15)", color: C.warning, border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}>🟡 Packed</span>
  )
  return (
    <span style={{ background: "rgba(239,68,68,0.12)", color: C.error, border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600" }}>🔴 Not Packed</span>
  )
}

export default function MarketingDashboard() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, weekClasses: 0, upcomingEvents: 0 })
  const [weekClasses, setWeekClasses] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const today = new Date()
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1)
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
    const todayStr = today.toISOString().split("T")[0]
    const weekStartStr = weekStart.toISOString().split("T")[0]
    const weekEndStr = weekEnd.toISOString().split("T")[0]

    const [
      { data: items },
      { data: stock },
      { data: classes },
      { data: events },
      { data: movements },
    ] = await Promise.all([
      supabase.from("marketing_items").select("id, name, minimum_stock_level"),
      supabase.from("marketing_stock").select("item_id, quantity"),
      supabase.from("marketing_classes").select("*, marketing_class_gifts(*)").gte("class_date", weekStartStr).lte("class_date", weekEndStr).order("class_date"),
      supabase.from("marketing_events").select("*").gte("event_date", todayStr).order("event_date").limit(6),
      supabase.from("marketing_stock_movements").select("*, marketing_items(name)").order("created_at", { ascending: false }).limit(10),
    ])

    // Calculate stock per item
    const stockMap = {}
    ;(stock || []).forEach(s => {
      stockMap[s.item_id] = (stockMap[s.item_id] || 0) + (s.quantity || 0)
    })

    const low = (items || []).filter(item => {
      const qty = stockMap[item.id] || 0
      return qty <= (item.minimum_stock_level || 0) && item.minimum_stock_level > 0
    }).map(item => ({ ...item, currentStock: stockMap[item.id] || 0 }))

    setStats({
      totalItems: items?.length || 0,
      lowStock: low.length,
      weekClasses: classes?.length || 0,
      upcomingEvents: events?.length || 0,
    })
    setWeekClasses(classes || [])
    setLowStockItems(low)
    setUpcomingEvents(events || [])
    setRecentActivity(movements || [])
    setLoading(false)
  }

  const getPackingStatus = (gifts) => {
    if (!gifts?.length) return { isPacked: false, isDistributed: false }
    const allDist = gifts.every(g => g.is_distributed)
    const allPacked = gifts.every(g => g.is_packed)
    return { isPacked: allPacked, isDistributed: allDist }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "12px" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.accent, animation: "bounce 1s infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p style={{ color: C.sub, fontSize: "13px" }}>Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div style={{ padding: "24px", maxWidth: "1200px" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "28px" }}>
        <h1 style={{ color: C.text, fontSize: "26px", fontWeight: "800", marginBottom: "4px" }}>
          🎯 Marketing Dashboard
        </h1>
        <p style={{ color: C.sub, fontSize: "13px" }}>
          Welcome back, {userProfile?.full_name?.split(" ")[0] || "there"}! Here's what's happening today.
        </p>
      </motion.div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard icon="📦" label="Total Items" value={stats.totalItems} onClick={() => navigate("/marketing/items")} />
        <StatCard icon="⚠️" label="Low Stock Items" value={stats.lowStock} color={stats.lowStock > 0 ? C.error : C.success} sub="Below minimum level" />
        <StatCard icon="🎁" label="This Week's Classes" value={stats.weekClasses} color={C.teal} onClick={() => navigate("/marketing/classes")} />
        <StatCard icon="🎪" label="Upcoming Events" value={stats.upcomingEvents} color="#a78bfa" onClick={() => navigate("/marketing/events")} />
      </div>

      {/* Weekly Classes */}
      <Section title="🎁 This Week's Classes" action={{ label: "View All", onClick: () => navigate("/marketing/classes") }}>
        {weekClasses.length === 0 ? (
          <EmptyNote text="No classes scheduled this week" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
            {weekClasses.map(cls => {
              const { isPacked, isDistributed } = getPackingStatus(cls.marketing_class_gifts)
              return (
                <motion.div
                  key={cls.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate("/marketing/classes")}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ color: C.text, fontWeight: "600", fontSize: "14px" }}>{cls.class_name}</p>
                      <p style={{ color: C.sub, fontSize: "12px", marginTop: "2px" }}>{cls.class_type}</p>
                    </div>
                    <PackingStatusBadge isPacked={isPacked} isDistributed={isDistributed} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <InfoPill icon="📅" label={cls.class_date} />
                    <InfoPill icon="🏫" label={cls.classroom || "TBD"} />
                    <InfoPill icon="👥" label={`${cls.pax_confirmed || 0} pax`} />
                    <InfoPill icon="🎁" label={`${cls.marketing_class_gifts?.length || 0} gift types`} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Section title="⚠️ Low Stock Alerts" action={{ label: "View Items", onClick: () => navigate("/marketing/items") }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {lowStockItems.map(item => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.01 }}
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <p style={{ color: C.text, fontWeight: "600", fontSize: "14px" }}>{item.name}</p>
                  <p style={{ color: "#f87171", fontSize: "12px", marginTop: "2px" }}>
                    Current: <b>{item.currentStock}</b> · Minimum: <b>{item.minimum_stock_level}</b>
                  </p>
                </div>
                <button
                  onClick={() => navigate("/marketing/approvals")}
                  style={{
                    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171", borderRadius: "8px", padding: "6px 12px",
                    fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  Request Restock
                </button>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* Upcoming Events */}
      <Section title="📅 Upcoming Events" action={{ label: "View All", onClick: () => navigate("/marketing/events") }}>
        {upcomingEvents.length === 0 ? (
          <EmptyNote text="No upcoming events" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
            {upcomingEvents.map(ev => (
              <motion.div
                key={ev.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate("/marketing/events")}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "16px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <p style={{ color: C.text, fontWeight: "600", fontSize: "14px", flex: 1 }}>{ev.event_name}</p>
                  <span style={{
                    background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)",
                    borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "600", flexShrink: 0, marginLeft: "8px",
                  }}>{ev.status}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <InfoPill icon="📅" label={ev.event_date} />
                  {ev.partner_category && <InfoPill icon="🤝" label={ev.partner_category} />}
                  {ev.project_lead && <InfoPill icon="👤" label={ev.project_lead} />}
                  {ev.event_modality && <InfoPill icon="📍" label={ev.event_modality} />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent Activity */}
      <Section title="🕐 Recent Activity">
        {recentActivity.length === 0 ? (
          <EmptyNote text="No recent activity" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentActivity.map(m => (
              <div key={m.id} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px",
                padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "18px" }}>{m.movement_type === "stock_in" ? "📥" : m.movement_type === "stock_out" ? "📤" : "🔄"}</span>
                  <div>
                    <p style={{ color: C.text, fontSize: "13px", fontWeight: "500" }}>
                      <span style={{ color: m.movement_type === "stock_in" ? C.success : m.movement_type === "stock_out" ? C.error : C.accent }}>
                        {m.movement_type === "stock_in" ? "Stock In" : m.movement_type === "stock_out" ? "Stock Out" : m.movement_type}
                      </span>
                      {" · "}{m.marketing_items?.name || "Unknown item"}
                      {" · "}<b style={{ color: C.accent }}>{m.quantity} units</b>
                    </p>
                    {m.performed_by_name && <p style={{ color: C.sub, fontSize: "11px", marginTop: "2px" }}>by {m.performed_by_name}</p>}
                  </div>
                </div>
                <p style={{ color: C.sub, fontSize: "11px", whiteSpace: "nowrap" }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h2 style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: "700" }}>{title}</h2>
        {action && (
          <button onClick={action.onClick} style={{ background: "none", border: "none", color: C.accent, fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
            {action.label} →
          </button>
        )}
      </div>
      {children}
    </motion.div>
  )
}

function InfoPill({ icon, label }) {
  return (
    <span style={{ color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
      <span>{icon}</span> {label}
    </span>
  )
}

function EmptyNote({ text }) {
  return (
    <div style={{
      background: "rgba(6,182,212,0.04)", border: `1px dashed rgba(6,182,212,0.2)`,
      borderRadius: "12px", padding: "24px", textAlign: "center",
      color: "#64748b", fontSize: "13px",
    }}>
      {text}
    </div>
  )
}
