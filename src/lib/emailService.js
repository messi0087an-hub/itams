import { supabase } from "./supabase"

// ---------------------------------------------------------------------------
// Core send (calls Edge Function — keeps API key server-side)
// ---------------------------------------------------------------------------
async function sendEmail(to, subject, html) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean)
  if (!recipients.length) return

  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { to: recipients, subject, html },
    })
    if (error) console.error("[ITAMS email] send error:", error)
  } catch (e) {
    console.error("[ITAMS email] invoke failed:", e)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getAdminEmails() {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("role", "admin")
    return data?.map((u) => u.email).filter(Boolean) ?? []
  } catch {
    return []
  }
}

async function getSentTypes(referenceIds) {
  if (!referenceIds.length) return new Set()
  try {
    const { data } = await supabase
      .from("email_logs")
      .select("type")
      .in("reference_id", referenceIds.map(String))
    return new Set(data?.map((r) => r.type) ?? [])
  } catch {
    return new Set()
  }
}

async function logEmail(type, referenceId) {
  try {
    await supabase.from("email_logs").insert({ type, reference_id: String(referenceId) })
  } catch { /* ignore dup key */ }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })
}

// ---------------------------------------------------------------------------
// HTML Templates
// ---------------------------------------------------------------------------
function baseTemplate(accentColor, inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#3b82f6;border-radius:12px;margin-bottom:10px;">
        <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-1px;">IT</span>
      </div>
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ITAMS</div>
      <div style="color:#4b5563;font-size:11px;margin-top:2px;">IT Asset Management · Trainocate Singapore</div>
    </div>

    <!-- Card -->
    <div style="background:#0d1526;border:1px solid #1a2744;border-radius:16px;overflow:hidden;">
      <div style="height:4px;background:${accentColor};"></div>
      <div style="padding:28px 28px 24px;">
        ${inner}
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:20px;">
      <p style="color:#374151;font-size:11px;margin:0;">Automated notification from ITAMS &nbsp;·&nbsp; © 2026 Trainocate Singapore</p>
    </div>
  </div>
</body>
</html>`
}

function detailRow(label, value, valueColor = "#f9fafb") {
  return `<tr>
    <td style="color:#6b7280;font-size:13px;padding:7px 0;border-bottom:1px solid #1a2744;">${label}</td>
    <td style="color:${valueColor};font-size:13px;font-weight:600;text-align:right;padding:7px 0;border-bottom:1px solid #1a2744;">${value}</td>
  </tr>`
}

function badge(text, color) {
  return `<span style="display:inline-block;background:${color}22;border:1px solid ${color}55;border-radius:100px;padding:3px 14px;color:${color};font-size:12px;font-weight:600;">${text}</span>`
}

// Warranty expiry email
function warrantyHtml(asset, days, expiryDate) {
  const accentColor = days <= 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#3b82f6"
  const emoji = days <= 0 ? "🚨" : days <= 7 ? "⚠️" : "📅"
  const urgency = days <= 0 ? "EXPIRES TODAY" : `${days} DAY${days === 1 ? "" : "S"} LEFT`
  const action = days <= 0
    ? "This warranty has expired. Arrange renewal immediately."
    : "Please arrange renewal before the warranty expires."

  return baseTemplate(accentColor, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Warranty Expiry Alert</div>
      ${badge(urgency, accentColor)}
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Asset Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Asset Name", asset.name)}
        ${asset.asset_tag ? detailRow("Asset Tag", asset.asset_tag) : ""}
        ${asset.serial_number ? detailRow("Serial No.", asset.serial_number) : ""}
        ${detailRow("Warranty Expiry", fmtDate(expiryDate), accentColor)}
        ${asset.assigned_user ? detailRow("Assigned To", asset.assigned_user) : ""}
        ${asset.location ? detailRow("Location", asset.location) : ""}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">${action}</p>
  `)
}

// License expiry email
function licenseHtml(asset, days, expiryDate) {
  const accentColor = days <= 7 ? "#f59e0b" : "#8b5cf6"
  const emoji = days <= 7 ? "⚠️" : "🔑"
  const urgency = `${days} DAY${days === 1 ? "" : "S"} LEFT`

  return baseTemplate(accentColor, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">License Expiry Alert</div>
      ${badge(urgency, accentColor)}
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Asset Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Asset Name", asset.name)}
        ${asset.asset_tag ? detailRow("Asset Tag", asset.asset_tag) : ""}
        ${detailRow("License Expiry", fmtDate(expiryDate), accentColor)}
        ${asset.assigned_user ? detailRow("Assigned To", asset.assigned_user) : ""}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Please renew the license before it expires to avoid service disruption.</p>
  `)
}

// Borrow reminder email
function borrowHtml({ assetName, borrowerName, dueDate, days, isAdmin, isOverdue }) {
  const accentColor = isOverdue ? "#ef4444" : days === 0 ? "#f59e0b" : "#3b82f6"
  const emoji = isOverdue ? "🚨" : days === 0 ? "⏰" : "📅"
  const title = isOverdue ? "Asset Overdue!" : days === 0 ? "Return Due Today!" : "Return Reminder"
  const subtitle = isOverdue
    ? `${assetName} is ${Math.abs(days)} day(s) overdue.`
    : days === 0
    ? `${assetName} must be returned today.`
    : `${assetName} is due back in ${days} day(s).`
  const note = isAdmin
    ? "Please follow up with the borrower to arrange the return."
    : "Please return the asset to the IT office as soon as possible. Thank you!"

  return baseTemplate(accentColor, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">${title}</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">${subtitle}</p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Borrow Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Asset", assetName)}
        ${detailRow("Borrowed By", borrowerName)}
        ${detailRow("Return Date", fmtDate(dueDate), accentColor)}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">${note}</p>
  `)
}

// ---------------------------------------------------------------------------
// Warranty Alerts — called from Dashboard on load
// ---------------------------------------------------------------------------
export async function checkWarrantyAlerts() {
  const adminEmails = await getAdminEmails()
  if (!adminEmails.length) return

  const today = new Date()
  const in31Days = new Date(today)
  in31Days.setDate(today.getDate() + 31)

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, asset_tag, serial_number, warranty_expiry, assigned_user, location")
    .not("warranty_expiry", "is", null)
    .lte("warranty_expiry", in31Days.toISOString().split("T")[0])

  if (!assets?.length) return

  const ids = assets.map((a) => a.id)
  const sent = await getSentTypes(ids)

  for (const asset of assets) {
    const days = Math.ceil(
      (new Date(asset.warranty_expiry) - new Date(today.toDateString())) / 86400000
    )

    const checks = []
    if (days <= 0)  checks.push({ key: `warranty_expired_${asset.id}`, daysLabel: 0 })
    if (days <= 7 && days > 0)  checks.push({ key: `warranty_7_${asset.id}`, daysLabel: days })
    if (days <= 30 && days > 7) checks.push({ key: `warranty_30_${asset.id}`, daysLabel: days })

    for (const { key, daysLabel } of checks) {
      if (sent.has(key)) continue
      const subjectDays = daysLabel <= 0 ? "TODAY" : `in ${daysLabel} day${daysLabel === 1 ? "" : "s"}`
      await sendEmail(
        adminEmails,
        `${daysLabel <= 0 ? "🚨" : daysLabel <= 7 ? "⚠️" : "📅"} Warranty Expiry ${daysLabel <= 0 ? "— TODAY" : `in ${daysLabel}d`}: ${asset.name}`,
        warrantyHtml(asset, daysLabel, asset.warranty_expiry)
      )
      await logEmail(key, asset.id)
    }
  }
}

// ---------------------------------------------------------------------------
// License Alerts — called from Dashboard on load
// ---------------------------------------------------------------------------
export async function checkLicenseAlerts() {
  const adminEmails = await getAdminEmails()
  if (!adminEmails.length) return

  const today = new Date()
  const in31Days = new Date(today)
  in31Days.setDate(today.getDate() + 31)

  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, asset_tag, license_expiry, assigned_user")
    .not("license_expiry", "is", null)
    .lte("license_expiry", in31Days.toISOString().split("T")[0])
    .gte("license_expiry", today.toISOString().split("T")[0])

  if (!assets?.length) return

  const ids = assets.map((a) => a.id)
  const sent = await getSentTypes(ids)

  for (const asset of assets) {
    const days = Math.ceil(
      (new Date(asset.license_expiry) - new Date(today.toDateString())) / 86400000
    )

    const checks = []
    if (days <= 7)  checks.push(`license_7_${asset.id}`)
    if (days <= 30 && days > 7) checks.push(`license_30_${asset.id}`)

    for (const key of checks) {
      if (sent.has(key)) continue
      const dLabel = days <= 7 ? days : 30
      await sendEmail(
        adminEmails,
        `${days <= 7 ? "⚠️" : "🔑"} License Expiry in ${days}d: ${asset.name}`,
        licenseHtml(asset, days, asset.license_expiry)
      )
      await logEmail(key, asset.id)
    }
  }
}

// ---------------------------------------------------------------------------
// Borrow Reminders — called from Borrow page on load
// ---------------------------------------------------------------------------
export async function checkBorrowReminders() {
  const adminEmails = await getAdminEmails()

  const { data: borrows } = await supabase
    .from("borrow_history")
    .select("id, asset_id, due_date, borrower_name, borrower_email, assets(name)")
    .is("returned_at", null)
    .not("due_date", "is", null)

  if (!borrows?.length) return

  const ids = borrows.map((b) => b.id)
  const sent = await getSentTypes(ids)

  const today = new Date(new Date().toDateString())

  for (const borrow of borrows) {
    const assetName = borrow.assets?.name || "Asset"
    const borrowerName = borrow.borrower_name || "Team Member"
    const borrowerEmail = borrow.borrower_email || null
    const due = new Date(borrow.due_date)
    const days = Math.ceil((due - today) / 86400000)

    // 2 days before — email borrower only
    if (days <= 2 && days > 0) {
      const key = `borrow_2d_${borrow.id}`
      if (!sent.has(key) && borrowerEmail) {
        await sendEmail(
          borrowerEmail,
          `📅 Return Reminder: ${assetName} due in ${days} day${days === 1 ? "" : "s"}`,
          borrowHtml({ assetName, borrowerName, dueDate: borrow.due_date, days, isAdmin: false, isOverdue: false })
        )
        await logEmail(key, borrow.id)
      }
    }

    // Due today — email both
    if (days === 0) {
      if (borrowerEmail) {
        const key = `borrow_due_emp_${borrow.id}`
        if (!sent.has(key)) {
          await sendEmail(
            borrowerEmail,
            `⏰ Return Due Today: ${assetName}`,
            borrowHtml({ assetName, borrowerName, dueDate: borrow.due_date, days: 0, isAdmin: false, isOverdue: false })
          )
          await logEmail(key, borrow.id)
        }
      }
      if (adminEmails.length) {
        const key = `borrow_due_admin_${borrow.id}`
        if (!sent.has(key)) {
          await sendEmail(
            adminEmails,
            `⏰ Asset Return Due Today: ${assetName} (${borrowerName})`,
            borrowHtml({ assetName, borrowerName, dueDate: borrow.due_date, days: 0, isAdmin: true, isOverdue: false })
          )
          await logEmail(key, borrow.id)
        }
      }
    }

    // Overdue — email admin only (once)
    if (days < 0 && adminEmails.length) {
      const key = `borrow_overdue_${borrow.id}`
      if (!sent.has(key)) {
        await sendEmail(
          adminEmails,
          `🚨 OVERDUE: ${assetName} not returned (${borrowerName})`,
          borrowHtml({ assetName, borrowerName, dueDate: borrow.due_date, days, isAdmin: true, isOverdue: true })
        )
        await logEmail(key, borrow.id)
      }
    }
  }
}
