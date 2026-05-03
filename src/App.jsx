import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabase"
import { ThemeProvider } from "./context/ThemeContext"
import Sidebar from "./components/Sidebar"
import Dashboard from "./pages/admin/Dashboard"
import Assets from "./pages/admin/Assets"
import AddAsset from "./pages/admin/AddAsset"
import EditAsset from "./pages/admin/EditAsset"
import ImportAssets from "./pages/admin/ImportAssets"
import AssetDetail from "./pages/admin/AssetDetail"
import Issues from "./pages/admin/Issues"
import Reports from "./pages/admin/Reports"
import Borrow from "./pages/admin/Borrow"
import AISearch from "./pages/admin/AISearch"
import AssetHistory from "./pages/admin/AssetHistory"
import Scanner from "./pages/admin/Scanner"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"
import { motion, AnimatePresence } from "framer-motion"

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [particlesReady, setParticlesReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setParticlesReady(true))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
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
              links: {
                enable: true,
                color: "#3b82f6",
                opacity: 0.2,
                distance: 150,
              },
            },
            interactivity: {
              events: {
                onHover: { enable: true, mode: "repulse" },
              },
            },
          }}
          className="absolute inset-0"
        />
      )}

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
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
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">
          © 2025 Trainocate Singapore · ITAMS v1.0
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

function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#050510", position: "relative", overflow: "hidden" }}>

      {/* Animated blobs */}
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

      {/* Content */}
      <div style={{ display: "flex", flex: 1, position: "relative", zIndex: 1 }}>
        <Sidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">
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
            <Route path="*" element={<Navigate to="/admin" />} />
          </Routes>
        </main>
      </div>
      <AIChat />
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>
  )

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/admin" /> : <LoginPage />} />
          <Route path="/*" element={user ? <AdminLayout /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}