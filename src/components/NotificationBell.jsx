import { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../lib/notifications"

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60)   return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function NotificationBell() {
  const { userProfile } = useAuth()
  const userId = userProfile?.id

  const [notifications, setNotifications] = useState([])
  const [open, setOpen]                   = useState(false)
  const [dropdownPos, setDropdownPos]     = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const panelRef  = useRef(null)

  const load = () => fetchNotifications(userId).then(setNotifications)

  useEffect(() => {
    if (!userId) return
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [userId])

  // Close on outside click
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

  const unread = notifications.filter(n => !n.is_read).length

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect          = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 320
      // Align left edge to bell's left edge, clamp so it never leaves the viewport
      let left = rect.left
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8
      }
      if (left < 8) left = 8
      setDropdownPos({ top: rect.bottom + 8, left })
    }
    setOpen(o => !o)
  }

  const handleClick = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id)
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    }
    setOpen(false)
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead(userId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  if (!userId) return null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        title="Notifications"
      >
        <span className="text-gray-400 text-base">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          style={{
            position:  "fixed",
            top:       dropdownPos.top,
            left:      dropdownPos.left,
            width:     "320px",
            maxWidth:  "calc(100vw - 16px)",
            zIndex:    9999,
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-white font-semibold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors ${!n.is_read ? "bg-blue-500/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0" style={n.is_read ? { paddingLeft: "16px" } : {}}>
                      <p className={`text-sm font-medium ${!n.is_read ? "text-white" : "text-gray-400"}`}>{n.title}</p>
                      {n.body && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-gray-600 text-xs mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
