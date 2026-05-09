import { useState, useEffect, useRef, lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabase"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider } from "./context/AuthContext"
import Sidebar from "./components/Sidebar"
import GlobalSearch from "./components/GlobalSearch"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"
import { motion, AnimatePresence } from "framer-motion"

// Lazy-loaded pages — each loads as a separate chunk on first visit
const Dashboard    = lazy(() => import("./pages/admin/Dashboard"))
const Assets       = lazy(() => import("./pages/admin/Assets"))
const AddAsset     = lazy(() => import("./pages/admin/AddAsset"))
const EditAsset    = lazy(() => import("./pages/admin/EditAsset"))
const ImportAssets = lazy(() => import("./pages/admin/ImportAssets"))
const AssetDetail  = lazy(() => import("./pages/admin/AssetDetail"))
const Issues       = lazy(() => import("./pages/admin/Issues"))
const Reports      = lazy(() => import("./pages/admin/Reports"))
const Borrow       = lazy(() => import("./pages/admin/Borrow"))
const AISearch     = lazy(() => import("./pages/admin/AISearch"))
const AssetHistory = lazy(() => import("./pages/admin/AssetHistory"))
const Scanner      = lazy(() => import("./pages/admin/Scanner"))
const UserGuide    = lazy(() => import("./pages/admin/UserGuide"))
const ManageUsers  = lazy(() => import("./pages/admin/ManageUsers"))
const AssetRequests= lazy(() => import("./pages/admin/AssetRequests"))
const Maintenance  = lazy(() => import("./pages/admin/Maintenance"))

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOtpEmail(toEmail, otp) {
  const html = `
    <div style="background:#0a0a1a;color:#fff;padding:32px;font-family:-apple-system,sans-serif;border-radius:12px;max-width:480px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#2563eb;border-radius:14px;margin-bottom:12px;">
          <span style="color:#fff;font-size:22px;font-weight:bold;">IT</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0;">ITAMS — 2FA Verification</h1>
        <p style="color:#9ca3af;font-size:13px;margin-top:4px;">Trainocate Singapore</p>
      </div>
      <p style="color:#d1d5db;font-size:14px;margin-bottom:20px;">Your one-time verification code is:</p>
      <div style="background:#1f2937;border:1px solid #374151;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:8px;color:#60a5fa;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:12px;">This code expires in <strong style="color:#9ca3af;">5 minutes</strong>. Do not share it with anyone.</p>
    </div>`
  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { to: [toEmail], subject: "ITAMS — Your 2FA Verification Code", html },
    })
    return !error
  } catch {
    return false
  }
}

function LoginPage({ onVerified }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [particlesReady, setParticlesReady] = useState(false)
  // OTP step
  const [step, setStep] = useState("credentials") // "credentials" | "otp"
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [otpCode, setOtpCode] = useState("")
  const [otpExpiry, setOtpExpiry] = useState(null)
  const [otpSending, setOtpSending] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpInputs = useRef([])

  useEffect(() => {
    if (window.innerWidth >= 768) {
      initParticlesEngine(async (engine) => {
        await loadSlim(engine)
      }).then(() => setParticlesReady(true))
    }
  }, [])

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Check if 2FA is enabled for this user
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("two_factor_enabled")
      .eq("id", data.user.id)
      .single()

    if (profile?.two_factor_enabled) {
      // Sign out temporarily — user must complete OTP first
      await supabase.auth.signOut()
      setOtpSending(true)
      const otp = generateOTP()
      const expiry = new Date(Date.now() + 5 * 60 * 1000)
      const sent = await sendOtpEmail(email, otp)
      setOtpSending(false)
      if (!sent) {
        setError("Failed to send verification email. Please try again.")
        setLoading(false)
        return
      }
      setOtpCode(otp)
      setOtpExpiry(expiry)
      setStep("otp")
      setResendCooldown(60)
      setLoading(false)
      setTimeout(() => otpInputs.current[0]?.focus(), 100)
    } else {
      // No 2FA — already signed in, notify parent
      onVerified()
      setLoading(false)
    }
  }

  const handleOtpDigit = (i, val) => {
    const cleaned = val.replace(/\D/g, "").slice(-1)
    const next = [...otpDigits]
    next[i] = cleaned
    setOtpDigits(next)
    setOtpError("")
    if (cleaned && i < 5) otpInputs.current[i + 1]?.focus()
    if (next.every(d => d)) handleVerifyOtp(next.join(""))
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      otpInputs.current[i - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""))
      handleVerifyOtp(pasted)
    }
  }

  const handleVerifyOtp = async (code) => {
    const entered = code || otpDigits.join("")
    if (entered.length !== 6) return
    if (new Date() > otpExpiry) {
      setOtpError("Code expired. Please request a new one.")
      return
    }
    if (entered !== otpCode) {
      setOtpError("Incorrect code. Please try again.")
      setOtpDigits(["", "", "", "", "", ""])
      setTimeout(() => otpInputs.current[0]?.focus(), 50)
      return
    }
    // OTP correct — sign in for real
    setLoading(true)
    setOtpError("")
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setOtpError("Sign-in failed. Please go back and try again.")
      setLoading(false)
      return
    }
    onVerified()
    setLoading(false)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setOtpSending(true)
    const otp = generateOTP()
    const expiry = new Date(Date.now() + 5 * 60 * 1000)
    await sendOtpEmail(email, otp)
    setOtpCode(otp)
    setOtpExpiry(expiry)
    setOtpDigits(["", "", "", "", "", ""])
    setOtpError("")
    setOtpSending(false)
    setResendCooldown(60)
    otpInputs.current[0]?.focus()
  }

  const isMobile = window.innerWidth < 768

  // Mobile: 15 static CSS dots — no canvas, no blur, no glow
  const MobileBackground = () => {
    const dots = [
      { top: "8%",  left: "12%", size: 5,  color: "#3b82f6", opacity: 0.5, delay: "0s",    dur: "4s"  },
      { top: "15%", left: "78%", size: 3,  color: "#06b6d4", opacity: 0.4, delay: "0.5s",  dur: "5s"  },
      { top: "22%", left: "45%", size: 4,  color: "#a855f7", opacity: 0.35,delay: "1s",    dur: "6s"  },
      { top: "35%", left: "88%", size: 3,  color: "#3b82f6", opacity: 0.4, delay: "1.5s",  dur: "4.5s"},
      { top: "42%", left: "6%",  size: 5,  color: "#06b6d4", opacity: 0.3, delay: "0.8s",  dur: "7s"  },
      { top: "55%", left: "60%", size: 3,  color: "#ec4899", opacity: 0.35,delay: "2s",    dur: "5.5s"},
      { top: "62%", left: "25%", size: 4,  color: "#3b82f6", opacity: 0.4, delay: "0.3s",  dur: "6s"  },
      { top: "70%", left: "82%", size: 3,  color: "#a855f7", opacity: 0.3, delay: "1.2s",  dur: "4s"  },
      { top: "78%", left: "40%", size: 5,  color: "#06b6d4", opacity: 0.35,delay: "2.5s",  dur: "5s"  },
      { top: "85%", left: "15%", size: 3,  color: "#3b82f6", opacity: 0.4, delay: "0.6s",  dur: "6.5s"},
      { top: "90%", left: "70%", size: 4,  color: "#ec4899", opacity: 0.3, delay: "1.8s",  dur: "4.5s"},
      { top: "5%",  left: "55%", size: 3,  color: "#a855f7", opacity: 0.35,delay: "3s",    dur: "5s"  },
      { top: "48%", left: "92%", size: 4,  color: "#3b82f6", opacity: 0.3, delay: "2.2s",  dur: "7s"  },
      { top: "30%", left: "3%",  size: 3,  color: "#06b6d4", opacity: 0.4, delay: "1s",    dur: "4s"  },
      { top: "72%", left: "52%", size: 5,  color: "#3b82f6", opacity: 0.3, delay: "0.4s",  dur: "6s"  },
    ]
    return (
      <>
        <style>{`
          @keyframes floatDot {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              backgroundColor: d.color,
              opacity: d.opacity,
              animation: `floatDot ${d.dur} ${d.delay} ease-in-out infinite`,
              pointerEvents: "none",
            }}
          />
        ))}
      </>
    )
  }

  // Desktop: full WebGL particles + glow orbs (unchanged)
  const DesktopBackground = () => (
    <>
      {particlesReady && (
        <Particles
          options={{
            background: { color: { value: "transparent" } },
            particles: {
              number: { value: 80 },
              color: { value: "#3b82f6" },
              opacity: { value: 0.3 },
              size: { value: { min: 1, max: 3 } },
              move: { enable: true, speed: 1 },
              links: { enable: true, color: "#3b82f6", opacity: 0.2, distance: 150 },
            },
            interactivity: { events: { onHover: { enable: true, mode: "repulse" } } },
          }}
          className="absolute inset-0"
        />
      )}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
    </>
  )

  const ParticlesBackground = () => isMobile ? <MobileBackground /> : <DesktopBackground />

  const Brand = () => (
    <div className="text-center mb-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30"
      >
        <span className="text-white text-2xl font-bold">IT</span>
      </motion.div>
      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">ITAMS</h1>
      <p className="text-gray-400">IT Asset Management System</p>
      <p className="text-gray-600 text-sm mt-1">Trainocate Singapore</p>
    </div>
  )

  if (step === "otp") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <ParticlesBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <Brand />
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 shadow-2xl">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 border border-blue-500/40 rounded-2xl mb-3"
              >
                <span className="text-2xl">🔐</span>
              </motion.div>
              <h2 className="text-white text-xl font-semibold">Two-Factor Verification</h2>
              <p className="text-gray-400 text-sm mt-1">
                Enter the 6-digit code sent to
              </p>
              <p className="text-blue-400 text-sm font-medium">{email}</p>
            </div>

            {otpError && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm text-center"
              >
                {otpError}
              </motion.div>
            )}

            {/* OTP digit boxes */}
            <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => otpInputs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleOtpDigit(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-gray-800 text-white focus:outline-none transition-all ${
                    d ? "border-blue-500 bg-blue-500/10" : "border-gray-700 focus:border-blue-500"
                  }`}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpDigits.some(d => !d)}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all"
            >
              {loading ? "Verifying..." : "Verify Code →"}
            </motion.button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                onClick={() => { setStep("credentials"); setOtpDigits(["","","","","",""]); setOtpError("") }}
                className="text-gray-500 hover:text-gray-300 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || otpSending}
                className="text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-all"
              >
                {otpSending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>

            <p className="text-gray-600 text-xs text-center mt-4">Code expires in 5 minutes</p>
          </div>
          <p className="text-center text-gray-600 text-xs mt-6">
            © 2026 Trainocate Singapore · ITAMS v1.0
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <ParticlesBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Brand />
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-6">Sign in to your account</h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="you@trainocate.com"
                required
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpSending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? "Signing in..." : otpSending ? "Sending 2FA code..." : "Sign In →"}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 Trainocate Singapore · ITAMS v1.0
        </p>
      </motion.div>
    </div>
  )
}

function AIChat() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! Ask me anything about your assets 😊" }
  ])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    const userMsg = { role: "user", text: query }
    setMessages(prev => [...prev, userMsg])
    setQuery("")
    setLoading(true)

    const { data: assets } = await supabase
      .from("assets")
      .select("id, name, category, serial_number, assigned_user, status, location")

    const q = query.toLowerCase()
    const words = q.split(" ").filter(w => w.length > 2)

    let matched = assets.filter(a => {
      const text = `${a.name} ${a.category} ${a.serial_number} ${a.assigned_user} ${a.status} ${a.location}`.toLowerCase()
      return words.some(w => text.includes(w))
    })

    if (q.includes("available")) matched = matched.filter(a => a.status === "available")
    if (q.includes("assigned")) matched = matched.filter(a => a.status === "assigned")
    if (q.includes("laptop")) matched = matched.filter(a => a.category?.toLowerCase() === "laptop")
    if (q.includes("desktop")) matched = matched.filter(a => a.category?.toLowerCase() === "desktop")
    if (q.includes("no serial") || q.includes("missing serial")) matched = assets.filter(a => !a.serial_number)
    if (q.includes("unassigned")) matched = assets.filter(a => !a.assigned_user)

    let answer = ""
    if (matched.length === 0) {
      answer = `No assets found for "${query}". Try different keywords!`
    } else if (q.includes("how many") || q.includes("count")) {
      answer = `There are ${matched.length} assets matching your query.`
    } else {
      answer = `Found ${matched.length} matching assets:`
    }

    const aiMsg = {
      role: "ai",
      text: answer,
      results: matched.length > 0 && !q.includes("how many") ? matched.slice(0, 5) : []
    }
    setMessages(prev => [...prev, aiMsg])
    setLoading(false)
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-2xl"
        style={{ boxShadow: "0 0 20px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.3)" }}
      >
        {open ? "✕" : "🤖"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "420px", boxShadow: "0 0 30px rgba(59,130,246,0.2)" }}
          >
            <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-white font-semibold text-sm">ITAMS AI</p>
                <p className="text-blue-200 text-xs">Ask about your assets</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
                  }`}>
                    <p>{msg.text}</p>
                    {msg.results && msg.results.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.results.map(a => (
                          <div key={a.id} className="bg-gray-700 rounded-lg px-2 py-1">
                            <p className="text-white text-xs font-medium">{a.name}</p>
                            <p className="text-gray-400 text-xs">{a.assigned_user || "Unassigned"} · {a.status}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-xl px-3 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSearch} className="p-3 border-t border-gray-700 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about assets..."
                className="flex-1 bg-gray-800 text-white rounded-xl px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm transition-all"
              >
                →
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
        </div>
        <p className="text-gray-600 text-xs">Loading...</p>
      </div>
    </div>
  )
}

function AdminLayout({ user }) {
  return (
    <AuthProvider user={user}>
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#050510", position: "relative", overflow: "hidden" }}>

      <motion.div
        animate={{ x: [0, 60, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.2, 0.8, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", top: "-10%", right: "-10%", zIndex: 0,
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ x: [0, -40, 60, 0], y: [0, 40, -60, 0], scale: [1, 0.8, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", bottom: "-10%", left: "-10%", zIndex: 0,
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -20, 40, 0], scale: [1, 1.3, 0.7, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", top: "40%", right: "30%", zIndex: 0,
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.25), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ x: [0, -60, 20, 0], y: [0, 20, -40, 0], scale: [1, 0.7, 1.3, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed", bottom: "30%", right: "10%", zIndex: 0,
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.25), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", flex: 1, position: "relative", zIndex: 1 }}>
        <Sidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
          <div className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800/50 px-4 py-2 hidden md:flex items-center">
            <GlobalSearch />
          </div>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/assets" element={<Assets />} />
              <Route path="/admin/add-asset" element={<AddAsset />} />
              <Route path="/admin/edit-asset/:id" element={<EditAsset />} />
              <Route path="/admin/assets/:id" element={<AssetDetail />} />
              <Route path="/admin/import" element={<ImportAssets />} />
              <Route path="/admin/issues" element={<Issues />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/borrow" element={<Borrow />} />
              <Route path="/admin/ai-search" element={<AISearch />} />
              <Route path="/admin/history" element={<AssetHistory />} />
              <Route path="/admin/scanner" element={<Scanner />} />
              <Route path="/admin/guide" element={<UserGuide />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/requests" element={<AssetRequests />} />
              <Route path="/admin/maintenance" element={<Maintenance />} />
              <Route path="*" element={<Navigate to="/admin" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <AIChat />
    </div>
    </AuthProvider>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mfaVerified, setMfaVerified] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      // Existing sessions skip MFA (already verified in a prior login)
      if (session?.user) setMfaVerified(true)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setMfaVerified(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  const showAdmin = user && mfaVerified
  const showLogin = !user || !mfaVerified

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            showAdmin ? <Navigate to="/admin" /> : <LoginPage onVerified={() => setMfaVerified(true)} />
          } />
          <Route path="/*" element={
            showAdmin ? <AdminLayout user={user} /> : <Navigate to="/login" />
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}