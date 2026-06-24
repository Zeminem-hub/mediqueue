/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAppProfile, sendPatientOtp, signInStaff, signOut as signOutService, verifyPatientOtp } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      setProfileError('')
      return null
    }

    try {
      const appProfile = await getAppProfile(currentUser.id)
      setProfile(appProfile)
      setProfileError('')
      return appProfile
    } catch (error) {
      setProfile(null)
      setProfileError(error.message)
      return null
    }
  }, [])

  useEffect(() => {
    let active = true

    async function initialize() {
      const { data } = await supabase.auth.getSession()
      if (!active) return

      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      await fetchProfile(nextUser)
      if (active) setLoading(false)
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setLoading(true)

      window.setTimeout(async () => {
        await fetchProfile(nextUser)
        if (active) setLoading(false)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function sendOtp(phone) {
    return sendPatientOtp(phone)
  }

  async function verifyOtp(payload) {
    const data = await verifyPatientOtp(payload)
    setUser(data.user ?? null)
    return data
  }

  async function loginStaff(payload) {
    const data = await signInStaff(payload)
    setUser(data.user ?? null)
    setProfile(data.profile ?? null)
    return data
  }

  async function signOut() {
    await signOutService()
    setUser(null)
    setProfile(null)
  }

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    profileError,
    sendOtp,
    verifyOtp,
    loginStaff,
    signOut,
    refreshProfile: () => fetchProfile(user),
  }), [user, profile, loading, profileError, fetchProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
