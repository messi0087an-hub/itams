import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const guides = [
  {
    id: "dashboard",
    emoji: "🏠",
    title: "Dashboard",
    color: "blue",
    steps: [
      "The Dashboard is the first page you see after logging in.",
      "It shows live stats: Total Assets, Available, Assigned, and Open Issues.",
      "The bar chart shows assets grouped by category (Laptop, Desktop, etc).",
      "The donut chart shows assets grouped by status (Available, Assigned, etc).",
      "Warranty Expiry Alerts appear in yellow/red for assets expiring within 90 days.",
      "The Recently Added Assets section shows the last 5 assets added to ITAMS.",
    ]
  },
  {
    id: "assets",
    emoji: "📦",
    title: "Managing Assets",
    color: "purple",
    steps: [
      "Click 'All Assets' in the sidebar to view all 193+ assets.",
      "Use the search bar to search by asset name, serial number, or assigned user.",
      "Click any asset row to view its full details including QR code.",
      "Click 'Edit' to update asset information like status, location, or assigned user.",
      "Click 'Delete' to remove an asset — a confirmation modal will appear first.",
      "Click '+ Add' to register a brand new asset into ITAMS.",
      "After saving a new asset, a success animation will play automatically.",
    ]
  },
  {
    id: "scanner",
    emoji: "🔍",
    title: "Asset Scanner",
    color: "cyan",
    steps: [
      "Click 'Scanner' in the sidebar to open the scanner page.",
      "Click 'Start Scanning' and allow camera access when prompted.",
      "Point your camera at any ITAMS QR code sticker on a device.",
      "The scanner also reads manufacturer barcodes — just scan the barcode on the device!",
      "If scanning doesn't work, use the Manual Search box below.",
      "Type the serial number, asset tag, or name to find the asset manually.",
      "Once found, click 'View Full Details' to see the complete asset information.",
    ]
  },
  {
    id: "qr",
    emoji: "📱",
    title: "QR Codes",
    color: "green",
    steps: [
      "Every asset in ITAMS has a unique QR code automatically generated.",
      "Click any asset → scroll down to see its QR code.",
      "Click 'Print QR Code' to print it as a sticker.",
      "Stick the QR code on the physical device (laptop, monitor, printer etc).",
      "Anyone can scan the sticker with their phone camera to instantly see asset info.",
      "If the sticker falls off, use the Scanner page to search by serial number instead.",
    ]
  },
  {
    id: "borrow",
    emoji: "📤",
    title: "Borrow & Return",
    color: "orange",
    steps: [
      "Click 'Borrow / Return' in the sidebar.",
      "Click '+ Borrow Asset' to borrow an available asset.",
      "Select the asset, enter the borrower's name and email, then click 'Confirm Borrow'.",
      "A blue success animation will play when the borrow is confirmed.",
      "The asset status automatically changes to 'Assigned' in the system.",
      "To return an asset, find it in the Active Borrows list and click 'Return'.",
      "A green success animation will play when the return is confirmed.",
      "All borrow/return history is saved automatically.",
    ]
  },
  {
    id: "issues",
    emoji: "⚠️",
    title: "Reporting Issues",
    color: "red",
    steps: [
      "Click 'Issues' in the sidebar to view all reported issues.",
      "Click '+ Report' to report a new issue with any asset.",
      "Select the asset, choose the issue type (Hardware/Software/Network/Other).",
      "Describe the issue in detail and click 'Submit Issue'.",
      "An orange success animation will play when the issue is submitted.",
      "To resolve an issue, click the 'Resolve' button next to it.",
      "A green success animation will play when the issue is resolved.",
      "All issues are tracked with timestamps for audit purposes.",
    ]
  },
  {
    id: "reports",
    emoji: "📊",
    title: "Reports & Exports",
    color: "green",
    steps: [
      "Click 'Reports' in the sidebar to view the full asset report.",
      "The page shows a summary of all assets by status and category.",
      "The category breakdown shows animated progress bars.",
      "Click '📄 PDF' to download a branded PDF report with your company header.",
      "Click '📊 Excel' to download a full Excel spreadsheet of all assets.",
      "The PDF includes a summary table and full asset list — ready to share with management.",
    ]
  },
  {
    id: "import",
    emoji: "📥",
    title: "Importing Assets",
    color: "purple",
    steps: [
      "Click 'Import Assets' in the sidebar.",
      "Prepare an Excel file with columns: name, category, serial_number, location, assigned_user, status.",
      "Click 'Choose File' and select your Excel file.",
      "Preview the data to make sure everything looks correct.",
      "Click 'Import' to bulk upload all assets into ITAMS.",
      "All imported assets will appear immediately in the All Assets page.",
    ]
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "AI Chat Assistant",
    color: "blue",
    steps: [
      "Click the glowing 🤖 button at the bottom right of any page.",
      "Type your question in plain English and press Enter or click →.",
      "Try: 'Show me all Dell laptops'",
      "Try: 'How many assets are available?'",
      "Try: 'Show me assets assigned to John'",
      "Try: 'Show me all laptops'",
      "The AI searches your entire asset database instantly and shows results.",
    ]
  },
  {
    id: "history",
    emoji: "📋",
    title: "Asset History",
    color: "yellow",
    steps: [
      "Click 'History' in the sidebar to view the complete audit trail.",
      "Every action in ITAMS is logged automatically — adding, editing, deleting assets.",
      "Each log entry shows: what happened, which asset, who did it, and when.",
      "Use History to track who made changes and when.",
      "This is useful for accountability and troubleshooting.",
    ]
  },
  {
    id: "language",
    emoji: "🌐",
    title: "Language & Theme",
    color: "pink",
    steps: [
      "ITAMS supports 9 languages: English, Malay, Chinese, Hindi, Filipino, Thai, Indonesian, Vietnamese, Korean.",
      "Click any language flag in the sidebar to switch languages instantly.",
      "The navigation menu translates immediately when you switch languages.",
      "Click the ☀️ / 🌙 button at the bottom of the sidebar to toggle Light/Dark mode.",
      "Your language preference is remembered during your session.",
    ]
  },
]

const colorMap = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-500" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", dot: "bg-green-500" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
  yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-500" },
  pink: { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400", dot: "bg-pink-500" },
}

export default function UserGuide() {
  const [activeId, setActiveId] = useState(null)

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white">📖 User Guide</h1>
        <p className="text-gray-400 mt-1 text-sm">Everything you need to know about using ITAMS</p>
      </div>

      {/* Quick Start */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8"
      >
        <h2 className="text-blue-400 font-bold text-lg mb-2">🚀 Quick Start</h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          Welcome to <span className="text-white font-semibold">ITAMS</span> — the IT Asset Management System for Trainocate Singapore.
          This guide will help you navigate and use all features of the system.
          Click any section below to expand it and learn more!
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: "🌐", text: "Live at itams-seven.vercel.app" },
            { emoji: "📱", text: "Works on mobile + desktop" },
            { emoji: "🔒", text: "Secure Supabase auth" },
            { emoji: "🌍", text: "9 languages supported" },
          ].map((item, i) => (
            <div key={i} className="bg-blue-500/10 rounded-xl p-3 text-center">
              <p className="text-xl mb-1">{item.emoji}</p>
              <p className="text-blue-300 text-xs">{item.text}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Guide Sections */}
      <div className="space-y-3">
        {guides.map((guide, i) => {
          const colors = colorMap[guide.color]
          const isOpen = activeId === guide.id
          return (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border ${colors.border} overflow-hidden`}
            >
              <button
                onClick={() => setActiveId(isOpen ? null : guide.id)}
                className={`w-full px-6 py-4 flex items-center justify-between ${colors.bg} hover:opacity-90 transition-all`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{guide.emoji}</span>
                  <span className={`font-semibold ${colors.text}`}>{guide.title}</span>
                </div>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className={`${colors.text} text-lg`}
                >
                  ↓
                </motion.span>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-gray-900/80 px-6 py-4"
                  >
                    <div className="space-y-3">
                      {guide.steps.map((step, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: j * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`w-2 h-2 rounded-full ${colors.dot} mt-2 shrink-0`} />
                          <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gray-900/80 rounded-2xl border border-gray-800 p-6 text-center"
      >
        <p className="text-2xl mb-2">🙏</p>
        <p className="text-white font-semibold mb-1">Need more help?</p>
        <p className="text-gray-400 text-sm">Contact your IT Administrator or refer to the ITAMS documentation.</p>
        <p className="text-gray-600 text-xs mt-3">ITAMS v1.0 — Trainocate Singapore © 2026</p>
      </motion.div>
    </div>
  )
}