import { useEffect, useState, useRef } from "react"
import * as XLSX from "xlsx"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { sendWelcomeEmail } from "../../lib/emailService"

const ROLES = ["admin", "standard_user", "guest"]
const COUNTRIES = ["Singapore", "Malaysia", "Thailand", "Indonesia", "Philippines", "Other"]

const roleColors = {
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  standard_user: "bg-green-500/20 text-green-400 border-green-500/30",
  guest: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const roleLabels = {
  admin: "Admin",
  standard_user: "Standard User",
  guest: "Guest",
}

export default function ManageUsers() {
  const { t } = useTranslation()
  const { userProfile, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "standard_user", country: "Singapore" })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null) // { ok, failed[] }
  const fileInputRef = useRef()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: true })
    setUsers(data || [])
    setLoading(false)
  }

  const handleRoleChange = async (userId, newRole) => {
    if (userId === userProfile?.id && newRole !== "admin") {
      alert("You cannot demote yourself from admin.")
      return
    }
    await supabase.from("user_profiles").update({ role: newRole }).eq("id", userId)
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Save admin's current session before signUp replaces it
      const { data: { session: adminSession } } = await supabase.auth.getSession()

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (error) throw error

      // Insert profile (we're temporarily signed in as the new user)
      await supabase.from("user_profiles").upsert({
        id: data.user.id,
        email: form.email,
        name: form.name,
        role: form.role,
        country: form.country || null,
      })

      // Restore admin session
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      setForm({ name: "", email: "", password: "", role: "standard_user", country: "Singapore" })
      setShowForm(false)
      setSuccess(`Account created for ${form.name || form.email}`)
      setTimeout(() => setSuccess(""), 3000)
      fetchUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle2FA = async (u) => {
    const newVal = !u.two_factor_enabled
    await supabase.from("user_profiles").update({ two_factor_enabled: newVal }).eq("id", u.id)
    setUsers(users.map(x => x.id === u.id ? { ...x, two_factor_enabled: newVal } : x))
    setSuccess(`2FA ${newVal ? "enabled" : "disabled"} for ${u.name || u.email}`)
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImporting(true)
    setImportResult(null)

    try {
      // Parse file → rows
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" })

      if (!raw.length) throw new Error("File is empty or unreadable.")

      // Normalise column names (case-insensitive, trim)
      const normalise = (obj) => {
        const out = {}
        for (const k of Object.keys(obj)) out[k.trim().toLowerCase()] = String(obj[k]).trim()
        return out
      }
      const rows = raw.map(normalise)

      // Detect columns
      const col = (row, ...names) => {
        for (const n of names) if (row[n] !== undefined && row[n] !== "") return row[n]
        return ""
      }

      const { data: { session: adminSession } } = await supabase.auth.getSession()

      let ok = 0
      const failed = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const name  = col(row, "full name", "name", "fullname")
        const email = col(row, "email", "e-mail", "email address")
        const dept  = col(row, "department", "dept")
        const rawRole = col(row, "role").toLowerCase()
        // Normalise legacy role names from old CSV files
        const role  = rawRole === "admin" ? "admin"
                    : rawRole === "standard_user" || rawRole === "standard" || rawRole === "it" ? "standard_user"
                    : rawRole === "guest" || rawRole === "view" || rawRole === "viewer" ? "guest"
                    : "standard_user"
        const rawCountry = col(row, "country")
        const country = COUNTRIES.includes(rawCountry) ? rawCountry : (rawCountry ? "Other" : null)

        if (!email || !email.includes("@")) {
          failed.push({ row: i + 2, email: email || "(blank)", reason: "Invalid or missing email" })
          continue
        }

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!"

        try {
          const { data, error } = await supabase.auth.signUp({ email, password: tempPassword })
          if (error) {
            if (error.message?.toLowerCase().includes("already")) {
              failed.push({ row: i + 2, email, reason: "Account already exists (skipped)" })
            } else {
              failed.push({ row: i + 2, email, reason: error.message })
            }
            continue
          }

          await supabase.from("user_profiles").upsert({
            id: data.user.id, email, name, role,
            ...(dept ? { department: dept } : {}),
            ...(country ? { country } : {}),
          })

          // Restore admin session after each signUp replaces it
          if (adminSession) {
            await supabase.auth.setSession({
              access_token: adminSession.access_token,
              refresh_token: adminSession.refresh_token,
            })
          }

          await sendWelcomeEmail(email, name, role, tempPassword)
          ok++
        } catch (err) {
          failed.push({ row: i + 2, email, reason: err.message || "Unknown error" })
        }
      }

      setImportResult({ ok, failed })
      if (ok > 0) {
        setSuccess(`${ok} user${ok !== 1 ? "s" : ""} imported!`)
        setTimeout(() => setSuccess(""), 5000)
        fetchUsers()
      }
    } catch (err) {
      setImportResult({ ok: 0, failed: [{ row: "—", email: "—", reason: err.message }] })
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteUser = async (u) => {
    if (u.id === userProfile?.id) {
      alert("You cannot delete your own account.")
      return
    }
    if (!confirm(`Delete account for ${u.name || u.email}? This cannot be undone.`)) return
    await supabase.from("user_profiles").delete().eq("id", u.id)
    setUsers(users.filter(x => x.id !== u.id))
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-64">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 text-sm">Only admins can manage users.</p>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-8" style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-green-500/10 border border-green-500/40 rounded-xl p-3 flex items-center gap-2"
          >
            <span>✅</span>
            <p className="text-green-400 text-sm font-medium">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header: side-by-side on desktop, stacked on mobile */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 mb-4 md:mb-6">
        <div>
          <h1 className="text-lg md:text-3xl font-bold text-white">{t("manageUsersTitle")}</h1>
          <p className="text-gray-400 mt-0.5 text-xs md:text-sm">{users.length} team members</p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5"
          >
            {importing ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span className="hidden md:inline">Importing…</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span className="hidden md:inline">Import Users</span>
              </>
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium"
          >
            + {t("addNewUser")}
          </motion.button>
        </div>
      </div>

      {/* Import result panel */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 bg-gray-900/80 border border-gray-700 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">Import Results</p>
              <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            {importResult.ok > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <p className="text-green-400 text-sm font-medium">
                  {importResult.ok} user{importResult.ok !== 1 ? "s" : ""} imported successfully — welcome emails sent.
                </p>
              </div>
            )}
            {importResult.failed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <p className="text-red-400 text-sm font-medium">{importResult.failed.length} row{importResult.failed.length !== 1 ? "s" : ""} failed:</p>
                </div>
                <div className="space-y-1 ml-4">
                  {importResult.failed.map((f, i) => (
                    <p key={i} className="text-gray-400 text-xs">
                      Row {f.row} · <span className="text-gray-300">{f.email}</span> — {f.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-gray-600 text-xs">Expected columns: <span className="text-gray-400">Full Name · Email · Department · Role (admin/standard_user/guest) · Country (optional)</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreateUser}
            className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 mb-6"
          >
            <h2 className="text-white font-semibold mb-4">{t("createUser")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">{t("userName")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sarah Lee"
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">{t("userEmail")}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. sarah@trainocate.com"
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">{t("password")}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">{t("userRole")}</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="standard_user">Standard User — view and submit requests</option>
                  <option value="guest">Guest — view assets and reports only</option>
                  <option value="admin">Admin — full control</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Country *</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  required
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium"
              >
                {creating ? t("creatingUser") : t("createUser")}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm"
              >
                {t("cancel")}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Role legend */}
      <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
        {ROLES.map(r => (
          <span key={r} className={`text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full border font-medium ${roleColors[r]}`}>
            {r === "admin" && "👑 "}
            {r === "standard_user" && "👤 "}
            {r === "guest" && "👁 "}
            {roleLabels[r]}
          </span>
        ))}
        <span className="text-gray-600 text-xs self-center ml-1 hidden md:inline">— click a role badge on a user to change it</span>
      </div>

      {/* Users List */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {users.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/80 rounded-xl border border-gray-800 p-2.5 md:p-4 flex items-center justify-between gap-2 md:gap-4"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0">
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs md:text-sm font-medium truncate">
                    {u.name || "—"}
                    {u.id === userProfile?.id && (
                      <span className="ml-1 text-xs text-gray-500">(you)</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{u.email}</p>
                  {u.country && (
                    <p className="text-gray-600 text-xs mt-0.5">🌏 {u.country}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                {/* Role selector */}
                <div className="flex gap-0.5 md:gap-1">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(u.id, r)}
                      className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border transition-all font-medium ${
                        u.role === r
                          ? roleColors[r]
                          : "bg-transparent border-gray-700 text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      {r === "admin" && "👑"}
                      {r === "standard_user" && "👤"}
                      {r === "guest" && "👁"}
                      <span className="ml-0.5 hidden md:inline">{roleLabels[r]}</span>
                    </button>
                  ))}
                </div>

                {/* 2FA toggle — icon only on mobile */}
                <button
                  onClick={() => handleToggle2FA(u)}
                  title={u.two_factor_enabled ? "2FA enabled — click to disable" : "2FA disabled — click to enable"}
                  className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded border transition-all font-medium ${
                    u.two_factor_enabled
                      ? "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                      : "bg-gray-800 border-gray-700 text-gray-500 hover:border-blue-500/40 hover:text-blue-400"
                  }`}
                >
                  <span>{u.two_factor_enabled ? "🔐" : "🔓"}</span>
                  <span className="hidden md:inline ml-1">2FA</span>
                </button>

                {/* Delete */}
                {u.id !== userProfile?.id && (
                  <button
                    onClick={() => handleDeleteUser(u)}
                    className="text-red-400/50 hover:text-red-400 text-xs md:text-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-red-400/20 hover:border-red-400/40 transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
