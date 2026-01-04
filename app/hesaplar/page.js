'use client'

import { useState, useEffect } from 'react'
import { Loader2, ShoppingCart, Star, Filter, Search, ChevronDown, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import Link from 'next/link'

export default function HesaplarPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [siteSettings, setSiteSettings] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAccounts()
    fetchSiteSettings()
    checkAuth()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('userToken')
    const userData = localStorage.getItem('userData')
    setIsAuthenticated(!!token)
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }
  }

  const fetchSiteSettings = async () => {
    try {
      const response = await fetch('/api/site/settings')
      const data = await response.json()
      if (data.success) {
        setSiteSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching site settings:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Hesaplar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts.filter(account => {
    // Price filter
    if (priceFilter.min && account.discountPrice < parseFloat(priceFilter.min)) return false
    if (priceFilter.max && account.discountPrice > parseFloat(priceFilter.max)) return false
    // Search filter
    if (searchQuery && !account.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const FilterSidebar = () => (
    <div className="w-full rounded-lg bg-[#1e2229] p-5">
      <div className="flex items-center gap-2 mb-5">
        <Filter className="w-4 h-4 text-blue-400" />
        <span className="text-white font-bold text-base uppercase">Filtrele</span>
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="text-white text-sm font-bold mb-3">Fiyat Aralığı</h3>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="En Az"
              value={priceFilter.min}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
            />
            <input 
              type="number" 
              placeholder="En Çok"
              value={priceFilter.max}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <h3 className="text-white text-sm font-bold mb-3">Ara</h3>
          <input 
            type="text" 
            placeholder="Hesap ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
          />
        </div>

        <Button 
          onClick={() => { setPriceFilter({ min: '', max: '' }); setSearchQuery(''); }}
          className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-full"
        >
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="h-[60px] bg-[#1a1a1a] border-b border-white/5">
        <div className="h-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/">
              {siteSettings?.logo ? (
                <img 
                  src={siteSettings.logo} 
                  alt={siteSettings?.siteName || 'Logo'} 
                  className="h-14 md:h-16 object-contain"
                />
              ) : (
                <span className="text-white font-semibold text-xl md:text-2xl">
                  {siteSettings?.siteName || 'PINLY'}
                </span>
              )}
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              UC Satış
            </Link>
            <Link href="/hesaplar" className="text-white transition-colors text-sm font-medium border-b-2 border-blue-500 pb-1">
              Hesap Satış
            </Link>
            <Link href="/blog" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              Blog
            </Link>
          </nav>
            
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-[#1e2229] border-white/10 p-0">
                <div className="p-5">
                  <div className="mb-4 space-y-2">
                    <Link href="/" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      UC Satış
                    </Link>
                    <Link href="/hesaplar" className="block px-3 py-2 text-white bg-blue-600/20 rounded-lg transition-colors">
                      Hesap Satış
                    </Link>
                    <Link href="/blog" className="block px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                      Blog
                    </Link>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <FilterSidebar />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Auth Buttons / User Menu */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/?login=true">
                  <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-sm">
                    Giriş Yap
                  </Button>
                </Link>
                <Link href="/?login=true">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    Kayıt Ol
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="relative group">
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline">Hesabım</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
                
                <div className="absolute right-0 mt-2 w-48 bg-[#1e2229] rounded-xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2">
                    <Link href="/account/orders" className="block px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg">
                      📦 Siparişlerim
                    </Link>
                    <button
                      onClick={() => {
                        localStorage.removeItem('userToken')
                        localStorage.removeItem('userData')
                        setIsAuthenticated(false)
                        toast.success('Çıkış yapıldı')
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/10 rounded-lg"
                    >
                      🚪 Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Trust Badges */}
      <div className="bg-[#0d0d0d] border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-2.5">
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap text-xs md:text-sm">
            <div className="flex items-center gap-1.5 text-white/80">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Güvenli Alışveriş</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Hızlı Teslimat</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span>7/24 Destek</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[180px] md:h-[240px] flex items-center overflow-hidden bg-gradient-to-r from-purple-900/50 to-blue-900/50">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=400&fit=crop)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-[#1a1a1a]" />
        
        <div className="relative z-10 max-w-[1920px] w-full mx-auto px-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <div className="text-xs md:text-sm text-white/60 mb-1">Anasayfa &gt; Hesap Satış</div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">PUBG Mobile Hesap Satış</h1>
              <p className="text-white/70 text-sm mt-1">Destansı skinli hazır hesaplar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-5">
          {/* Sidebar */}
          <div className="hidden lg:block w-[240px] xl:w-[265px] flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar />
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingCart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg">Şu an satışta hesap bulunmuyor</p>
                <p className="text-white/40 text-sm mt-2">Yeni hesaplar için takipte kalın!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAccounts.map((account) => (
                  <Link key={account.id} href={`/hesaplar/${account.id}`}>
                    <div className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border border-white/10 hover:border-purple-500/50 bg-[#252a34]">
                      {/* Image */}
                      <div className="relative h-[180px] bg-gradient-to-b from-[#2d3444] to-[#252a34] overflow-hidden">
                        {account.imageUrl ? (
                          <img 
                            src={account.imageUrl}
                            alt={account.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-16 h-16 text-white/20" />
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {account.discountPercent > 0 && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 rounded-full text-white text-xs font-bold">
                            %{account.discountPercent} İndirim
                          </div>
                        )}
                        
                        {/* Legendary Badge */}
                        {account.legendaryMax > 0 && (
                          <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-xs font-bold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            {account.legendaryMin}-{account.legendaryMax} Destansı
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">{account.title}</h3>
                        
                        {/* Features */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {account.level > 0 && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                              Level {account.level}
                            </span>
                          )}
                          {account.rank && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              {account.rank}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-end justify-between">
                          <div>
                            {account.discountPrice < account.price && (
                              <span className="text-sm text-red-400 line-through">₺{account.price.toFixed(2)}</span>
                            )}
                            <div className="text-2xl font-bold text-white">
                              ₺{account.discountPrice.toFixed(2)}
                            </div>
                          </div>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white">
                            Satın Al
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0d0d0d] border-t border-white/5 mt-12 py-8">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 text-center">
          <p className="text-white/40 text-sm">
            © 2024 {siteSettings?.siteName || 'PINLY'}. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  )
}
