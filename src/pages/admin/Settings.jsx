import { useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { CURRENCIES } from "../../lib/useCurrency"

const BACKUP_TABLES = [
  "assets", "user_profiles", "borrow_history", "issues",
  "maintenance_schedules", "asset_requests", "notifications", "system_settings",
]

async function fetchBackupData() {
  const results = await Promise.all(
    BACKUP_TABLES.map(table => supabase.from(table).select("*"))
  )
  const data = {}
  BACKUP_TABLES.forEach((table, i) => { data[table] = results[i].data || [] })
  return data
}

export default function Settings() {
  const { isAdmin } = useAuth()
  const [approvingEmail, setApprovingEmail] = useState("")
  const [marketingEmail, setMarketingEmail] = useState("")
  const [currency, setCurrency] = useState("SGD")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMarketing, setSavingMarketing] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [backingUpExcel, setBackingUpExcel] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([fetchSettings(), fetchUsers(), fetchCurrency()])
  }, [])

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
      if (data) {
        const map = {}
        data.forEach(s => { map[s.key] = s.value })
        if (map.approving_officer_email) setApprovingEmail(map.approving_officer_email)
        if (map.marketing_approving_officer_email !== undefined) setMarketingEmail(map.marketing_approving_officer_email)
      }
    } catch { /* table may not exist yet — use defaults */ }
    setLoading(false)
  }

  const fetchCurrency = async () => {
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("currency")
        .eq("id", "global")
        .single()
      if (data?.currency) setCurrency(data.currency)
    } catch { /* table may not exist yet — use default */ }
  }

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, name, email, role")
        .order("name")
      setUsers(data || [])
    } catch {}
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!approvingEmail) return
    setSaving(true)
    setError("")
    try {
      const { error: upsertError } = await supabase.from("app_settings").upsert({
        key: "approving_officer_email",
        value: approvingEmail.trim(),
        updated_at: new Date().toISOString(),
      })
      if (upsertError) throw upsertError
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || "Failed to save settings.")
    }
    setSaving(false)
  }

  const handleSaveMarketing = async (e) => {
    e.preventDefault()
    setSavingMarketing(true)
    setError("")
    try {
      const { error: upsertError } = await supabase.from("app_settings").upsert({
        key: "marketing_approving_officer_email",
        value: marketingEmail.trim(),
        updated_at: new Date().toISOString(),
      })
      if (upsertError) throw upsertError
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || "Failed to save settings.")
    }
    setSavingMarketing(false)
  }

  const handleSaveCurrency = async (e) => {
    e.preventDefault()
    setSavingCurrency(true)
    setError("")
    try {
      const { error: upsertError } = await supabase.from("system_settings").upsert({
        id: "global",
        currency,
        updated_at: new Date().toISOString(),
      })
      if (upsertError) throw upsertError
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || "Failed to save currency settings.")
    }
    setSavingCurrency(false)
  }

  const handleExportBackup = async () => {
    setBackingUp(true)
    setError("")
    try {
      const data = await fetchBackupData()
      const payload = {
        exported_at: new Date().toISOString(),
        source: "Trainocate Asset Portal",
        tables: data,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tap-backup-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || "Failed to export backup.")
    }
    setBackingUp(false)
  }

  const handleExportBackupExcel = async () => {
    setBackingUpExcel(true)
    setError("")
    try {
      const data = await fetchBackupData()
      const wb = XLSX.utils.book_new()
      BACKUP_TABLES.forEach(table => {
        const ws = XLSX.utils.json_to_sheet(data[table])
        XLSX.utils.book_append_sheet(wb, ws, table)
      })
      XLSX.writeFile(wb, `tap-backup-${new Date().toISOString().split("T")[0]}.xlsx`)
    } catch (err) {
      setError(err.message || "Failed to export Excel backup.")
    }
    setBackingUpExcel(false)
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-64">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 text-sm">Only admins can access settings.</p>
      </div>
    )
  }

  const selectedUser = users.find(u => u.email === approvingEmail)
  const selectedMarketingUser = users.find(u => u.email === marketingEmail)

  return (
    <div className="p-4 md:p-8 w-full max-w-2xl overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">System configuration for Trainocate Asset Portal</p>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-green-500/10 border border-green-500/40 rounded-xl p-3 flex items-center gap-2">
            <span>✅</span>
            <p className="text-green-400 text-sm font-medium">Settings saved successfully.</p>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex items-center gap-2">
            <span>❌</span>
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset Request Approvals */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📋</span>
          <h2 className="text-white font-semibold">Asset Request Approvals</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4 ml-8">
          When an employee submits an asset request, an email and in-app notification are sent to the approving officer below.
        </p>

        {loading ? (
          <div className="animate-pulse h-12 bg-gray-800 rounded-lg" />
        ) : (
          <form onSubmit={handleSave}>
            <label className="text-gray-400 text-sm mb-2 block">Approving Officer</label>

            {/* User dropdown */}
            <select
              value={approvingEmail}
              onChange={e => setApprovingEmail(e.target.value)}
              required
              className="w-full min-w-0 bg-gray-800 text-white rounded-lg px-3 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm mb-3 truncate"
            >
              <option value="">Select a user…</option>
              {users.map(u => (
                <option key={u.id} value={u.email}>
                  {u.name || u.email} — {u.email}
                </option>
              ))}
            </select>

            {/* Preview chip */}
            {selectedUser && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(selectedUser.name || selectedUser.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedUser.name || selectedUser.email}</p>
                  <p className="text-gray-400 text-xs truncate">{selectedUser.email}</p>
                </div>
                <span className="ml-auto text-blue-400 text-xs font-medium shrink-0">Approving Officer</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !approvingEmail}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </form>
        )}
      </div>

      {/* Currency Settings */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💱</span>
          <h2 className="text-white font-semibold">Currency Settings</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4 ml-8">
          Choose the currency used for cost and value fields across the portal.
        </p>

        {loading ? (
          <div className="animate-pulse h-12 bg-gray-800 rounded-lg" />
        ) : (
          <form onSubmit={handleSaveCurrency}>
            <label className="text-gray-400 text-sm mb-2 block">Currency</label>

            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              required
              className="w-full min-w-0 bg-gray-800 text-white rounded-lg px-3 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm mb-4 truncate"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={savingCurrency}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {savingCurrency ? "Saving…" : "Save Currency"}
            </button>
          </form>
        )}
      </div>

      {/* Marketing Distribution Approvals */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🎯</span>
          <h2 className="text-white font-semibold">Marketing Distribution Approvals</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4 ml-8">
          When a marketing team member submits a distribution request, an email notification is sent to the officer below for approval.
        </p>

        {loading ? (
          <div className="animate-pulse h-12 bg-gray-800 rounded-lg" />
        ) : (
          <form onSubmit={handleSaveMarketing}>
            <label className="text-gray-400 text-sm mb-2 block">Marketing Approving Officer</label>

            <select
              value={marketingEmail}
              onChange={e => setMarketingEmail(e.target.value)}
              className="w-full min-w-0 bg-gray-800 text-white rounded-lg px-3 py-3 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm mb-3 truncate"
            >
              <option value="">Select a user…</option>
              {users.map(u => (
                <option key={u.id} value={u.email}>
                  {u.name || u.email} — {u.email}
                </option>
              ))}
            </select>

            {selectedMarketingUser && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(selectedMarketingUser.name || selectedMarketingUser.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedMarketingUser.name || selectedMarketingUser.email}</p>
                  <p className="text-gray-400 text-xs truncate">{selectedMarketingUser.email}</p>
                </div>
                <span className="ml-auto text-purple-400 text-xs font-medium shrink-0">Marketing Officer</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingMarketing}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {savingMarketing ? "Saving…" : "Save Marketing Settings"}
            </button>
          </form>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="bg-gray-900/80 rounded-xl border border-gray-800 p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🗄️</span>
          <h2 className="text-white font-semibold">Backup & Restore</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4 ml-8">
          Download a full copy of your portal data for safekeeping.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={handleExportBackup}
            disabled={backingUp}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
          >
            {backingUp ? "Exporting…" : "📥 Export Full Backup"}
          </button>
          <button
            onClick={handleExportBackupExcel}
            disabled={backingUpExcel}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
          >
            {backingUpExcel ? "Exporting…" : "📊 Export to Excel"}
          </button>
        </div>

        <p className="text-gray-500 text-xs">
          Backup includes all assets, users, borrows, issues, maintenance and settings data. Does not include passwords or authentication data.
        </p>
      </div>

    </div>
  )
}
