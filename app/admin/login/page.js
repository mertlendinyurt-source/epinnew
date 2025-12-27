'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check if already logged in as admin
    const token = localStorage.getItem('userToken')
    const userData = localStorage.getItem('userData')
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData)
        if (user.role === 'admin') {
          // Already admin, go to dashboard
          router.replace('/admin/dashboard')
          return
        }
      } catch (e) {}
    }
    
    // Not logged in or not admin - redirect to home page
    // User can use the regular login modal
    router.replace('/?login=true')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Yönlendiriliyor...</p>
      </div>
    </div>
  )
}
