import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

export default function MarketingNavBell() {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!userProfile?.id) return
    const load = async () => {
      const { data } = await supabase
        .from("marketing_notifications")
        .select("*")
        .or(`user_id.eq.${userProfile.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(15)
      setNotifications(data || [])
    }
    load()
  }, [userProfile?.id])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const unread = notifications.filter(n => !n.is_read).length

  const markAllRead = async () => {
    await supabase.from("marketing_notifications").update({ is_read: true }).eq("user_id", userProfile?.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const clearAll = async () => {
    await supabase.from("marketing_notifications").delete().eq("user_id", userProfile?.id)
    setNotifications([])
    setShow(false)
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setShow(v => !v)}
        style={{
          background: "rgba(6,182,212,0.1)",
          border: "1px solid rgba(6,182,212,0.3)",
          borderRadius: "9px",
          width: "34px",
          height: "34px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "16px",
          position: "relative",
          color: "white"
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-6px", right: "-6px",
            background: "#ef4444", color: "white", borderRadius: "50%",
            width: "18px", height: "18px", fontSize: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold"
          }}>
            {unread}
          </span>
        )}
      </button>

      {show && (
        <div style={{
          position: "absolute", top: "42px", right: 0,
          width: "320px", maxHeight: "400px",
          background: "#0f2027", border: "1px solid rgba(6,182,212,0.3)",
          borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          zIndex: 9999, overflow: "hidden", display: "flex", flexDirection: "column"
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(6,182,212,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "white", fontWeight: "600", fontSize: "14px" }}>Notifications</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#06b6d4", fontSize: "11px", cursor: "pointer" }}>Mark all read</button>
              <button onClick={clearAll} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "11px", cursor: "pointer" }}>Clear all</button>
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>No notifications</div>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => setSelected(n)} style={{
                padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
                cursor: "pointer", background: n.is_read ? "transparent" : "rgba(6,182,212,0.05)",
                display: "flex", gap: "10px", alignItems: "flex-start"
              }}>
                {!n.is_read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4", marginTop: "5px", flexShrink: 0 }} />}
                <div>
                  <p style={{ color: "white", fontSize: "13px", fontWeight: "500", margin: 0 }}>{n.title}</p>
                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "2px 0 0" }}>{n.message}</p>
                  <p style={{ color: "#475569", fontSize: "11px", margin: "2px 0 0" }}>{new Date(n.created_at).toLocaleString("en-GB")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#0f2027", border: "1px solid rgba(6,182,212,0.3)",
            borderRadius: "16px", padding: "24px", maxWidth: "400px", width: "90%"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ color: "white", margin: 0, fontSize: "16px" }}>{selected.title}</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6" }}>{selected.message}</p>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "12px" }}>{new Date(selected.created_at).toLocaleString("en-GB")}</p>
          </div>
        </div>
      )}
    </div>
  )
}
