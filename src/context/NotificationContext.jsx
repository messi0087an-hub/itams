import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "../lib/supabase"
import { markNotificationRead, markAllNotificationsRead, clearAllNotifications } from "../lib/notifications"

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { userProfile } = useAuth()
  const userId = userProfile?.id
  const [notifications, setNotifications] = useState([])

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }, [userId])

  useEffect(() => {
    if (!userId) return
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [userId, load])

  const markOne = useCallback(async (notifId) => {
    await markNotificationRead(notifId)
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
  }, [])

  const markAll = useCallback(async () => {
    if (!userId) return
    await markAllNotificationsRead(userId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }, [userId])

  const clearAll = useCallback(async () => {
    if (!userId) return
    await clearAllNotifications(userId)
    setNotifications([])
  }, [userId])

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <NotificationContext.Provider value={{ notifications, unread, markOne, markAll, clearAll, reload: load }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
