import { supabase } from "./supabase"

export async function createNotification(userId, title, body, type = "info", companyId = null, targetUserId = null) {
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
    // target_user_id scopes the notification to a specific recipient
    if (targetUserId) payload.target_user_id = targetUserId
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
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
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
    await supabase.from("notifications").update({ is_read: true }).eq("target_user_id", userId).eq("is_read", false)
  } catch {}
}

export async function clearAllNotifications(userId) {
  if (!userId) return
  try {
    await supabase.from("notifications").delete().eq("target_user_id", userId)
  } catch {}
}

// Notify all admin users in a given country — one targeted notification per admin
export async function notifyAdmins(country, title, body, type = "info") {
  try {
    let q = supabase.from("user_profiles").select("id").eq("role", "admin")
    if (country) q = q.eq("country", country)
    const { data } = await q
    if (!data?.length) return
    await Promise.all(data.map(admin =>
      createNotification(admin.id, title, body, type, country, admin.id)
    ))
  } catch (e) {
    console.error("[notifications] notifyAdmins failed:", e)
  }
}

// Notify a user identified by email or name stored in reported_by / created_by
export async function notifyUserByIdentifier(identifier, title, body, type = "info") {
  if (!identifier) return
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, country")
      .or(`email.eq.${identifier},name.eq.${identifier}`)
      .limit(1)
      .single()
    if (data?.id) createNotification(data.id, title, body, type, data.country, data.id)
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
