import { supabase } from "./supabase"

// ---------------------------------------------------------------------------
// Core send (calls Edge Function — keeps API key server-side)
// ---------------------------------------------------------------------------
export async function sendEmail(to, subject, html) {
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
export async function getAdminEmails() {
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
      <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Trainocate Asset Portal</div>
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
      <p style="color:#374151;font-size:11px;margin:0;">Automated notification from Trainocate Asset Portal &nbsp;·&nbsp; © 2026 Trainocate Singapore</p>
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
// Asset Request Approval email — sent when employee submits a request
// ---------------------------------------------------------------------------
async function getApprovingOfficerEmail() {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "approving_officer_email")
      .single()
    return data?.value || "jamaludin.ali@trainocate.com"
  } catch {
    return "jamaludin.ali@trainocate.com"
  }
}

// Returns { email, id } so callers can also create in-app notifications
export async function getApprovingOfficerProfile() {
  try {
    const email = await getApprovingOfficerEmail()
    const { data } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", email)
      .single()
    return { email, id: data?.id || null }
  } catch {
    return { email: "jamaludin.ali@trainocate.com", id: null }
  }
}

function assetRequestHtml({ requestedBy, assetType, reason, priority, dateSubmitted }) {
  const priorityColor = priority === "high" ? "#ef4444" : priority === "medium" ? "#f59e0b" : "#6b7280"
  const priorityLabel = priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low"

  return baseTemplate("#3b82f6", `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">📋</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">New Asset Request</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">A team member has submitted an asset request requiring your approval.</p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Request Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Requested by", requestedBy)}
        ${detailRow("Asset needed", assetType)}
        ${detailRow("Reason", reason)}
        ${detailRow("Priority", priorityLabel, priorityColor)}
        ${detailRow("Date submitted", dateSubmitted)}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Please log in to Trainocate Asset Portal to approve or reject this request.</p>
  `)
}

export async function sendAssetRequestNotification({ requestedBy, assetType, reason, priority, createdAt }) {
  const to = await getApprovingOfficerEmail()
  const dateSubmitted = fmtDate(createdAt || new Date().toISOString())
  const html = assetRequestHtml({ requestedBy, assetType, reason, priority, dateSubmitted })
  await sendEmail(to, `📋 New Asset Request: ${assetType} (${priority} priority)`, html)
}

// ---------------------------------------------------------------------------
// New Asset Request — sent to ALL admin users (in addition to the approving officer)
// ---------------------------------------------------------------------------
export async function sendNewRequestAdminEmail(adminEmails, requestedBy, assetType) {
  if (!adminEmails?.length) return
  const html = baseTemplate("#3b82f6", `
    <div style="text-align:center;">
      <div style="font-size:44px;margin-bottom:10px;">📋</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">New Asset Request</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">${requestedBy} has submitted an asset request for ${assetType}. Please login to approve or reject.</p>
    </div>
  `)
  await sendEmail(adminEmails, "New Asset Request — Action Required", html)
}

// ---------------------------------------------------------------------------
// Approval Decision email — sent to requester when approved or rejected
// ---------------------------------------------------------------------------
function approvalDecisionHtml({ status, requestedBy, assetType, adminResponse, actionedBy }) {
  const approved = status === "approved"
  const accentColor = approved ? "#22c55e" : "#ef4444"
  const emoji = approved ? "✅" : "❌"
  const title = approved ? "Request Approved!" : "Request Rejected"
  const subtitle = `Your request for <strong style="color:#f9fafb;">${assetType}</strong> has been ${approved ? "approved" : "rejected"} by ${actionedBy || "your admin"}. Notes: ${adminResponse || "None"}`

  return baseTemplate(accentColor, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">${title}</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">${subtitle}</p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Decision Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Requested by", requestedBy)}
        ${detailRow("Asset", assetType)}
        ${detailRow("Decision", approved ? "Approved" : "Rejected", accentColor)}
        ${actionedBy ? detailRow("Actioned by", actionedBy) : ""}
        ${adminResponse ? detailRow("Note", adminResponse) : ""}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
      ${approved
        ? "Please follow up with your IT admin regarding next steps."
        : "Please contact your admin if you have questions about this decision."}
    </p>
  `)
}

export async function sendApprovalDecisionEmail({ status, requestedByEmail, requestedBy, assetType, adminResponse, actionedBy }) {
  if (!requestedByEmail) return
  const approved = status === "approved"
  const subject = `Your Asset Request has been ${approved ? "Approved" : "Rejected"}`
  const html = approvalDecisionHtml({ status, requestedBy, assetType, adminResponse, actionedBy })
  await sendEmail(requestedByEmail, subject, html)
}

// ---------------------------------------------------------------------------
// Approval Reminder — called from Dashboard on every load
// Sends reminder at 3 days, second reminder at 7 days
// ---------------------------------------------------------------------------
function approvalReminderHtml({ requestedBy, assetType, dateSubmitted, daysPending, isSecond }) {
  const accentColor = isSecond ? "#ef4444" : "#f59e0b"
  const emoji = isSecond ? "🚨" : "⏰"
  const urgency = isSecond ? "URGENT: Second Reminder" : "Reminder"

  return baseTemplate(accentColor, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">
        ${urgency}: Asset Request Awaiting Approval
      </div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">
        This request has been pending for <strong style="color:#f9fafb;">${daysPending} days</strong> without a decision.
      </p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Pending Request</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Requested by", requestedBy)}
        ${detailRow("Asset needed", assetType)}
        ${detailRow("Date submitted", dateSubmitted)}
        ${detailRow("Days pending", String(daysPending), accentColor)}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Please log in to Trainocate Asset Portal to approve or reject this request.</p>
  `)
}

export async function checkApprovalReminders() {
  const officerEmail = await getApprovingOfficerEmail()
  if (!officerEmail) return

  const today = new Date()
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(today.getDate() - 3)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)

  const { data: pending } = await supabase
    .from("asset_requests")
    .select("id, requested_by, asset_type, created_at, approving_officer_email")
    .eq("status", "pending")
    .lte("created_at", threeDaysAgo.toISOString())

  if (!pending?.length) return

  const ids = pending.map(r => r.id)
  const sent = await getSentTypes(ids)

  for (const req of pending) {
    const daysPending = Math.floor((today - new Date(req.created_at)) / 86400000)
    const to = req.approving_officer_email || officerEmail
    const dateSubmitted = fmtDate(req.created_at)

    // 7-day second reminder (check first so we don't double-log)
    if (daysPending >= 7) {
      const key = `approval_reminder_7_${req.id}`
      if (!sent.has(key)) {
        await sendEmail(to, `🚨 URGENT: Asset request pending ${daysPending} days — ${req.asset_type}`,
          approvalReminderHtml({ requestedBy: req.requested_by, assetType: req.asset_type, dateSubmitted, daysPending, isSecond: true }))
        await logEmail(key, req.id)
      }
      continue
    }

    // 3-day first reminder
    if (daysPending >= 3) {
      const key = `approval_reminder_3_${req.id}`
      if (!sent.has(key)) {
        await sendEmail(to, `⏰ Reminder: Asset request pending ${daysPending} days — ${req.asset_type}`,
          approvalReminderHtml({ requestedBy: req.requested_by, assetType: req.asset_type, dateSubmitted, daysPending, isSecond: false }))
        await logEmail(key, req.id)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Welcome email — sent after bulk user import
// ---------------------------------------------------------------------------
export async function sendWelcomeEmail(toEmail, name, role, tempPassword) {
  const roleLabel = role === "admin" ? "Admin" : role === "standard_user" ? "Standard User" : "Guest"
  const loginUrl = `${window.location.origin}/login`
  const html = baseTemplate("#3b82f6", `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">👋</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Welcome to Trainocate Asset Portal!</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Your account has been created, ${name || toEmail}.</p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Your Login Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Email", toEmail)}
        ${detailRow("Temporary Password", tempPassword, "#f59e0b")}
        ${detailRow("Role", roleLabel)}
      </table>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${loginUrl}" style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">Login to Trainocate Asset Portal →</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">Please change your password after first login. If you did not expect this email, please contact your IT administrator.</p>
  `)
  await sendEmail(toEmail, "Welcome to Trainocate Asset Portal — Your account is ready", html)
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

// ---------------------------------------------------------------------------
// Marketing Distribution Notification — sent to officer when request submitted
// ---------------------------------------------------------------------------
export async function sendMarketingDistributionNotification({
  officerEmail, itemName, requestedBy, quantity, unit, distributedTo, purpose, createdAt,
}) {
  if (!officerEmail) return
  const html = baseTemplate("#8b5cf6", `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">📦</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Marketing Distribution Request</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">A team member has submitted a distribution request requiring your approval.</p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="color:#4b5563;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Request Details</div>
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Item", itemName)}
        ${detailRow("Requested by", requestedBy)}
        ${detailRow("Quantity", `${quantity} ${unit}`)}
        ${detailRow("Distributed to", distributedTo)}
        ${purpose ? detailRow("Purpose", purpose) : ""}
        ${detailRow("Submitted", fmtDate(createdAt || new Date().toISOString()))}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Please log in to Trainocate Asset Portal to approve or reject this distribution request.</p>
  `)
  await sendEmail(officerEmail, `📦 Marketing Distribution Request: ${quantity} ${unit} of ${itemName}`, html)
}

// ---------------------------------------------------------------------------
// Marketing Decision email — sent to requester after officer approves/rejects
// ---------------------------------------------------------------------------
export async function sendMarketingDecisionEmail({
  requesterEmail, itemName, quantity, unit, decision, distributedTo, actionedBy, reason,
}) {
  if (!requesterEmail) return
  const isApproved = decision === "approved"
  const accentColor = isApproved ? "#22c55e" : "#ef4444"
  const emoji = isApproved ? "✅" : "❌"

  const html = baseTemplate(accentColor, `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:44px;margin-bottom:10px;">${emoji}</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Distribution ${isApproved ? "Approved" : "Rejected"}</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Your distribution request has been reviewed.</p>
    </div>
    <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${detailRow("Item", itemName)}
        ${detailRow("Quantity", `${quantity} ${unit}`)}
        ${detailRow("Distributed to", distributedTo)}
        ${detailRow("Decision", isApproved ? "Approved" : "Rejected", accentColor)}
        ${detailRow("Reviewed by", actionedBy)}
        ${reason ? detailRow("Reason", reason) : ""}
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">${isApproved ? "Your distribution has been approved and recorded." : "Please contact the marketing manager if you have questions."}</p>
  `)
  await sendEmail(requesterEmail, `${emoji} Distribution ${isApproved ? "Approved" : "Rejected"}: ${quantity} ${unit} of ${itemName}`, html)
}

// ---------------------------------------------------------------------------
// Marketing Reminders — called from Dashboard on load
// ---------------------------------------------------------------------------
export async function checkMarketingReminders() {
  try {
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "marketing_approving_officer_email")
      .single()
    const officerEmail = setting?.value
    if (!officerEmail) return

    const { data: dists } = await supabase
      .from("marketing_distributions")
      .select("id, item_id, quantity, distributed_to, created_at, marketing_items(name, unit_of_measurement)")
      .eq("status", "pending")

    if (!dists?.length) return

    const ids = dists.map((d) => d.id)
    const sent = await getSentTypes(ids)
    const today = new Date()

    for (const dist of dists) {
      const days = Math.floor((today - new Date(dist.created_at)) / 86400000)
      const itemName = dist.marketing_items?.name || "Marketing Item"
      const unit = dist.marketing_items?.unit_of_measurement || "pcs"

      const checks = []
      if (days >= 7) checks.push({ key: `mktg_reminder_7_${dist.id}`, label: "7 days" })
      else if (days >= 3) checks.push({ key: `mktg_reminder_3_${dist.id}`, label: "3 days" })

      for (const { key, label } of checks) {
        if (sent.has(key)) continue
        const html = baseTemplate("#8b5cf6", `
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:44px;margin-bottom:10px;">${days >= 7 ? "🚨" : "⏰"}</div>
            <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Pending Distribution — ${label} old</div>
            <p style="color:#9ca3af;font-size:14px;margin:0;">A marketing distribution request has been awaiting approval for ${label}.</p>
          </div>
          <div style="background:#060d1c;border:1px solid #1a2744;border-radius:10px;padding:16px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              ${detailRow("Item", itemName)}
              ${detailRow("Quantity", `${dist.quantity} ${unit}`)}
              ${detailRow("Distributed to", dist.distributed_to)}
              ${detailRow("Submitted", fmtDate(dist.created_at))}
            </table>
          </div>
          <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Please log in to Trainocate Asset Portal to approve or reject this request.</p>
        `)
        await sendEmail(officerEmail, `${days >= 7 ? "🚨" : "⏰"} Distribution Reminder (${label}): ${dist.quantity} ${unit} of ${itemName}`, html)
        await logEmail(key, dist.id)
      }
    }
  } catch { /* silently skip if marketing tables not yet created */ }
}

// ---------------------------------------------------------------------------
// Issue Resolved — sent to the reporter when an admin resolves their issue
// ---------------------------------------------------------------------------
export async function sendIssueResolvedEmail(toEmail, assetName, actionedBy) {
  if (!toEmail) return
  const html = baseTemplate("#22c55e", `
    <div style="text-align:center;">
      <div style="font-size:44px;margin-bottom:10px;">✅</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Issue Resolved</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Your reported issue for ${assetName} has been resolved by ${actionedBy}.</p>
    </div>
  `)
  await sendEmail(toEmail, "Your Issue has been Resolved", html)
}

// ---------------------------------------------------------------------------
// Maintenance Completed — sent to the requester when their schedule is completed
// ---------------------------------------------------------------------------
export async function sendMaintenanceCompletedEmail(toEmail, assetName) {
  if (!toEmail) return
  const html = baseTemplate("#22c55e", `
    <div style="text-align:center;">
      <div style="font-size:44px;margin-bottom:10px;">🔧</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Maintenance Completed</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Maintenance for ${assetName} has been completed.</p>
    </div>
  `)
  await sendEmail(toEmail, "Maintenance Completed", html)
}

// ---------------------------------------------------------------------------
// Borrow Update — sent to the borrower when their borrow is approved or returned
// ---------------------------------------------------------------------------
export async function sendBorrowUpdateEmail(toEmail, assetName, action) {
  if (!toEmail) return
  const html = baseTemplate("#3b82f6", `
    <div style="text-align:center;">
      <div style="font-size:44px;margin-bottom:10px;">📦</div>
      <div style="color:#fff;font-size:19px;font-weight:700;margin-bottom:8px;">Asset Borrow Update</div>
      <p style="color:#9ca3af;font-size:14px;margin:0;">Your borrow request for ${assetName} has been ${action}.</p>
    </div>
  `)
  await sendEmail(toEmail, "Asset Borrow Update", html)
}
