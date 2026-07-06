import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

const notifIcon = {
  low_stock: "🔔", approved: "✅", rejected: "❌",
  stock_in: "📦", qr_note: "👋", event: "⏰", stocktake: "📋", info: "ℹ️",
}

const B = "rgba(6,182,212,0.2)"

export default function MarketingNavBell() {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [show, setShow] = useState(false)
  const [shake, setShake] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState(null)
  const prevUnreadRef = useRef(0)

  useEffect(() => {
    if (!userProfile?.id) return
    fetchNotifications()

    const channel = supabase
      .channel(`marketing_notifications_${userProfile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_notifications", filter: `user_id=eq.${userProfile.id}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    setShow(false)
  }

  const unread = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (unread > prevUnreadRef.current) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 600)
      prevUnreadRef.current = unread
      return () => clearTimeout(t)
    }
    prevUnreadRef.current = unread
  }, [unread])

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <motion.button
        type="button"
        onClick={() => setShow(v => !v)}
        animate={shake ? { rotate: [0, -16, 14, -12, 10, -6, 0] } : { rotate: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "rgba(6,182,212,0.1)", border: `1px solid ${B}`,
          borderRadius: "9px", width: "34px", height: "34px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: "16px", position: "relative",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.2)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(6,182,212,0.1)"}
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
      </motion.button>

      <AnimatePresence>
        {show && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9997 }} onClick={() => setShow(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: "320px", zIndex: 9998,
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
                  <button onClick={markAllRead} style={{ color: "#06b6d4", fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
                  <button onClick={clearAll} style={{ color: "#ef4444", fontSize: "11px", background: "none", border: "none", cursor: "pointer" }}>Clear all</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {notifications.length === 0
                  ? <div style={{ padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>No notifications</div>
                  : notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNotif(n)}
                      style={{ padding: "11px 16px", borderBottom: "1px solid rgba(6,182,212,0.07)", background: n.is_read ? "transparent" : "rgba(6,182,212,0.05)", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{notifIcon[n.type] || "🔔"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: n.is_read ? "#94a3b8" : "#fff", fontSize: "13px", fontWeight: n.is_read ? "400" : "600", lineHeight: 1.3, margin: 0 }}>{n.title}</p>
                          <p style={{ color: "#94a3b8", fontSize: "11px", margin: "2px 0 0" }}>{n.message}</p>
                          <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "10px", margin: "3px 0 0" }}>{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                        {!n.is_read && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4", flexShrink: 0, marginTop: "5px" }} />}
                      </div>
                    </div>
                  ))
                }
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedNotif && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)" }}
              onClick={() => setSelectedNotif(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "360px", maxWidth: "calc(100vw - 32px)", zIndex: 10000,
                background: "#0f2730", border: "1px solid rgba(6,182,212,0.2)",
                borderRadius: "16px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.1)",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontSize: "20px" }}>{notifIcon[selectedNotif.type] || "🔔"}</span>
                <p style={{ color: "#fff", fontWeight: "600", fontSize: "15px", margin: 0, flex: 1 }}>{selectedNotif.title}</p>
                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              <p style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: 1.5, margin: "0 0 12px" }}>{selectedNotif.message}</p>
              <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "11px", margin: 0 }}>{new Date(selectedNotif.created_at).toLocaleString()}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
