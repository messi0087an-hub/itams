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
      <span style={{ background: "rgba(6,182,212,0.3)", color: "#67e8f9", borderRadius: "2px", padding: "0 2px" }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  )
}

export default function MarketingSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    const [{ data: items }, { data: classes }, { data: events }] = await Promise.all([
      supabase.from("marketing_items").select("id, name, unit").ilike("name", `%${q}%`).limit(6),
      supabase.from("marketing_classes").select("id, class_name, class_date").ilike("class_name", `%${q}%`).limit(5),
      supabase.from("marketing_events").select("id, event_name, event_date, status").ilike("event_name", `%${q}%`).limit(5),
    ])
    setResults({ items: items || [], classes: classes || [], events: events || [] })
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults(null); return }
    debounceRef.current = setTimeout(() => doSearch(query), 280)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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

  const hasResults = results && (results.items.length || results.classes.length || results.events.length)

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, maxWidth: "480px" }}>
      <style>{`@keyframes mkt-spin { to { transform: rotate(360deg) } }`}</style>

      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        background: "rgba(6,182,212,0.06)",
        border: `1px solid ${open ? "rgba(6,182,212,0.5)" : "rgba(6,182,212,0.2)"}`,
        borderRadius: "12px", padding: "7px 12px", transition: "border-color 0.15s",
      }}>
        <span style={{ color: "#64748b", fontSize: "14px", flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search items, classes, events..."
          style={{ flex: 1, background: "transparent", color: "#fff", fontSize: "13px", border: "none", outline: "none", minWidth: 0 }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults(null) }}
            style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0 }}>
            ✕
          </button>
        )}
        {loading && (
          <div style={{ width: "12px", height: "12px", border: "2px solid rgba(6,182,212,0.3)", borderTopColor: "#06b6d4", borderRadius: "50%", animation: "mkt-spin 0.8s linear infinite", flexShrink: 0 }} />
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
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
              background: "#0f2730", border: "1px solid rgba(6,182,212,0.25)",
              borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", zIndex: 200,
              overflow: "hidden", maxHeight: "360px", display: "flex", flexDirection: "column",
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            {!hasResults && !loading && (
              <p style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "24px" }}>
                No results for "{query}"
              </p>
            )}
            {hasResults && (
              <div style={{ overflowY: "auto", flex: 1 }}>
                {results.items.length > 0 && (
                  <div>
                    <p style={{ color: "#475569", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 14px 4px" }}>Items</p>
                    {results.items.map(item => (
                      <button key={item.id} onClick={() => handleSelect("/marketing/items")}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <span style={{ fontSize: "15px", flexShrink: 0 }}>📦</span>
                        <p style={{ color: "#e2e8f0", fontSize: "13px", flex: 1, margin: 0 }}>
                          <Highlight text={item.name} query={query} />
                        </p>
                        {item.unit && <span style={{ color: "#64748b", fontSize: "11px" }}>{item.unit}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {results.classes.length > 0 && (
                  <div>
                    <p style={{ color: "#475569", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 14px 4px" }}>Classes</p>
                    {results.classes.map(cls => (
                      <button key={cls.id} onClick={() => handleSelect("/marketing/classes")}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <span style={{ fontSize: "15px", flexShrink: 0 }}>🎁</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#e2e8f0", fontSize: "13px", margin: 0 }}>
                            <Highlight text={cls.class_name} query={query} />
                          </p>
                          {cls.class_date && <p style={{ color: "#64748b", fontSize: "11px", margin: 0 }}>📅 {cls.class_date}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {results.events.length > 0 && (
                  <div style={{ paddingBottom: "6px" }}>
                    <p style={{ color: "#475569", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", padding: "10px 14px 4px" }}>Events</p>
                    {results.events.map(ev => (
                      <button key={ev.id} onClick={() => handleSelect("/marketing/events")}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <span style={{ fontSize: "15px", flexShrink: 0 }}>🎪</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#e2e8f0", fontSize: "13px", margin: 0 }}>
                            <Highlight text={ev.event_name} query={query} />
                          </p>
                          {ev.event_date && (
                            <p style={{ color: "#64748b", fontSize: "11px", margin: 0 }}>
                              📅 {ev.event_date}{ev.status ? ` · ${ev.status}` : ""}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
