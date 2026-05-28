import { useEffect, useState, useRef } from "react"
import * as XLSX from "xlsx"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"

const ROLES = ["admin", "standard_user", "guest"]
const COUNTRIES = ["Singapore", "Malaysia", "Thailand", "Indonesia", "Philippines", "Vietnam", "Taiwan", "Hong Kong", "India", "Japan", "Sri Lanka", "Gulf (UAE)"]

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
  const adminCountry = userProfile?.country || "Singapore"

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "standard_user", country: "Singapore", department: "" })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", role: "standard_user", country: "Singapore", department: "", marketing_access: false })
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef()

  // Keep form country in sync with admin's country
  useEffect(() => {
    if (userProfile?.country) {
      setForm(prev => ({ ...prev, country: userProfile.country }))
    }
  }, [userProfile?.country])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const [{ data: profileData }, { data: authData }] = await Promise.all([
      supabase.from("user_profiles").select("*").order("created_at", { ascending: true }),
      supabase.rpc("get_auth_users"),
    ])
    const emailMap = {}
    authData?.forEach(u => { emailMap[u.id] = u.email })
    const merged = (profileData || []).map(u => ({
      ...u,
      email: emailMap[u.id] || u.email,
    }))
    setUsers(merged)
    setLoading(false)
  }

  const showSuccess = (msg) => {
    setSuccess(msg)
    setError("")
    setTimeout(() => setSuccess(""), 4000)
  }

  const showError = (msg) => {
    setError(msg)
    setSuccess("")
    setTimeout(() => setError(""), 6000)
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
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error: fnError } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role,
          country: adminCountry,
          department: form.department || null,
        },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      })

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || "Failed to create user")
      }

      setForm({ name: "", email: "", password: "", role: "standard_user", country: adminCountry, department: "" })
      setShowForm(false)
      showSuccess(`Account created for ${form.name || form.email}. Welcome email sent!`)
      fetchUsers()
    } catch (err) {
      showError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle2FA = async (u) => {
    const newVal = !u.two_factor_enabled
    await supabase.from("user_profiles").update({ two_factor_enabled: newVal }).eq("id", u.id)
    setUsers(users.map(x => x.id === u.id ? { ...x, two_factor_enabled: newVal } : x))
    showSuccess(`2FA ${newVal ? "enabled" : "disabled"} for ${u.name || u.email}`)
  }

  const handleToggleMarketing = async (u) => {
    const newVal = !u.marketing_access
    const { error: updateErr } = await supabase.from("user_profiles").update({ marketing_access: newVal }).eq("id", u.id)
    if (updateErr) {
      showError(`Failed to update marketing access: ${updateErr.message}`)
      return
    }
    setUsers(users.map(x => x.id === u.id ? { ...x, marketing_access: newVal } : x))
    showSuccess(`Marketing access ${newVal ? "granted to" : "removed from"} ${u.name || u.email}`)
  }

  const handleEditUser = (u) => {
    setEditForm({
      name: u.name || "",
      role: u.role || "standard_user",
      country: u.country || "Singapore",
      department: u.department || "",
      marketing_access: !!u.marketing_access,
    })
    setEditTarget(u)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      const { error: updateErr } = await supabase.from("user_profiles").update({
        name: editForm.name,
        role: editForm.role,
        country: editForm.country,
        department: editForm.department || null,
        marketing_access: editForm.marketing_access,
      }).eq("id", editTarget.id)

      if (updateErr) throw updateErr

      setUsers(users.map(u => u.id === editTarget.id ? {
        ...u,
        name: editForm.name,
        role: editForm.role,
        country: editForm.country,
        department: editForm.department || null,
        marketing_access: editForm.marketing_access,
      } : u))

      showSuccess(`${editForm.name || editTarget.email}'s profile updated.`)
      setEditTarget(null)
    } catch (err) {
      showError(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImporting(true)
    setImportResult(null)

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" })

      if (!raw.length) throw new Error("File is empty or unreadable.")

      const normalise = (obj) => {
        const out = {}
        for (const k of Object.keys(obj)) out[k.trim().toLowerCase()] = String(obj[k]).trim()
        return out
      }
      const rows = raw.map(normalise)

      const col = (row, ...names) => {
        for (const n of names) if (row[n] !== undefined && row[n] !== "") return row[n]
        return ""
      }

      const { data: { session } } = await supabase.auth.getSession()

      let ok = 0
      const failed = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const name  = col(row, "full name", "name", "fullname")
        const email = col(row, "email", "e-mail", "email address")
        const dept  = col(row, "department", "dept")
        const rawRole = col(row, "role").toLowerCase()
        const role  = rawRole === "admin" ? "admin"
                    : rawRole === "standard_user" || rawRole === "standard" || rawRole === "it" ? "standard_user"
                    : rawRole === "guest" || rawRole === "view" || rawRole === "viewer" ? "guest"
                    : "standard_user"
        const rawCountry = col(row, "country")
        const country = COUNTRIES.includes(rawCountry) ? rawCountry : (rawCountry ? "Other" : adminCountry)

        if (!email || !email.includes("@")) {
          failed.push({ row: i + 2, email: email || "(blank)", reason: "Invalid or missing email" })
          continue
        }

        const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!"

        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("create-user", {
            body: { email, password: tempPassword, name, role, country, department: dept || null },
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {},
          })

          if (fnError || fnData?.error) {
            const errMsg = fnData?.error || fnError?.message || "Unknown error"
            if (errMsg.toLowerCase().includes("already") || errMsg.toLowerCase().includes("exists")) {
              failed.push({ row: i + 2, email, reason: "Account already exists (skipped)" })
            } else {
              failed.push({ row: i + 2, email, reason: errMsg })
            }
            continue
          }
          ok++
        } catch (err) {
          failed.push({ row: i + 2, email, reason: err.message || "Unknown error" })
        }
      }

      setImportResult({ ok, failed })
      if (ok > 0) {
        showSuccess(`${ok} user${ok !== 1 ? "s" : ""} imported!`)
        fetchUsers()
      }
    } catch (err) {
      setImportResult({ ok: 0, failed: [{ row: "—", email: "—", reason: err.message }] })
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteUser = (u) => {
    if (u.id === userProfile?.id) {
      alert("You cannot delete your own account.")
      return
    }
    setDeleteTarget(u)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { data, error: fnErr } = await supabase.functions.invoke("delete-user", {
        body: { userId: deleteTarget.id },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      })

      if (fnErr || data?.error) {
        throw new Error(data?.error || fnErr?.message || "Failed to delete user")
      }

      setUsers(users.filter(x => x.id !== deleteTarget.id))
      showSuccess(`${deleteTarget.name || deleteTarget.email} has been permanently deleted.`)
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
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
            key="success-toast"
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

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-toast"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-center gap-2"
          >
            <span>❌</span>
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            key="delete-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              key="delete-card"
              initial={{ scale: 0.82, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.82, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "rgba(9, 13, 28, 0.96)",
                backdropFilter: "blur(18px)",
                border: "0.5px solid rgba(239,68,68,0.65)",
                boxShadow: "0 0 28px rgba(239,68,68,0.22), 0 0 80px rgba(239,68,68,0.08), 0 20px 60px rgba(0,0,0,0.5)",
                borderRadius: "20px",
                padding: "32px 28px",
                maxWidth: "380px",
                width: "100%",
              }}
            >
              <div className="flex justify-center mb-5">
                <motion.div
                  animate={{ scale: [1, 1.13, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    background: "rgba(239,68,68,0.12)",
                    border: "1.5px solid rgba(239,68,68,0.45)",
                    borderRadius: "50%",
                  }}
                >
                  <span style={{ fontSize: 28 }}>⚠️</span>
                </motion.div>
              </div>

              <h2 className="text-white text-xl font-bold text-center mb-2">Delete Account?</h2>
              <p className="text-gray-400 text-sm text-center leading-relaxed mb-7">
                You are about to delete{" "}
                <span className="text-red-400 font-bold">{deleteTarget.name || deleteTarget.email}</span>
                's account.{" "}
                <span className="text-gray-300">This action cannot be undone!</span>
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ boxShadow: "0 0 14px rgba(59,130,246,0.35)", borderColor: "rgba(59,130,246,0.55)" }}
                  onClick={() => !deleting && setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white transition-all font-medium text-sm disabled:opacity-40"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={!deleting ? {
                    scale: 1.03,
                    x: [0, -4, 4, -3, 3, -2, 2, 0],
                    transition: { x: { duration: 0.4 }, scale: { duration: 0.15 } },
                  } : {}}
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: deleting ? "rgba(239,68,68,0.5)" : "linear-gradient(135deg, #dc2626, #ef4444)",
                    boxShadow: "0 0 16px rgba(239,68,68,0.25)",
                  }}
                >
                  {deleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting…
                    </>
                  ) : "Delete"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit User Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            key="edit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
            onClick={() => !saving && setEditTarget(null)}
          >
            <motion.div
              key="edit-card"
              initial={{ scale: 0.82, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.82, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "rgba(9, 13, 28, 0.96)",
                backdropFilter: "blur(18px)",
                border: "0.5px solid rgba(59,130,246,0.5)",
                boxShadow: "0 0 28px rgba(59,130,246,0.15), 0 20px 60px rgba(0,0,0,0.5)",
                borderRadius: "20px",
                padding: "28px 24px",
                maxWidth: "420px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <h2 className="text-white text-lg font-bold mb-1">Edit User</h2>
              <p className="text-gray-500 text-sm mb-5 font-mono">{editTarget.email}</p>

              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Sarah Lee"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Role</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  >
                    <option value="standard_user">Standard User</option>
                    <option value="guest">Guest</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Country</label>
                  <select
                    value={editForm.country}
                    onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. IT, Finance, Operations"
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>

                {/* Marketing Access toggle */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div>
                    <p className="text-white text-sm font-medium">Marketing Access</p>
                    <p className="text-gray-500 text-xs mt-0.5">Access to Marketing module</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, marketing_access: !f.marketing_access }))}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${editForm.marketing_access ? "bg-purple-600" : "bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${editForm.marketing_access ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ boxShadow: "0 0 14px rgba(59,130,246,0.25)" }}
                  onClick={() => !saving && setEditTarget(null)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white transition-all font-medium text-sm disabled:opacity-40"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{
                    background: saving ? "rgba(59,130,246,0.5)" : "linear-gradient(135deg, #2563eb, #3b82f6)",
                    boxShadow: "0 0 16px rgba(59,130,246,0.25)",
                  }}
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : "Save Changes"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 mb-4 md:mb-6">
        <div>
          <h1 className="text-lg md:text-3xl font-bold text-white">{t("manageUsersTitle")}</h1>
          <p className="text-gray-400 mt-0.5 text-xs md:text-sm">{users.length} team members</p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
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
            onClick={() => {
              setForm({ name: "", email: "", password: "", role: "standard_user", country: adminCountry, department: "" })
              setShowForm(v => !v)
            }}
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
                  onChange={e => setForm({ ...form, name: e.target.value })}
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
                  onChange={e => setForm({ ...form, email: e.target.value })}
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
                  onChange={e => setForm({ ...form, password: e.target.value })}
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
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="standard_user">Standard User — view and submit requests</option>
                  <option value="guest">Guest — view assets and reports only</option>
                  <option value="admin">Admin — full control</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. IT, Finance, Operations"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Country</label>
                <div className="w-full bg-gray-800/50 text-gray-300 rounded-lg px-4 py-3 border border-gray-700 text-sm flex items-center justify-between">
                  <span>{adminCountry}</span>
                  <span className="text-gray-600 text-xs">🌏 Your region</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("creatingUser")}
                  </>
                ) : t("createUser")}
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

                {/* 2FA toggle */}
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

                {/* Marketing access toggle */}
                <button
                  onClick={() => handleToggleMarketing(u)}
                  title={u.marketing_access ? "Marketing access — click to revoke" : "No marketing access — click to grant"}
                  className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded border transition-all font-medium ${
                    u.marketing_access
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                      : "bg-gray-800 border-gray-700 text-gray-500 hover:border-purple-500/40 hover:text-purple-400"
                  }`}
                >
                  <span>🎯</span>
                  <span className="hidden md:inline ml-1">Mktg</span>
                </button>

                {/* Edit button */}
                <button
                  onClick={() => handleEditUser(u)}
                  title="Edit user"
                  className="text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded border transition-all text-blue-400/60 hover:text-blue-400 border-blue-400/20 hover:border-blue-400/50 hover:bg-blue-500/10"
                >
                  ✏️
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
