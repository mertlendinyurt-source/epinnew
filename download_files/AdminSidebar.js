'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard,
  ShoppingCart,
  Package,
  MessageCircle,
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
  Gamepad2,
  Newspaper,
  FileStack,
  Menu,
  X
} from 'lucide-react'

// Menü grupları - Collapsible yapı
const menuGroups = [
  {
    id: 'main',
    title: null, // Ana menü başlıksız - her zaman açık
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/orders', icon: ShoppingCart, label: 'Siparişler' },
      { href: '/admin/products', icon: Package, label: 'Ürünler' },
      { href: '/admin/support', icon: MessageCircle, label: 'Destek' },
      { href: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logları' },
      { href: '/admin/settings/payment', icon: CreditCard, label: 'Ödeme Ayarları' },
      { href: '/admin/settings/seo', icon: Search, label: 'SEO & Analytics' },
      { href: '/admin/settings/email', icon: Mail, label: 'E-posta Ayarları' },
      { href: '/admin/settings/site', icon: Settings, label: 'Site Ayarları' },
      { href: '/admin/settings/oauth', icon: Globe, label: 'OAuth Ayarları' },
      { href: '/admin/settings/regions', icon: Globe, label: 'Bölge Ayarları' },
      { href: '/admin/games', icon: Gamepad2, label: 'Oyun İçeriği' },
      { href: '/admin/legal-pages', icon: Briefcase, label: 'Kurumsal Sayfalar' },
      { href: '/admin/reviews', icon: Star, label: 'Değerlendirmeler', color: 'text-yellow-400' },
      { href: '/admin/footer-settings', icon: FileStack, label: 'Footer Ayarları' },
    ]
  },
  {
    id: 'security',
    title: 'GÜVENLİK',
    icon: ShieldAlert,
    items: [
      { href: '/admin/settings/risk', icon: ShieldAlert, label: 'Risk Ayarları', color: 'text-orange-400' },
      { href: '/admin/blacklist', icon: Ban, label: 'Kara Liste', color: 'text-red-400' },
      { href: '/admin/risk-logs', icon: ClipboardList, label: 'Risk Logları', color: 'text-cyan-400' },
    ]
  }
]

export default function AdminSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState(['security']) // Varsayılan olarak güvenlik açık
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // LocalStorage'dan açık grupları yükle
  useEffect(() => {
    const saved = localStorage.getItem('adminSidebarExpanded')
    if (saved) {
      try {
        setExpandedGroups(JSON.parse(saved))
      } catch (e) {
        console.error('Sidebar state parse error:', e)
      }
    }
  }, [])

  // Grup aç/kapa
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newState = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
      localStorage.setItem('adminSidebarExpanded', JSON.stringify(newState))
      return newState
    })
  }

  // Çıkış yap
  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  // Aktif sayfa kontrolü
  const isActive = (href) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin' || pathname === '/admin/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Sidebar içeriği
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-slate-700/50">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            UC
          </div>
          <div>
            <span className="text-lg font-bold text-white block">PINLY</span>
            <span className="text-xs text-slate-400">Admin Panel</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuGroups.map((group) => (
          <div key={group.id} className="mb-2">
            {/* Group Header (collapsible) - Başlıklı gruplar için */}
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
              <div className={group.title ? 'ml-2 space-y-0.5 border-l border-slate-700/50 pl-2' : 'space-y-0.5'}>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        active
                          ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? '' : (item.color || '')}`} />
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
      <div className="p-3 border-t border-slate-700/50">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-700/50 flex-col z-40">
        <SidebarContent />
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 h-full w-72 bg-slate-900 border-r border-slate-700/50 flex flex-col z-50 transform transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <SidebarContent />
      </div>
    </>
  )
}
