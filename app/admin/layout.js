'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />
      <div className="ml-64">
        {children}
      </div>
    </div>
  )
}
