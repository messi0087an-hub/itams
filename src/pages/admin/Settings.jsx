import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"

export default function Settings() {
  const { isAdmin } = useAuth()
  const [approvingEmail, setApprovingEmail] = useState("jamaludin.ali@trainocate.com")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchSettings()
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

  const handleSave = async (e) => {
    e.preventDefault()
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
          When an employee submits an asset request, an email notification is automatically sent to the approving officer below.
        </p>

        {loading ? (
          <div className="animate-pulse h-12 bg-gray-800 rounded-lg" />
        ) : (
          <form onSubmit={handleSave}>
            <label className="text-gray-400 text-sm mb-2 block">Approving Officer Email</label>
            <input
              type="email"
              value={approvingEmail}
              onChange={e => setApprovingEmail(e.target.value)}
              required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none text-sm mb-4"
              placeholder="approver@company.com"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </form>
        )}
      </div>

      <div className="bg-gray-900/40 rounded-xl border border-gray-800/50 p-4">
        <p className="text-gray-600 text-xs">
          <span className="text-gray-500 font-medium">Note:</span> If the <code className="text-gray-400">app_settings</code> table has not been created yet, run the SQL migration file at{" "}
          <code className="text-gray-400">supabase/migrations/001_add_country_and_settings.sql</code> in your Supabase SQL Editor.
        </p>
      </div>
    </div>
  )
}
