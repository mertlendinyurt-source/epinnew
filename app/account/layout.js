'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Package, Shield, LogOut, Home, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const menuItems = [
  { href: '/account/profile', label: 'Profil', icon: User },
  { href: '/account/orders', label: 'Siparişlerim', icon: Package },
  { href: '/account/security', label: 'Güvenlik', icon: Shield },
];

export default function AccountLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('/api/account/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    toast.success('Çıkış yapıldı');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12151a]">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-[#1e2229] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white/60"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">UC</span>
              </div>
              <span className="text-white font-semibold hidden sm:block">PUBG UC Store</span>
            </Link>
          </div>

          {/* Breadcrumb */}
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link href="/" className="text-white/50 hover:text-white transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span>Ana Sayfa</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-white/30" />
            <span className="text-white/50">Hesabım</span>
            <ChevronRight className="w-4 h-4 text-white/30" />
            <span className="text-blue-400">
              {menuItems.find(item => item.href === pathname)?.label || 'Profil'}
            </span>
          </nav>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-white text-sm font-medium">
                {user?.firstName || user?.email?.split('@')[0] || 'Kullanıcı'}
              </p>
              <p className="text-white/50 text-xs">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className={`
            lg:w-64 lg:flex-shrink-0
            ${sidebarOpen ? 'block' : 'hidden lg:block'}
          `}>
            <div className="bg-[#1e2229] rounded-xl border border-white/10 overflow-hidden">
              {/* User card */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email?.split('@')[0] || 'Kullanıcı'}
                    </p>
                    <p className="text-white/50 text-sm truncate max-w-[150px]">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                        ${isActive 
                          ? 'bg-blue-600/20 text-blue-400' 
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-red-400 hover:bg-red-600/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Çıkış Yap</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
