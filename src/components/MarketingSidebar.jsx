import { useState, useEffect } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

const MKT = {
  bg:      "#071920",
  primary: "#0f2730",
  accent:  "#06b6d4",
  teal:    "#14b8a6",
  text:    "#ffffff",
  sub:     "#94a3b8",
  border:  "rgba(6,182,212,0.2)",
  hover:   "rgba(6,182,212,0.12)",
  active:  "rgba(6,182,212,0.18)",
}

const navItems = [
  { label: "Dashboard",    path: "/marketing/dashboard", icon: "🏠" },
  { label: "Items",        path: "/marketing/items",     icon: "📦" },
  { label: "Stock In/Out", path: "/marketing/stock",     icon: "📊" },
  { label: "Class Gifts",  path: "/marketing/classes",   icon: "🎁" },
  { label: "Events",       path: "/marketing/events",    icon: "🎪" },
  { label: "Approvals",    path: "/marketing/approvals", icon: "✅" },
  { label: "Reports",      path: "/marketing/reports",   icon: "📋" },
  { label: "History",      path: "/marketing/history",   icon: "📜" },
  { label: "Stocktake",    path: "/marketing/stocktake", icon: "🔢" },
  { label: "Settings",     path: "/marketing/settings",  icon: "⚙️" },
]

const notifIcon = {
  low_stock: "🔔", approved: "✅", rejected: "❌",
  stock_in: "📦", qr_note: "👋", event: "⏰", stocktake: "📋", info: "ℹ️",
}

export default function MarketingSidebar() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotif, setShowNotif] = useState(false)
  const { userProfile, role, isAdmin, isMarketing } = useAuth()
  const navigate = useNavigate()

  // Use the correct profile field — same as IT sidebar uses "name"
  const displayName = userProfile?.name || userProfile?.full_name || userProfile?.email || "Marketing User"
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MK"

  useEffect(() => {
    if (!userProfile?.id) return
    fetchNotifications()
  }, [userProfile?.id])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("marketing_notifications")
      .select("*")
      .eq("user_id", userProfile.id)
      .order("created_at", { ascending: false })
      .limit(15)
    setNotifications(data || [])
  }

  const markAllRead = async () => {
    await supabase.from("marketing_notifications").update({ is_read: true }).eq("user_id", userProfile.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const clearAll = async () => {
    await supabase.from("marketing_notifications").delete().eq("user_id", userProfile.id)
    setNotifications([])
    setShowNotif(false)
  }

  const unread = notifications.filter(n => !n.is_read).length

  // ── Reusable notification bell button ──────────────────────────────────────
  const BellButton = ({ size = 18 }) => (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowNotif(v => !v)}
        style={{
          background: "rgba(6,182,212,0.1)",
          border: `1px solid ${MKT.border}`,
          borderRadius: "9px",
          width: size + 18,
          height: size + 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: size,
          position: "relative",
          flexShrink: 0,
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            background: "#ef4444", color: "#fff",
            fontSize: "9px", fontWeight: "700",
            borderRadius: "9px", padding: "1px 5px",
            minWidth: "16px", textAlign: "center",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  )

  // ── Notification dropdown ──────────────────────────────────────────────────
  const NotifDropdown = () => (
    <AnimatePresence>
      {showNotif && (
        <>
          {/* backdrop to close */}
          <div style={{ position: "fixed", inset: 0, zIndex: 9997 }} onClick={() => setShowNotif(false)} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed", top: "64px", left: "16px",
              width: "320px", zIndex: 9998,
              background: "#0f2730",
              border: `1px solid ${MKT.border}`,
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.1)",
              overflow: "hidden", maxHeight: "400px",
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "13px 16px", borderBottom: `1px solid ${MKT.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ color: MKT.text, fontWeight: "600", fontSize: "14px" }}>Notifications</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={markAllRead} style={{ color: MKT.accent, fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
                <button onClick={clearAll} style={{ color: "#ef4444", fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>Clear all</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0
                ? <div style={{ padding: "28px", textAlign: "center", color: MKT.sub, fontSize: "13px" }}>No notifications</div>
                : notifications.map(n => (
                  <div key={n.id} style={{ padding: "11px 16px", borderBottom: "1px solid rgba(6,182,212,0.07)", background: n.is_read ? "transparent" : "rgba(6,182,212,0.05)" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{notifIcon[n.type] || "🔔"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: n.is_read ? MKT.sub : MKT.text, fontSize: "13px", fontWeight: n.is_read ? "400" : "600", lineHeight: 1.3 }}>{n.title}</p>
                        <p style={{ color: MKT.sub, fontSize: "11px", marginTop: "2px" }}>{n.message}</p>
                        <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "10px", marginTop: "3px" }}>{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                      {!n.is_read && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: MKT.accent, flexShrink: 0, marginTop: "5px" }} />}
                    </div>
                  </div>
                ))
              }
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // ── Sidebar body (shared desktop + mobile) ─────────────────────────────────
  const SidebarBody = () => (
    <div style={{ width: "256px", height: "100%", backgroundColor: MKT.bg, borderRight: `1px solid ${MKT.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Cyan accent stripe */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${MKT.accent}, ${MKT.teal})`, flexShrink: 0 }} />

      {/* Header — logo + bell */}
      <div style={{ background: `linear-gradient(160deg, ${MKT.primary} 0%, #0a1a1f 100%)`, padding: "18px 16px 14px", borderBottom: `1px solid ${MKT.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <h1 style={{ color: MKT.accent, fontSize: "17px", fontWeight: "700", letterSpacing: "-0.3px", lineHeight: 1 }}>ITAMS Marketing</h1>
            <p style={{ color: MKT.sub, fontSize: "11px", marginTop: "3px" }}>Trainocate Singapore</p>
          </div>
          <BellButton size={16} />
        </div>

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `linear-gradient(135deg, ${MKT.accent}, ${MKT.teal})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "12px", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: MKT.text, fontSize: "13px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
              {displayName}
            </p>
            <span style={{ display: "inline-block", background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: MKT.accent, fontSize: "10px", padding: "1px 7px", borderRadius: "6px", fontWeight: "600", marginTop: "2px" }}>
              {userProfile?.marketing_role || (role === "admin" ? "IT Admin" : "Marketing")}
            </span>
          </div>
        </div>
      </div>

      {/* Module toggle — admin only */}
      {isAdmin && isMarketing && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${MKT.border}`, flexShrink: 0 }}>
          <p style={{ color: MKT.sub, fontSize: "10px", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Switch Module</p>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => { setOpen(false); navigate("/admin") }}
              style={{ flex: 1, padding: "6px 4px", borderRadius: "7px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", fontSize: "11px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.08)" }}
            >
              🖥️ IT ITAMS
            </button>
            <button
              style={{ flex: 1, padding: "6px 4px", borderRadius: "7px", background: "rgba(6,182,212,0.2)", border: `1px solid ${MKT.accent}`, color: MKT.accent, fontSize: "11px", fontWeight: "700", cursor: "default" }}
            >
              🎯 Marketing
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "9px 12px",
              borderRadius: "10px",
              marginBottom: "2px",
              textDecoration: "none",
              background: isActive ? MKT.active : "transparent",
              border: isActive ? `1px solid ${MKT.border}` : "1px solid transparent",
              color: isActive ? MKT.accent : MKT.sub,
              fontWeight: isActive ? "600" : "400",
              fontSize: "13.5px",
              transition: "all 0.15s",
            })}
          >
            <span style={{ fontSize: "15px", width: "20px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: "10px 10px 18px", borderTop: `1px solid ${MKT.border}`, flexShrink: 0 }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", fontSize: "13.5px", fontWeight: "500", cursor: "pointer", transition: "all 0.15s" }}
        >
          <span style={{ fontSize: "15px" }}>🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          height: "56px",
          background: "rgba(7,25,32,0.96)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${MKT.border}`,
          display: "flex", alignItems: "center",
          padding: "0 16px",
          gap: "10px",
        }}
      >
        {/* Brand */}
        <span style={{ color: MKT.accent, fontWeight: "700", fontSize: "16px", flex: 1, letterSpacing: "-0.2px" }}>
          ITAMS Marketing
        </span>

        {/* Bell */}
        <BellButton size={16} />

        {/* Burger */}
        <button
          onClick={() => setOpen(!open)}
          style={{ background: "rgba(6,182,212,0.1)", border: `1px solid ${MKT.border}`, borderRadius: "8px", color: MKT.text, width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Notification dropdown (shared, portal-like fixed position) */}
      <NotifDropdown />

      {/* ── Mobile: overlay + slide-in drawer ─────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="md:hidden"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 39 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="md:hidden"
            style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40, width: "256px" }}
          >
            <SidebarBody />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar (always visible) ──────────────────────────────── */}
      <div
        className="hidden md:block"
        style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "256px", zIndex: 40 }}
      >
        <SidebarBody />
      </div>
    </>
  )
}
