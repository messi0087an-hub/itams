import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

function Highlight({ text, query }) {
  if (!query || !text) return <span>{text || ""}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <span className="bg-blue-500/40 text-blue-200 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  )
}

const STATUS_COLORS = {
  available: "bg-green-500/20 text-green-400",
  assigned:  "bg-blue-500/20 text-blue-400",
  maintenance: "bg-yellow-500/20 text-yellow-400",
  retired:   "bg-red-500/20 text-red-400",
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("all")
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from("assets")
      .select("id, name, serial_number, asset_tag, category, brand_model, assigned_user, location, status")
      .or([
        `name.ilike.%${q}%`,
        `serial_number.ilike.%${q}%`,
        `asset_tag.ilike.%${q}%`,
        `category.ilike.%${q}%`,
        `brand_model.ilike.%${q}%`,
        `assigned_user.ilike.%${q}%`,
        `location.ilike.%${q}%`,
      ].join(","))
      .limit(30)

    const ql = q.toLowerCase()
    const rows = data || []

    const assets = rows.filter(a =>
      a.name?.toLowerCase().includes(ql) ||
      a.serial_number?.toLowerCase().includes(ql) ||
      a.asset_tag?.toLowerCase().includes(ql) ||
      a.category?.toLowerCase().includes(ql) ||
      a.brand_model?.toLowerCase().includes(ql)
    ).slice(0, 6)

    const empMap = {}
    rows.forEach(a => {
      if (a.assigned_user?.toLowerCase().includes(ql)) {
        if (!empMap[a.assigned_user]) empMap[a.assigned_user] = 0
        empMap[a.assigned_user]++
      }
    })
    const employees = Object.entries(empMap).slice(0, 4)
      .map(([name, count]) => ({ name, count }))

    const locMap = {}
    rows.forEach(a => {
      if (a.location?.toLowerCase().includes(ql)) {
        if (!locMap[a.location]) locMap[a.location] = 0
        locMap[a.location]++
      }
    })
    const locations = Object.entries(locMap).slice(0, 4)
      .map(([name, count]) => ({ name, count }))

    setResults({ assets, employees, locations })
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults(null); return }
    debounceRef.current = setTimeout(() => doSearch(query), 280)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() } }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const handleSelect = (path) => {
    setOpen(false)
    setQuery("")
    setResults(null)
    navigate(path)
  }

  const hasResults = results && (results.assets.length || results.employees.length || results.locations.length)

  const showAssets     = filter === "all" || filter === "assets"
  const showEmployees  = filter === "all" || filter === "employees"
  const showLocations  = filter === "all" || filter === "locations"

  const filterCounts = results ? {
    assets:    results.assets.length,
    employees: results.employees.length,
    locations: results.locations.length,
  } : {}

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Input */}
      <div className={`flex items-center gap-2 bg-gray-900/80 border rounded-xl px-3 py-2 transition-all ${
        open ? "border-blue-500/60" : "border-gray-700 hover:border-gray-600"
      }`}>
        <span className="text-gray-500 text-sm shrink-0">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search assets, employees, locations..."
          className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults(null) }}
            className="text-gray-600 hover:text-gray-400 text-sm shrink-0">✕</button>
        )}
        {loading && (
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[100]"
            style={{ boxShadow: "0 0 40px rgba(0,0,0,0.6)" }}
          >
            {!hasResults && !loading && (
              <p className="text-gray-500 text-sm text-center py-6">No results for "{query}"</p>
            )}

            {hasResults && (
              <>
                {/* Filter tabs */}
                <div className="flex gap-1 p-2 border-b border-gray-800">
                  {[
                    { key: "all", label: "All" },
                    { key: "assets", label: `Assets${filterCounts.assets ? ` (${filterCounts.assets})` : ""}` },
                    { key: "employees", label: `Employees${filterCounts.employees ? ` (${filterCounts.employees})` : ""}` },
                    { key: "locations", label: `Locations${filterCounts.locations ? ` (${filterCounts.locations})` : ""}` },
                  ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        filter === f.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {/* Assets */}
                  {showAssets && results.assets.length > 0 && (
                    <div>
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-1">Assets</p>
                      {results.assets.map(asset => (
                        <button key={asset.id} onClick={() => handleSelect(`/admin/assets/${asset.id}`)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 transition-all text-left">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              <Highlight text={asset.name} query={query} />
                            </p>
                            <p className="text-gray-500 text-xs truncate">
                              <Highlight text={asset.category} query={query} />
                              {asset.serial_number && <> · <Highlight text={asset.serial_number} query={query} /></>}
                              {asset.asset_tag && <> · <Highlight text={asset.asset_tag} query={query} /></>}
                            </p>
                          </div>
                          <span className={`ml-3 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[asset.status] || "bg-gray-500/20 text-gray-400"}`}>
                            {asset.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Employees */}
                  {showEmployees && results.employees.length > 0 && (
                    <div>
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-1">Employees</p>
                      {results.employees.map(emp => (
                        <button key={emp.name}
                          onClick={() => handleSelect(`/admin/assets?q=${encodeURIComponent(emp.name)}`)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 transition-all text-left">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">
                              {emp.name[0].toUpperCase()}
                            </div>
                            <p className="text-white text-sm">
                              <Highlight text={emp.name} query={query} />
                            </p>
                          </div>
                          <span className="text-gray-500 text-xs ml-3 shrink-0">{emp.count} asset{emp.count !== 1 ? "s" : ""}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Locations */}
                  {showLocations && results.locations.length > 0 && (
                    <div className="pb-2">
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-1">Locations</p>
                      {results.locations.map(loc => (
                        <button key={loc.name}
                          onClick={() => handleSelect(`/admin/assets?q=${encodeURIComponent(loc.name)}`)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 transition-all text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-base shrink-0">📍</span>
                            <p className="text-white text-sm">
                              <Highlight text={loc.name} query={query} />
                            </p>
                          </div>
                          <span className="text-gray-500 text-xs ml-3 shrink-0">{loc.count} asset{loc.count !== 1 ? "s" : ""}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
