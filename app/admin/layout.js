'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar, { AdminMobileHeader } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Route değiştiğinde sidebar'ı kapat (mobil için)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Login sayfasında sidebar gösterme
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Header with Hamburger */}
      <AdminMobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="lg:ml-64 pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  )
}
