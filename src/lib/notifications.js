import { supabase } from "./supabase"

export async function createNotification(userId, title, body, type = "info", referenceId = null) {
  if (!userId) return
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      title,
      body,
      type,
      reference_id: referenceId ? String(referenceId) : null,
      is_read: false,
    })
  } catch (e) {
    console.error("[ITAMS notifications] create failed:", e)
  }
}

export async function fetchNotifications(userId) {
  if (!userId) return []
  try {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
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
