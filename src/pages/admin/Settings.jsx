import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

export default function Settings() {
  const { isAdmin } = useAuth()
  const [approvingEmail, setApprovingEmail] = useState("")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([fetchSettings(), fetchUsers()])
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
      }
    } catch { /* table may not exist yet — use defaults */ }
    setLoading(false)
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

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-64">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 text-sm">Only admins can access settings.</p>
      </div>
    )
  }

  // Selected user object for the preview
  const selectedUser = users.find(u => u.email === approvingEmail)

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">System configuration for ITAMS</p>
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
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm mb-3"
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

      <div className="bg-gray-900/40 rounded-xl border border-gray-800/50 p-4">
        <p className="text-gray-600 text-xs">
          <span className="text-gray-500 font-medium">Note:</span> Run{" "}
          <code className="text-gray-400">supabase/migrations/001_add_country_and_settings.sql</code> and{" "}
          <code className="text-gray-400">004_notifications.sql</code> in your Supabase SQL Editor if you haven't already.
        </p>
      </div>
    </div>
  )
}
