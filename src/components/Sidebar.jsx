import { useState } from "react"
import { NavLink } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import { useTranslation } from "react-i18next"

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
  const { userProfile, role, isAdmin, isStandardUser } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Items visible to all roles (Guest, Standard User, Admin)
  const guestItems = [
    { label: t("dashboard"), path: "/admin" },
    { label: t("allAssets"), path: "/admin/assets" },
    { label: t("reports"), path: "/admin/reports" },
    { label: t("history"), path: "/admin/history" },
    { label: "📖 " + t("guide"), path: "/admin/guide" },
  ]

  // Standard User additional items
  const standardItems = [
    { label: "📋 " + t("assetRequestsTitle"), path: "/admin/requests" },
    { label: t("issues"), path: "/admin/issues" },
    { label: "🔧 " + t("maintenanceTitle"), path: "/admin/maintenance" },
    { label: t("borrowReturn"), path: "/admin/borrow" },
  ]

  // Admin-only items
  const adminOnlyItems = [
    { label: t("addAsset"), path: "/admin/add-asset" },
    { label: "🔍 " + t("scanner"), path: "/admin/scanner" },
    { label: t("importAssets"), path: "/admin/import" },
    { label: "👥 " + t("manageUsersTitle"), path: "/admin/users" },
    { label: "⚙️ Settings", path: "/admin/settings" },
  ]

  let navItems = [...guestItems]
  if (isStandardUser) {
    navItems = [guestItems[0], guestItems[1], ...standardItems, guestItems[2], guestItems[3], guestItems[4]]
  }
  if (isAdmin) {
    navItems = [
      guestItems[0], guestItems[1],
      adminOnlyItems[0], adminOnlyItems[1], adminOnlyItems[2],
      ...standardItems,
      guestItems[2], guestItems[3], guestItems[4],
      adminOnlyItems[3], adminOnlyItems[4],
    ]
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-4 py-3">
        <h1 className="text-white font-bold text-lg">ITAMS</h1>
        <div className="flex items-center gap-2">
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

      <div className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 min-h-screen bg-gray-900/70 backdrop-blur-sm border-r border-gray-800 flex flex-col
        transform transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6 border-b border-gray-800 hidden md:block">
          <h1 className="text-2xl font-bold text-white">ITAMS</h1>
          <p className="text-gray-500 text-xs mt-1">Trainocate Singapore</p>
        </div>
        <div className="h-14 md:hidden" />

        {/* Logged-in user info */}
        {userProfile && (
          <div className="px-4 pt-4 pb-2 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {(userProfile.name || userProfile.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{userProfile.name || userProfile.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[role] || roleColors.guest}`}>
                  {roleLabels[role] || "👁 Guest"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
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

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all w-full"
          >
            <span>🚪</span>
            <span className="text-sm font-medium">{t("signOut")}</span>
          </button>
        </div>
      </div>
    </>
  )
}
