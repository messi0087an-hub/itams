import { useState, useEffect, memo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

// ─── Background (re-uses same design as LoginPage) ──────────────────────────

const MobileBackground = memo(function MobileBackground() {
  const dots = [
    { top: "8%",  left: "12%", size: 5,  color: "#3b82f6", opacity: 0.5,  delay: "0s",   dur: "4s"   },
    { top: "15%", left: "78%", size: 3,  color: "#06b6d4", opacity: 0.4,  delay: "0.5s", dur: "5s"   },
    { top: "22%", left: "45%", size: 4,  color: "#a855f7", opacity: 0.35, delay: "1s",   dur: "6s"   },
    { top: "35%", left: "88%", size: 3,  color: "#3b82f6", opacity: 0.4,  delay: "1.5s", dur: "4.5s" },
    { top: "42%", left: "6%",  size: 5,  color: "#06b6d4", opacity: 0.3,  delay: "0.8s", dur: "7s"   },
    { top: "55%", left: "60%", size: 3,  color: "#ec4899", opacity: 0.35, delay: "2s",   dur: "5.5s" },
    { top: "62%", left: "25%", size: 4,  color: "#3b82f6", opacity: 0.4,  delay: "0.3s", dur: "6s"   },
    { top: "70%", left: "82%", size: 3,  color: "#a855f7", opacity: 0.3,  delay: "1.2s", dur: "4s"   },
    { top: "78%", left: "40%", size: 5,  color: "#06b6d4", opacity: 0.35, delay: "2.5s", dur: "5s"   },
    { top: "85%", left: "15%", size: 3,  color: "#3b82f6", opacity: 0.4,  delay: "0.6s", dur: "6.5s" },
    { top: "90%", left: "70%", size: 4,  color: "#ec4899", opacity: 0.3,  delay: "1.8s", dur: "4.5s" },
  ]
  return (
    <>
      <style>{`
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute", top: d.top, left: d.left,
          width: d.size, height: d.size, borderRadius: "50%",
          backgroundColor: d.color, opacity: d.opacity,
          animation: `floatDot ${d.dur} ${d.delay} ease-in-out infinite`,
          pointerEvents: "none",
        }} />
      ))}
    </>
  )
})

// ─── Password requirement row ────────────────────────────────────────────────
function Req({ met, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <motion.span
        animate={{ scale: met ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.25 }}
        className={met ? "text-green-400 font-bold" : "text-gray-600"}
      >
        {met ? "✓" : "✗"}
      </motion.span>
      <span className={met ? "text-green-400" : "text-gray-500"}>{label}</span>
    </div>
  )
}

// ─── Eye-toggle button ───────────────────────────────────────────────────────
function EyeBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-lg select-none"
      tabIndex={-1}
    >
      {show ? "🙈" : "👁️"}
    </button>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ResetPassword() {
  const navigate = useNavigate()

  const [password, setPassword]           = useState("")
  const [confirm, setConfirm]             = useState("")
  const [showPw, setShowPw]               = useState(false)
  const [showCfm, setShowCfm]             = useState(false)
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState("")
  // true once Supabase fires the PASSWORD_RECOVERY event (token in URL exchanged)
  const [ready, setReady]                 = useState(false)

  // ── Requirements ────────────────────────────────────────────────────────────
  const reqs = [
    { label: "Minimum 8 characters",          met: password.length >= 8 },
    { label: "At least one uppercase letter", met: /[A-Z]/.test(password) },
    { label: "At least one number",           met: /[0-9]/.test(password) },
  ]
  const passwordsMatch = confirm.length > 0 && password === confirm
  const allMet = reqs.every(r => r.met) && passwordsMatch

  // ── Supabase auth state (exchange recovery token from URL) ──────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true)
      }
    })
    // In case the page loaded with an existing session already exchanged
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allMet) return
    setLoading(true)
    setError("")
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message || "Failed to update password. Please try again.")
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    // Sign out the recovery session and redirect to login after 3 s
    setTimeout(async () => {
      await supabase.auth.signOut()
      navigate("/login")
    }, 3000)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#0a0f1e" }}
    >
      {/* Background */}
      <MobileBackground />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center mb-4"
          >
            <img src="/trainocate-logo.png" alt="Trainocate" style={{width:"180px"}} />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Trainocate Asset Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Trainocate Singapore</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <AnimatePresence mode="wait">

            {/* ── Success state ── */}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 border-2 border-green-500/50 rounded-full mb-5"
                >
                  <span className="text-4xl">✅</span>
                </motion.div>
                <h2 className="text-white text-xl font-semibold mb-2">Password Updated!</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Password updated successfully!<br />
                  Redirecting to login… 😊
                </p>
                <div className="mt-5 flex justify-center">
                  <span className="w-6 h-6 border-2 border-green-500/40 border-t-green-400 rounded-full animate-spin" />
                </div>
              </motion.div>
            )}

            {/* ── Validating link ── */}
            {!success && !ready && (
              <motion.div
                key="validating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin inline-block mb-4" />
                <p className="text-gray-400 text-sm">Validating reset link…</p>
                <p className="text-gray-600 text-xs mt-2">
                  If this takes too long, your link may have expired.{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-cyan-500 hover:text-cyan-300 underline transition-colors"
                  >
                    Go back to login
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── Form ── */}
            {!success && ready && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 border border-blue-500/40 rounded-2xl mb-3"
                  >
                    <span className="text-2xl">🔑</span>
                  </motion.div>
                  <h2 className="text-white text-xl font-semibold">Set New Password</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Choose a strong password to secure your account
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 pr-12 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <EyeBtn show={showPw} onToggle={() => setShowPw(v => !v)} />
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showCfm ? "text" : "password"}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        className={`w-full bg-gray-800 text-white rounded-xl px-4 py-3 pr-12 border transition-all focus:outline-none focus:ring-1 ${
                          confirm.length > 0
                            ? password === confirm
                              ? "border-green-500 focus:border-green-500 focus:ring-green-500/40"
                              : "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                            : "border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <EyeBtn show={showCfm} onToggle={() => setShowCfm(v => !v)} />
                    </div>
                  </div>

                  {/* Password requirements */}
                  <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                    {reqs.map(r => <Req key={r.label} met={r.met} label={r.label} />)}
                    {confirm.length > 0 && (
                      <Req met={passwordsMatch} label="Passwords match" />
                    )}
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={!allMet || loading}
                    whileHover={allMet && !loading ? { scale: 1.02 } : {}}
                    whileTap={allMet && !loading ? { scale: 0.98 } : {}}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating…
                      </span>
                    ) : "Update Password"}
                  </motion.button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                      ← Back to login
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 Trainocate Singapore · Trainocate Asset Portal v1.0
        </p>
      </motion.div>
    </div>
  )
}
