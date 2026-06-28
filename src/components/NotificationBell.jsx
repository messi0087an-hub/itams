import { useState, useEffect, useRef } from "react"
import { useNotifications } from "../context/NotificationContext"

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60)   return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function NotificationModal({ notification, onClose }) {
  // Close on Escape key
  useEffect(() => {
    if (!notification) return
    const handler = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [notification, onClose])

  if (!notification) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onMouseDown={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 relative"
        style={{ animation: "slideInFromTop 0.2s ease-out" }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>
        <p className="text-white font-semibold text-base pr-8 mb-3">{notification.title}</p>
        {notification.body && (
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{notification.body}</p>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <span className="text-gray-600 text-xs">
            {new Date(notification.created_at).toLocaleString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            })}
          </span>
          {!notification.is_read && (
            <span className="text-blue-400 text-xs font-medium">Unread</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell() {
  const ctx = useNotifications()
  const [open, setOpen]             = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [selectedNotif, setSelectedNotif] = useState(null)
  const buttonRef = useRef(null)
  const panelRef  = useRef(null)

  // If context not available (e.g. marketing layout), render nothing
  if (!ctx) return null
  const { notifications, unread, markOne, markAll, clearAll } = ctx

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

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 380
      let left = rect.right - dropdownWidth
      if (left < 8) left = 8
      if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8
      setDropdownPos({ top: rect.bottom + 8, left })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const handleResize = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const dropdownWidth = 380
        let left = rect.right - dropdownWidth
        if (left < 8) left = 8
        if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8
        setDropdownPos({ top: rect.bottom + 8, left })
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [open])

  const handleClickNotif = async (n) => {
    if (!n.is_read) await markOne(n.id)
    setOpen(false)
    setSelectedNotif(n.is_read ? n : { ...n, is_read: true })
  }

  const handleMarkOne = async (e, n) => {
    e.stopPropagation()
    await markOne(n.id)
  }

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
        </div>
      )}

      <NotificationModal notification={selectedNotif} onClose={() => setSelectedNotif(null)} />
    </>
  )
}
