import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabase"
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

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-white text-2xl font-bold">IT</span>
          </div>
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
      </div>
    </div>
  )
}

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 overflow-auto">
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
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </main>
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/admin" /> : <LoginPage />} />
        <Route path="/*" element={user ? <AdminLayout /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}