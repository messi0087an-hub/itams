import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const AuthContext = createContext({})

export function AuthProvider({ children, user }) {
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setProfileLoading(false)
      return
    }
    fetchProfile(user)
  }, [user?.id])

  const fetchProfile = async (u) => {
    setProfileLoading(true)
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", u.id)
      .single()

    if (data) {
      setUserProfile(data)
    } else {
      // Auto-create viewer profile on first login
      const { data: created } = await supabase
        .from("user_profiles")
        .insert({ id: u.id, email: u.email, name: u.email.split("@")[0], role: "viewer" })
        .select()
        .single()
      setUserProfile(created)
    }
    setProfileLoading(false)
  }

  const role = userProfile?.role || "viewer"

  return (
    <AuthContext.Provider value={{
      userProfile,
      profileLoading,
      role,
      isAdmin: role === "admin",
      isIT: role === "it",
      isViewer: role === "viewer",
      canEdit: role === "admin" || role === "it",
      canDelete: role === "admin",
      canManageUsers: role === "admin",
      refetchProfile: () => user && fetchProfile(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
