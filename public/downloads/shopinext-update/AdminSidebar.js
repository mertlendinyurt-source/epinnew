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
  FolderOpen,
  Users,
  Menu,
  X
} from 'lucide-react'

// AÇILIR/KAPANIR MENÜ YAPISI
const menuGroups = [
  {
    id: 'main',
    title: null, // Ana menü - her zaman açık
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/orders', icon: ShoppingCart, label: 'Siparişler' },
      { href: '/admin/verification', icon: ShieldAlert, label: 'Doğrulama Bekleyen', color: 'text-amber-400' },
      { href: '/admin/users', icon: Users, label: 'Kullanıcılar', color: 'text-blue-400' },
      { href: '/admin/products', icon: Package, label: 'UC Ürünleri' },
      { href: '/admin/accounts', icon: Briefcase, label: 'Hesap Listesi', color: 'text-purple-400' },
      { href: '/admin/support', icon: MessageCircle, label: 'Destek' },
    ]
  },
  {
    id: 'content',
    title: 'İçerik',
    icon: FolderOpen,
    items: [
      { href: '/admin/blog', icon: Newspaper, label: 'Blog / Haberler' },
      { href: '/admin/content/legal', icon: Briefcase, label: 'Kurumsal Sayfalar' },
      { href: '/admin/content/pubg', icon: Gamepad2, label: 'Oyun İçeriği' },
      { href: '/admin/reviews', icon: Star, label: 'Değerlendirmeler', color: 'text-yellow-400' },
    ]
  },
  {
    id: 'settings',
    title: 'Ayarlar',
    icon: Settings,
    items: [
      { href: '/admin/settings/site', icon: Settings, label: 'Site Ayarları' },
      { href: '/admin/settings/email', icon: Mail, label: 'E-posta Ayarları' },
      { href: '/admin/settings/sms', icon: MessageCircle, label: 'SMS Ayarları', color: 'text-green-400' },
      { href: '/admin/settings/seo', icon: Search, label: 'SEO & Analytics' },
      { href: '/admin/settings/oauth', icon: Globe, label: 'OAuth Ayarları' },
      { href: '/admin/settings/regions', icon: Globe, label: 'Bölge Ayarları' },
      { href: '/admin/settings/footer', icon: FileText, label: 'Footer Ayarları' },
      { href: '/admin/settings/payments', icon: CreditCard, label: 'Shopier Ayarları' },
      { href: '/admin/settings/shopinext', icon: CreditCard, label: 'Shopinext Ayarları', color: 'text-purple-400' },
      { href: '/admin/settings/dijipin', icon: CreditCard, label: 'DijiPin Ayarları', color: 'text-yellow-400' },
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

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const router = useRouter()
  const pathname = usePathname()
  // Varsayılan: tüm gruplar kapalı
  const [expandedGroups, setExpandedGroups] = useState([])

  // LocalStorage'dan açık grupları yükle
  useEffect(() => {
    const saved = localStorage.getItem('adminSidebarExpanded')
    if (saved) {
      try {
        setExpandedGroups(JSON.parse(saved))
      } catch (e) {
        setExpandedGroups([])
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    localStorage.removeItem('userToken')
    localStorage.removeItem('userData')
    router.push('/admin/login')
  }

  const isActive = (href) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin' || pathname === '/admin/dashboard'
    }
    return pathname.startsWith(href)
  }

  // Mobilde menü item tıklandığında sidebar'ı kapat
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              UC
            </div>
            <div>
              <span className="text-lg font-bold text-white block">PINLY</span>
              <span className="text-xs text-slate-400">Admin Panel</span>
            </div>
          </Link>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {menuGroups.map((group) => (
            <div key={group.id} className="mb-2">
              {/* Collapsible Group Header */}
              {group.title ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    expandedGroups.includes(group.id)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <group.icon className="w-4 h-4" />
                    {group.title}
                  </span>
                  {expandedGroups.includes(group.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : null}

              {/* Group Items - Ana menü her zaman açık, diğerleri toggle ile */}
              {(group.title === null || expandedGroups.includes(group.id)) && (
                <div 
                  className={group.title ? 'ml-4 mt-1 space-y-0.5 border-l-2 border-slate-700 pl-3' : 'space-y-0.5'}
                  style={group.title ? { animation: 'slideDown 0.2s ease-out' } : {}}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
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
        <div className="p-3 border-t border-slate-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>

        {/* CSS Animation */}
        <style jsx global>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  )
}

// Mobile Header Component - Hamburger button için
export function AdminMobileHeader({ onMenuClick }) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 z-30 flex items-center px-4">
      <button 
        onClick={onMenuClick}
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="ml-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          UC
        </div>
        <span className="text-white font-semibold">PINLY Admin</span>
      </div>
    </div>
  )
}
