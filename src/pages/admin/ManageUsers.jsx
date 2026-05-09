import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"

const ROLES = ["admin", "it", "viewer"]

const roleColors = {
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  it: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const roleLabels = {
  admin: "Admin",
  it: "IT Staff",
  viewer: "View Only",
}

export default function ManageUsers() {
  const { t } = useTranslation()
  const { userProfile, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" })

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
      })

      // Restore admin session
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      setForm({ name: "", email: "", password: "", role: "viewer" })
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
    <div className="p-4 md:p-8">

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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t("manageUsersTitle")}</h1>
          <p className="text-gray-400 mt-1 text-sm">{users.length} team members</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + {t("addNewUser")}
        </motion.button>
      </div>

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
                  <option value="viewer">View Only — read-only access</option>
                  <option value="it">IT Staff — manage assets, no delete</option>
                  <option value="admin">Admin — full control</option>
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
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLES.map(r => (
          <span key={r} className={`text-xs px-3 py-1 rounded-full border font-medium ${roleColors[r]}`}>
            {r === "admin" && "👑 "}
            {r === "it" && "🛠 "}
            {r === "viewer" && "👁 "}
            {roleLabels[r]}
          </span>
        ))}
        <span className="text-gray-600 text-xs self-center ml-1">— click a role badge on a user to change it</span>
      </div>

      {/* Users List */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {(u.name || u.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {u.name || "—"}
                    {u.id === userProfile?.id && (
                      <span className="ml-2 text-xs text-gray-500">(you)</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Role selector */}
                <div className="flex gap-1">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(u.id, r)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all font-medium ${
                        u.role === r
                          ? roleColors[r]
                          : "bg-transparent border-gray-700 text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      {r === "admin" && "👑"}
                      {r === "it" && "🛠"}
                      {r === "viewer" && "👁"}
                      <span className="ml-1 hidden sm:inline">{roleLabels[r]}</span>
                    </button>
                  ))}
                </div>

                {/* 2FA toggle */}
                <button
                  onClick={() => handleToggle2FA(u)}
                  title={u.two_factor_enabled ? "2FA enabled — click to disable" : "2FA disabled — click to enable"}
                  className={`text-xs px-2 py-1 rounded border transition-all font-medium ${
                    u.two_factor_enabled
                      ? "bg-green-500/20 border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                      : "bg-gray-800 border-gray-700 text-gray-500 hover:border-blue-500/40 hover:text-blue-400"
                  }`}
                >
                  {u.two_factor_enabled ? "🔐 2FA" : "🔓 2FA"}
                </button>

                {/* Delete */}
                {u.id !== userProfile?.id && (
                  <button
                    onClick={() => handleDeleteUser(u)}
                    className="text-red-400/50 hover:text-red-400 text-sm px-2 py-1 rounded border border-red-400/20 hover:border-red-400/40 transition-all"
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
