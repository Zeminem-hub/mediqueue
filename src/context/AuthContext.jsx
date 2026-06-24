/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function profileFromUser(user) {
  if (!user) return null

  return {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    role: user.user_metadata?.role || null,
    clinic_id: user.user_metadata?.clinic_id || null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      setProfileError('')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (error) {
      setProfile(profileFromUser(currentUser))
      setProfileError(error.message)
      return
    }

    setProfile(data || profileFromUser(currentUser))
    setProfileError('')
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        setLoading(true)

        window.setTimeout(async () => {
          await fetchProfile(nextUser)
          if (active) setLoading(false)
        }, 0)
      },
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp({ fullName, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'patient',
        },
      },
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    profileError,
    signIn,
    signUp,
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
