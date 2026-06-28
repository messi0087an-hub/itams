import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useNotifications } from "../context/NotificationContext"

const bellKeyframes = `
@keyframes bellShake {
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

function NotificationModal({ notification, onClose }) {
  useEffect(() => {
    if (!notification) return
    const handler = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [notification, onClose])

  if (!notification) return null

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
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          padding: "24px",
          width: "100%",
          maxWidth: "420px",
          margin: "0 16px",
          position: "relative",
          animation: "slideInFromTop 0.2s ease-out",
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "#6b7280", fontSize: "20px", lineHeight: 1,
            padding: "4px",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}
          aria-label="Close"
        >
          ✕
        </button>

        <p style={{ color: "#fff", fontWeight: 600, fontSize: "15px", paddingRight: "32px", marginBottom: "12px" }}>
          {notification.title}
        </p>

        {notification.body && (
          <p style={{ color: "#d1d5db", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
            {notification.body}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #1f2937" }}>
          <span style={{ color: "#4b5563", fontSize: "12px" }}>
            {new Date(notification.created_at).toLocaleString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
          {!notification.is_read && (
            <span style={{ color: "#60a5fa", fontSize: "12px", fontWeight: 500 }}>Unread</span>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function NotificationBell() {
  const ctx = useNotifications()

  const [open, setOpen]               = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [selectedNotif, setSelectedNotif] = useState(null)
  const [shaking, setShaking]         = useState(false)

  const buttonRef  = useRef(null)
  const panelRef   = useRef(null)
  const prevUnread = useRef(0)

  const notifications = ctx?.notifications ?? []
  const unread        = ctx?.unread ?? 0
  const markOne       = ctx?.markOne
  const markAll       = ctx?.markAll
  const clearAll      = ctx?.clearAll

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
      const w = 380
      let left = rect.right - w
      if (left < 8) left = 8
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8
      setDropdownPos({ top: rect.bottom + 8, left })
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [open])

  if (!ctx) return null

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const w = 380
      let left = rect.right - w
      if (left < 8) left = 8
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8
      setDropdownPos({ top: rect.bottom + 8, left })
    }
    setOpen(o => !o)
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
        className="relative p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        title="Notifications"
      >
        <span
          className="text-gray-400 text-base inline-block"
          style={shaking ? { animation: "bellShake 0.6s ease-in-out 3" } : {}}
        >
          🔔
        </span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: "380px",
            maxWidth: "calc(100vw - 16px)",
            zIndex: 9999,
            animation: "slideInFromTop 0.2s ease-out",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-white font-semibold text-sm">Notifications</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-gray-500 hover:text-red-400 text-xs transition-colors">
                  Clear all
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors cursor-pointer ${!n.is_read ? "bg-blue-500/5" : ""}`}
                  onClick={() => handleClickNotif(n)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0" style={n.is_read ? { paddingLeft: "16px" } : {}}>
                        <p className={`text-sm font-medium ${!n.is_read ? "text-white" : "text-gray-400"}`}>{n.title}</p>
                        {n.body && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-gray-600 text-xs mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkOne(e, n)}
                      title="Mark as read"
                      className="shrink-0 mt-1 text-gray-600 hover:text-green-400 transition-colors text-sm"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}

      <NotificationModal notification={selectedNotif} onClose={() => setSelectedNotif(null)} />
    </>
  )
}
