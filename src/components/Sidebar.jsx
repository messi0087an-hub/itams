import { NavLink } from "react-router-dom"
import { supabase } from "../lib/supabase"

const navItems = [
  { label: "Dashboard", path: "/admin" },
  { label: "All Assets", path: "/admin/assets" },
  { label: "Add Asset", path: "/admin/add-asset" },
  { label: "Import Assets", path: "/admin/import" },
  { label: "Issues", path: "/admin/issues" },
  { label: "Reports", path: "/admin/reports" },
]

export default function Sidebar() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">ITAMS</h1>
        <p className="text-gray-500 text-xs mt-1">Trainocate Singapore</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
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
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all w-full"
        >
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}