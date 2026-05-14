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
      // Auto-create guest profile on first login
      const { data: created } = await supabase
        .from("user_profiles")
        .insert({ id: u.id, email: u.email, name: u.email.split("@")[0], role: "guest" })
        .select()
        .single()
      setUserProfile(created)
    }
    setProfileLoading(false)
  }

  const role = userProfile?.role || "guest"

  return (
    <AuthContext.Provider value={{
      userProfile,
      profileLoading,
      role,
      isAdmin: role === "admin",
      isStandardUser: role === "standard_user",
      isGuest: role === "guest",
      canEdit: role === "admin",
      canDelete: role === "admin",
      canManageUsers: role === "admin",
      canBorrow: role === "admin" || role === "standard_user",
      canSubmitRequests: role === "admin" || role === "standard_user",
      userCountry: userProfile?.country || null,
      refetchProfile: () => user && fetchProfile(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
