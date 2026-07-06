import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

const bellKeyframes = `
@keyframes mktBellShake {
  0%,100% { transform: rotate(0deg); }
  10%      { transform: rotate(-18deg); }
  20%      { transform: rotate(18deg); }
  30%      { transform: rotate(-14deg); }
  40%      { transform: rotate(14deg); }
  50%      { transform: rotate(-10deg); }
  60%      { transform: rotate(10deg); }
  70%      { transform: rotate(-6deg); }
  80%      { transform: rotate(6deg); }
  90%      { transform: rotate(-2deg); }
}
`

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60)   return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

const TYPE_META = {
  low_stock: { emoji: "🔔", label: "Low Stock",  badge: { bg: "#f59e0b22", border: "#f59e0b66", color: "#fbbf24" } },
  approved:  { emoji: "✅", label: "Approved",   badge: { bg: "#10b98122", border: "#10b98166", color: "#34d399" } },
  rejected:  { emoji: "❌", label: "Rejected",   badge: { bg: "#ef444422", border: "#ef444466", color: "#f87171" } },
  stock_in:  { emoji: "📦", label: "Stock In",   badge: { bg: "#06b6d422", border: "#06b6d466", color: "#22d3ee" } },
  qr_note:   { emoji: "👋", label: "Note",       badge: { bg: "#14b8a622", border: "#14b8a666", color: "#2dd4bf" } },
  event:     { emoji: "⏰", label: "Event",      badge: { bg: "#8b5cf622", border: "#8b5cf666", color: "#a78bfa" } },
  stocktake: { emoji: "📋", label: "Stocktake",  badge: { bg: "#0891b222", border: "#0891b266", color: "#22d3ee" } },
  info:      { emoji: "ℹ️", label: "Info",       badge: { bg: "#37415122", border: "#37415166", color: "#9ca3af" } },
  default:   { emoji: "🔔", label: "Notification", badge: { bg: "#37415122", border: "#37415166", color: "#9ca3af" } },
}

function resolveType(type) {
  return TYPE_META[type] || TYPE_META.default
}

function NotificationModal({ notification, onClose }) {
  useEffect(() => {
    if (!notification) return
    const handler = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [notification, onClose])

  if (!notification) return null

  const meta = resolveType(notification.type)
  const formattedTime = new Date(notification.created_at).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: "#0f2730",
          border: "1px solid rgba(6,182,212,0.3)",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          padding: "28px",
          width: "100%",
          maxWidth: "480px",
          margin: "0 16px",
          position: "relative",
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8", fontSize: "20px", lineHeight: 1, padding: "4px",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
          aria-label="Close"
        >
          ✕
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px", lineHeight: 1 }}>{meta.emoji}</span>
          <span style={{
            fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px",
            background: meta.badge.bg, border: `1px solid ${meta.badge.border}`, color: meta.badge.color,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            {meta.label}
          </span>
        </div>

        <p style={{ color: "#fff", fontWeight: 700, fontSize: "17px", paddingRight: "32px", marginBottom: "10px", lineHeight: 1.3 }}>
          {notification.title}
        </p>

        {notification.message && (
          <p style={{ color: "#d1d5db", fontSize: "14px", lineHeight: 1.7, marginBottom: "20px" }}>
            {notification.message}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", borderTop: "1px solid rgba(6,182,212,0.15)" }}>
          <span style={{ color: "#64748b", fontSize: "12px" }}>🕐 {formattedTime}</span>
          {!notification.is_read && (
            <span style={{ color: "#22d3ee", fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>● Unread</span>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function MarketingNavBell() {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [selectedNotif, setSelectedNotif] = useState(null)
  const [shaking, setShaking] = useState(false)

  const buttonRef  = useRef(null)
  const panelRef   = useRef(null)
  const prevUnread = useRef(0)

  const load = useCallback(async () => {
    if (!userProfile?.id) return
    const { data } = await supabase
      .from("marketing_notifications")
      .select("*")
      .or(`user_id.eq.${userProfile.id},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(15)
    setNotifications(data || [])
  }, [userProfile?.id])

  useEffect(() => {
    if (!userProfile?.id) return
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [userProfile?.id, load])

  const unread = notifications.filter(n => !n.is_read).length

  // Shake bell when unread count increases
  useEffect(() => {
    if (unread > prevUnread.current && prevUnread.current !== undefined) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 2000)
      return () => clearTimeout(t)
    }
    prevUnread.current = unread
  }, [unread])

  // Sync prevUnread without triggering shake on initial load
  useEffect(() => {
    prevUnread.current = unread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Reposition dropdown on resize
  useEffect(() => {
    if (!open) return
    const handleResize = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      const w = 320
      let left = rect.right - w
      if (left < 8) left = 8
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8
      setDropdownPos({ top: rect.bottom + 8, left })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [open])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const w = 320
      let left = rect.right - w
      if (left < 8) left = 8
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8
      setDropdownPos({ top: rect.bottom + 8, left })
    }
    setOpen(o => !o)
  }

  const markOne = async (notifId) => {
    await supabase.from("marketing_notifications").update({ is_read: true }).eq("id", notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
  }

  const markAll = async () => {
    if (!userProfile?.id) return
    await supabase.from("marketing_notifications").update({ is_read: true }).eq("user_id", userProfile.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const clearAll = async () => {
    if (!userProfile?.id) return
    await supabase.from("marketing_notifications").delete().eq("user_id", userProfile.id)
    setNotifications([])
    setOpen(false)
  }

  const handleClickNotif = async (n) => {
    if (!n.is_read) await markOne(n.id)
    setOpen(false)
    setSelectedNotif({ ...n, is_read: true })
  }

  const handleMarkOne = async (e, n) => {
    e.stopPropagation()
    await markOne(n.id)
  }

  return (
    <>
      <style>{bellKeyframes}</style>

      <button
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)",
          borderRadius: "9px", width: "34px", height: "34px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: "16px", position: "relative", flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.2)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(6,182,212,0.1)"}
        title="Notifications"
      >
        <span style={shaking ? { animation: "mktBellShake 0.6s ease-in-out 3", display: "inline-block" } : { display: "inline-block" }}>
          🔔
        </span>
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

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: "320px",
            maxWidth: "calc(100vw - 16px)",
            zIndex: 9999,
            background: "#0f2730", border: "1px solid rgba(6,182,212,0.2)",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.1)",
            overflow: "hidden", maxHeight: "400px",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(6,182,212,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: "600", fontSize: "14px" }}>Notifications</span>
            <div style={{ display: "flex", gap: "10px" }}>
              {unread > 0 && (
                <button onClick={markAll} style={{ color: "#06b6d4", fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ color: "#ef4444", fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>Clear all</button>
              )}
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No notifications</div>
            ) : notifications.map(n => {
              const meta = resolveType(n.type)
              return (
                <div
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  style={{ padding: "11px 16px", borderBottom: "1px solid rgba(6,182,212,0.07)", background: n.is_read ? "transparent" : "rgba(6,182,212,0.05)", cursor: "pointer", display: "flex", gap: "8px", alignItems: "flex-start" }}
                >
                  <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{meta.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: n.is_read ? "#94a3b8" : "#fff", fontSize: "13px", fontWeight: n.is_read ? "400" : "600", lineHeight: 1.3, margin: 0 }}>{n.title}</p>
                    {n.message && <p style={{ color: "#94a3b8", fontSize: "11px", margin: "2px 0 0" }}>{n.message}</p>}
                    <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "10px", margin: "3px 0 0" }}>{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkOne(e, n)}
                      title="Mark as read"
                      style={{ flexShrink: 0, marginTop: "2px", background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.6)", fontSize: "13px" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#10b981"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.6)"}
                    >
                      ✓
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      <NotificationModal notification={selectedNotif} onClose={() => setSelectedNotif(null)} />
    </>
  )
}
