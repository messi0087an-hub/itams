import { motion } from "framer-motion"

const PRESETS = {
  assets: { emoji: "📦", title: "No assets yet", sub: "Add your first asset to get started" },
  search: { emoji: "🔍", title: "No results found", sub: "Try different keywords" },
  issues: { emoji: "✅", title: "No issues", sub: "Everything looks good!" },
  history: { emoji: "📜", title: "No history", sub: "Actions will appear here" },
  maintenance: { emoji: "🔧", title: "No maintenance tasks", sub: "Schedule your first maintenance" },
  requests: { emoji: "📋", title: "No requests", sub: "Asset requests will appear here" },
  generic: { emoji: "📭", title: "Nothing here", sub: "" },
  borrows: { emoji: "📤", title: "No active borrows", sub: "All assets are currently available" },
  users: { emoji: "👥", title: "No users found", sub: "Add team members to get started" },
  reports: { emoji: "📊", title: "No data for this report", sub: "Try adjusting your filters or date range" },
  scanner: { emoji: "🔍", title: "No asset found", sub: "Try a different serial number or name" },
  imports: { emoji: "📥", title: "No import history", sub: "Import your first asset file to get started" },
}

export function EmptyState({ preset = "generic", title, sub, emoji }) {
  const p = PRESETS[preset] || PRESETS.generic
  const e = emoji || p.emoji
  const t = title || p.title
  const s = sub !== undefined ? sub : p.sub

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className="text-6xl mb-4 select-none"
        style={{ filter: "grayscale(0.3)" }}
      >
        <motion.span
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "inline-block" }}
        >
          {e}
        </motion.span>
      </motion.div>
      <p className="text-gray-400 font-medium">{t}</p>
      {s && <p className="text-gray-600 text-sm mt-1">{s}</p>}
    </motion.div>
  )
}

export function LoadingSkeleton({ rows = 3, cols = 1 }) {
  return (
    <div className="space-y-3 p-1">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-600 p-4 overflow-hidden relative"
          style={{ background: "#1a1f2e" }}>
          {/* shimmer: a bright stripe that slides left→right via translateX */}
          <motion.div
            className="absolute top-0 bottom-0 w-1/2 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
              left: 0,
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear", delay: i * 0.18 }}
          />
          <div className="space-y-3 relative z-10">
            <div className="h-4 rounded-md w-2/5" style={{ background: "#374151" }} />
            {cols > 1 && <div className="h-3 rounded-md w-3/5" style={{ background: "#2d3748" }} />}
            {cols > 2 && <div className="h-3 rounded-md w-1/3" style={{ background: "#2d3748" }} />}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SuccessOverlay({ show, emoji = "✅", title = "Done!", sub = "" }) {
  if (!show) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 200 }}
        className="text-center">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 border-2 border-green-500/50 rounded-full mb-4"
          style={{ boxShadow: "0 0 40px rgba(34,197,94,0.4)" }}>
          <span className="text-5xl">{emoji}</span>
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
        {sub && <p className="text-gray-400">{sub}</p>}
      </motion.div>
    </motion.div>
  )
}
