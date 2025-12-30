'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { 
  ShieldCheck,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Mail,
  Search,
  Globe,
  CreditCard,
  ShieldAlert,
  Ban,
  ClipboardList,
  LogOut,
  ChevronDown,
  ChevronRight,
  Star,
  Briefcase,
  Gamepad2
} from 'lucide-react'

const menuGroups = [
  {
    id: 'main',
    title: null, // Ana menü başlıksız
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/orders', icon: ShoppingCart, label: 'Siparişler' },
      { href: '/admin/products', icon: Package, label: 'Ürünler' },
      { href: '/admin/users', icon: Users, label: 'Kullanıcılar' },
      { href: '/admin/support', icon: MessageSquare, label: 'Destek' },
    ]
  },
  {
    id: 'content',
    title: 'İçerik',
    icon: FileText,
    items: [
      { href: '/admin/blog', icon: FileText, label: 'Blog / Haberler', color: 'text-purple-400' },
      { href: '/admin/legal-pages', icon: Briefcase, label: 'Kurumsal Sayfalar' },
      { href: '/admin/reviews', icon: Star, label: 'Değerlendirmeler', color: 'text-yellow-400' },
      { href: '/admin/games', icon: Gamepad2, label: 'Oyun İçeriği' },
    ]
  },
  {
    id: 'settings',
    title: 'Ayarlar',
    icon: Settings,
    items: [
      { href: '/admin/settings', icon: Settings, label: 'Site Ayarları' },
      { href: '/admin/settings/email', icon: Mail, label: 'E-posta Ayarları' },
      { href: '/admin/settings/seo', icon: Search, label: 'SEO & Analytics' },
      { href: '/admin/settings/oauth', icon: Globe, label: 'OAuth Ayarları' },
      { href: '/admin/settings/regions', icon: Globe, label: 'Bölge Ayarları' },
      { href: '/admin/footer-settings', icon: FileText, label: 'Footer Ayarları' },
      { href: '/admin/settings/payment', icon: CreditCard, label: 'Ödeme Ayarları' },
    ]
  },
  {
    id: 'security',
    title: 'Güvenlik',
    icon: ShieldAlert,
    items: [
      { href: '/admin/settings/risk', icon: ShieldAlert, label: 'Risk Ayarları', color: 'text-orange-400' },
      { href: '/admin/blacklist', icon: Ban, label: 'Kara Liste', color: 'text-red-400' },
      { href: '/admin/risk-logs', icon: ClipboardList, label: 'Risk Logları', color: 'text-cyan-400' },
      { href: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logları' },
    ]
  }
]

export default function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState(['content', 'settings', 'security'])

  // Load expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('adminSidebarExpanded')
    if (saved) {
      setExpandedGroups(JSON.parse(saved))
    }
  }, [])

  // Save expanded state
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newState = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
      localStorage.setItem('adminSidebarExpanded', JSON.stringify(newState))
      return newState
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  const isActive = (href) => {
    if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/admin" className="flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-blue-500" />
          <span className="text-xl font-bold text-white">PINLY Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuGroups.map((group) => (
          <div key={group.id} className="mb-2">
            {/* Group Header (collapsible) */}
            {group.title && (
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {group.icon && <group.icon className="w-3.5 h-3.5" />}
                  {group.title}
                </span>
                {expandedGroups.includes(group.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Group Items */}
            {(group.title === null || expandedGroups.includes(group.id)) && (
              <div className={group.title ? 'ml-2 space-y-0.5' : 'space-y-0.5'}>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                        active
                          ? 'bg-blue-600/20 text-blue-400 font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color || ''}`} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  )
}
