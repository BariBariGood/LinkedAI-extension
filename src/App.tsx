import { Routes, Route, Navigate, HashRouter } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/login'
import Home from './pages/home'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="w-[400px] h-[500px] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-700">Loading LinkedAI...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[400px] h-[500px] overflow-hidden bg-white">
      <HashRouter>
        <Routes>
          <Route 
            path="/" 
            element={session ? <Home /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/login" 
            element={!session ? <Login /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </HashRouter>
    </div>
  )
}

export default App
