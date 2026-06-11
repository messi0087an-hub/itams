import { useState } from "react"
import { NavLink } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { useTranslation } from "react-i18next"
import NotificationBell from "./NotificationBell"

const languages = [
  { code: "en", label: "EN", flag: "🇸🇬" },
  { code: "ms", label: "MS", flag: "🇲🇾" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "hi", label: "हिं", flag: "🇮🇳" },
  { code: "tl", label: "TL", flag: "🇵🇭" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "id", label: "ID", flag: "🇮🇩" },
  { code: "vi", label: "VI", flag: "🇻🇳" },
  { code: "ko", label: "한국", flag: "🇰🇷" },
]

const roleColors = {
  admin: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  standard_user: "bg-green-500/20 text-green-400 border border-green-500/30",
  guest: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
}

const roleLabels = {
  admin: "👑 Admin",
  standard_user: "👤 Standard User",
  guest: "👁 Guest",
}


export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const { userProfile, role, isAdmin, isStandardUser, isMarketing } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const dashItem    = { label: t("dashboard"), path: "/admin" }
  const assetsItem  = { label: t("allAssets"), path: "/admin/assets" }
  const reportsItem = { label: t("reports"), path: "/admin/reports" }
  const historyItem = { label: t("history"), path: "/admin/history" }
  const guideItem   = { label: "📖 " + t("guide"), path: "/admin/guide" }

  const scannerItem = { label: "🔍 " + t("scanner"), path: "/admin/scanner" }

  // Standard User items
  const standardItems = [
    { label: "📋 " + t("assetRequestsTitle"), path: "/admin/requests" },
    { label: t("borrowReturn"), path: "/admin/borrow" },
    { label: t("issues"), path: "/admin/issues" },
    { label: "🔧 " + t("maintenanceTitle"), path: "/admin/maintenance" },
  ]

  // Admin-only items
  const adminOnlyItems = [
    { label: t("addAsset"), path: "/admin/add-asset" },
    { label: t("importAssets"), path: "/admin/import" },
    { label: "👥 " + t("manageUsersTitle"), path: "/admin/users" },
    { label: "⚙️ Settings", path: "/admin/settings" },
  ]

  // Guest: Dashboard, All Assets, Reports, User Guide only
  let navItems = [dashItem, assetsItem, reportsItem, guideItem]

  // Standard User: Dashboard, All Assets, Scanner, requests, borrow, issues, maintenance, history, guide
  if (isStandardUser) {
    navItems = [dashItem, assetsItem, scannerItem, ...standardItems, historyItem, guideItem]
  }

  // Admin: full access
  if (isAdmin) {
    navItems = [
      dashItem, assetsItem,
      adminOnlyItems[0], scannerItem, adminOnlyItems[1],
      ...standardItems,
      reportsItem, historyItem, guideItem,
      adminOnlyItems[2], adminOnlyItems[3],
    ]
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-4 py-3">
        <h1 className="text-white font-bold text-lg">ITAMS</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setOpen(!open)}
            className="text-white p-2 rounded-lg bg-gray-800"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed, exactly 100vh tall, flex column, overflow hidden at container level */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900/70 backdrop-blur-sm border-r border-gray-800 transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* ── TOP: Logo (desktop) / spacer (mobile) — never scrolls ── */}
        <div className="shrink-0">
          <div className="p-6 border-b border-gray-800 hidden md:block">
            <h1 className="text-2xl font-bold text-white">ITAMS</h1>
            <p className="text-gray-500 text-xs mt-1">Trainocate Singapore</p>
          </div>
          <div className="h-14 md:hidden" />
        </div>

        {/* ── USER INFO — never scrolls ── */}
        {userProfile && (
          <div className="shrink-0 px-4 pt-4 pb-2 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {(userProfile.name || userProfile.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{userProfile.name || userProfile.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[role] || roleColors.guest}`}>
                  {roleLabels[role] || "👁 Guest"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── LANGUAGE SWITCHER — never scrolls ── */}
        <div className="shrink-0 px-4 pt-4 pb-2">
          <p className="text-gray-500 text-xs mb-2">Language</p>
          <div className="grid grid-cols-3 gap-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                  i18n.language === lang.code
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── NAV + SIGN OUT — scrollable, takes remaining height ── */}
        <nav className="p-4 space-y-1" style={{ flex: 1, overflowY: "auto" }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* Marketing link */}
          {isMarketing && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-gray-600 text-xs px-4 font-medium uppercase tracking-wider">Marketing</p>
              </div>
              <NavLink
                to="/admin/marketing"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`
                }
              >
                <span className="text-sm font-medium">🎯 Marketing Items</span>
              </NavLink>
            </>
          )}

          {/* Sign Out — last item in scrollable nav, always reachable */}
          <div className="pt-3 mt-1 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all w-full"
            >
              <span>🚪</span>
              <span className="text-sm font-medium">{t("signOut")}</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  )
}
