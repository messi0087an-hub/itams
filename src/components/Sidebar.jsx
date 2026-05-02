import { useState } from "react"
import { NavLink } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useTheme } from "../context/ThemeContext"
import { useTranslation } from "react-i18next"

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { isDark, setIsDark } = useTheme()
  const { t, i18n } = useTranslation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const languages = [
    { code: "en", label: "EN", flag: "🇸🇬" },
    { code: "ms", label: "MS", flag: "🇲🇾" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
  ]

  const navItems = [
    { label: t("dashboard"), path: "/admin" },
    { label: t("allAssets"), path: "/admin/assets" },
    { label: t("addAsset"), path: "/admin/add-asset" },
    { label: t("importAssets"), path: "/admin/import" },
    { label: t("borrowReturn"), path: "/admin/borrow" },
    { label: t("issues"), path: "/admin/issues" },
    { label: t("reports"), path: "/admin/reports" },
    { label: t("history"), path: "/admin/history" },
  ]

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-4 py-3">
        <h1 className="text-white font-bold text-lg">ITAMS</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="text-gray-400 p-2 rounded-lg bg-gray-800 text-sm"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="text-white p-2 rounded-lg bg-gray-800"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
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

        {/* Language Switcher */}
        <div className="px-4 pt-4 flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                i18n.language === lang.code
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>

        <nav className="flex-1 p-4 space-y-1">
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
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all w-full"
          >
            <span>{isDark ? "☀️" : "🌙"}</span>
            <span className="text-sm font-medium">{isDark ? t("lightMode") : t("darkMode")}</span>
          </button>
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