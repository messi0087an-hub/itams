import { supabase } from "./supabase"

export async function createNotification(userId, title, body, type = "info", companyId = null) {
  if (!userId) return
  try {
    const payload = {
      user_id: userId,
      title,
      body,
      type,
      is_read: false,
    }
    if (companyId) payload.company_id = companyId
    const { error } = await supabase.from("notifications").insert(payload)
    if (error) console.error("[notifications] insert failed:", error.message, error.details)
  } catch (e) {
    console.error("[notifications] create failed:", e)
  }
}

export async function fetchNotifications(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
    if (error) console.error("[notifications] fetch failed:", error.message, error.details)
    return data || []
  } catch {
    return []
  }
}

export async function markNotificationRead(notificationId) {
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)
  } catch {}
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)
  } catch {}
}

export async function clearAllNotifications(userId) {
  if (!userId) return
  try {
    await supabase.from("notifications").delete().eq("user_id", userId)
  } catch {}
}

// Find a user profile by email — used to get the user_id for in-app notifications
export async function getUserIdByEmail(email) {
  if (!email) return null
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single()
    return data?.id || null
  } catch {
    return null
  }
}
