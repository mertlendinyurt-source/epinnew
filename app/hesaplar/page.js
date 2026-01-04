'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, Star, Menu, User, ChevronDown, Filter, Search, CreditCard, Wallet, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import Link from 'next/link'
import AuthModal from '@/components/AuthModal'

export default function HesaplarPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [siteSettings, setSiteSettings] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [userBalance, setUserBalance] = useState(0)
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' })
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState('login')
  const [footerSettings, setFooterSettings] = useState(null)
  
  // Reviews states
  const [reviews, setReviews] = useState([])
  const [reviewStats, setReviewStats] = useState({ avgRating: 5.0, reviewCount: 0 })
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsHasMore, setReviewsHasMore] = useState(false)

  useEffect(() => {
    fetchAccounts()
    fetchSiteSettings()
    fetchFooterSettings()
    checkAuth()
    fetchReviews()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('userToken')
    const userData = localStorage.getItem('userData')
    setIsAuthenticated(!!token)
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
        // Fetch balance
        const balanceResponse = await fetch('/api/account/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json()
          if (balanceData.success) {
            setUserBalance(balanceData.data.balance || 0)
          }
        }
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

  const fetchFooterSettings = async () => {
    try {
      const response = await fetch('/api/footer-settings')
      const data = await response.json()
      if (data.success) {
        setFooterSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching footer settings:', error)
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

  const fetchReviews = async () => {
    setLoadingReviews(true)
    try {
      const response = await fetch('/api/reviews?game=pubg&page=1&limit=5')
      const data = await response.json()
      if (data.success) {
        setReviews(data.data.reviews || [])
        setReviewStats({
          avgRating: data.data.stats?.avgRating || 5.0,
          reviewCount: data.data.stats?.reviewCount || data.data.pagination?.total || 0
        })
        setReviewsPage(1)
        setReviewsHasMore(data.data.pagination?.hasMore || false)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const loadMoreReviews = async () => {
    setLoadingReviews(true)
    try {
      const nextPage = reviewsPage + 1
      const response = await fetch(`/api/reviews?game=pubg&page=${nextPage}&limit=5`)
      const data = await response.json()
      if (data.success) {
        setReviews(prev => [...prev, ...(data.data.reviews || [])])
        setReviewsPage(nextPage)
        setReviewsHasMore(data.data.pagination?.hasMore || false)
      }
    } catch (error) {
      console.error('Error loading more reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleAccountSelect = (account) => {
    setSelectedAccount(account)
    // Auto-select payment method based on balance
    if (isAuthenticated && userBalance >= account.discountPrice) {
      setPaymentMethod('balance')
    } else {
      setPaymentMethod('card')
    }
    setCheckoutOpen(true)
  }

  const handleCheckout = async () => {
    // Check authentication
    const token = localStorage.getItem('userToken')
    if (!token) {
      // Ödeme modalını kapat ve auth modalı aç
      setCheckoutOpen(false)
      setTimeout(() => {
        setAuthModalTab('register')
        setAuthModalOpen(true)
      }, 100)
      return
    }

    // Check balance if payment method is balance
    if (paymentMethod === 'balance' && userBalance < selectedAccount.discountPrice) {
      toast.error(`Yetersiz bakiye. Eksik: ${(selectedAccount.discountPrice - userBalance).toFixed(2)} ₺`)
      return
    }

    setOrderProcessing(true)
    try {
      const response = await fetch('/api/account-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          paymentMethod: paymentMethod
        })
      })

      const data = await response.json()
      
      if (response.status === 401) {
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
        setIsAuthenticated(false)
        setCheckoutOpen(false)
        setAuthModalTab('login')
        setAuthModalOpen(true)
        toast.error('Oturumunuz sonlandı. Lütfen tekrar giriş yapın')
        return
      }
      
      if (data.success) {
        // Balance payment - direct success
        if (paymentMethod === 'balance') {
          toast.success('Hesap satın alındı! Siparişlerinizden detayları görebilirsiniz.')
          setCheckoutOpen(false)
          // Refresh balance
          const balanceResponse = await fetch('/api/account/balance', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            if (balanceData.success) {
              setUserBalance(balanceData.data.balance || 0)
            }
          }
          // Refresh accounts
          fetchAccounts()
          // Redirect to order page
          setTimeout(() => {
            window.location.href = `/account/orders/${data.data.orderId}`
          }, 1500)
          return
        }

        // Card payment - Shopier redirect
        if (data.data.formData && data.data.paymentUrl) {
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = data.data.paymentUrl
          
          Object.entries(data.data.formData).forEach(([key, value]) => {
            const input = document.createElement('input')
            input.type = 'hidden'
            input.name = key
            input.value = value
            form.appendChild(input)
          })
          
          document.body.appendChild(form)
          form.submit()
        } else {
          toast.error('Ödeme formu oluşturulamadı')
        }
      } else {
        if (data.code === 'AUTH_REQUIRED') {
          setCheckoutOpen(false)
          setAuthModalTab('login')
          setAuthModalOpen(true)
        } else if (data.code === 'INCOMPLETE_PROFILE') {
          toast.error('Profil bilgilerinizi tamamlayın')
          window.location.href = '/account/profile'
        }
        toast.error(data.error || 'Sipariş oluşturulamadı')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Sipariş oluşturulurken hata oluştu')
    } finally {
      setOrderProcessing(false)
    }
  }

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    checkAuth()
    toast.success('Giriş başarılı!')
    
    // Eğer seçili hesap varsa, ödeme modalını tekrar aç
    if (selectedAccount) {
      setTimeout(() => {
        setCheckoutOpen(true)
      }, 300)
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
        <Filter className="w-4 h-4 text-purple-400" />
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
          className="w-full h-10 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-full"
        >
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Toaster position="top-center" richColors />
      
      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
        onSuccess={handleAuthSuccess}
      />

      {/* Header */}
      <header className="h-[60px] bg-[#1a1a1a] border-b border-white/5">
        <div className="h-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/">
              {siteSettings?.logo ? (
                <img 
                  src={siteSettings.logo} 
                  alt={siteSettings.siteName || 'Logo'} 
                  className="h-14 md:h-16 object-contain"
                />
              ) : siteSettings?.siteName ? (
                <span className="text-white font-semibold text-xl md:text-2xl">
                  {siteSettings.siteName}
                </span>
              ) : (
                <div className="h-14 md:h-16 w-32 bg-gray-700/10 rounded animate-pulse" />
              )}
            </Link>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              UC Satış
            </Link>
            <Link href="/hesaplar" className="text-white transition-colors text-sm font-medium border-b-2 border-purple-500 pb-1">
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
                    <Link href="/hesaplar" className="block px-3 py-2 text-white bg-purple-600/20 rounded-lg transition-colors">
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
                <Button 
                  onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }}
                  variant="ghost" 
                  className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
                >
                  Giriş Yap
                </Button>
                <Button 
                  onClick={() => { setAuthModalTab('register'); setAuthModalOpen(true); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                >
                  Kayıt Ol
                </Button>
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
                    <div className="px-4 py-2 border-b border-white/10 mb-2">
                      <div className="text-xs text-white/50">Bakiye</div>
                      <div className="text-green-400 font-bold">{userBalance.toFixed(2)} ₺</div>
                    </div>
                    <Link href="/account/orders" className="block px-4 py-2 text-sm text-white hover:bg-white/10 rounded-lg">
                      📦 Siparişlerim
                    </Link>
                    <button
                      onClick={() => {
                        localStorage.removeItem('userToken')
                        localStorage.removeItem('userData')
                        setIsAuthenticated(false)
                        setUser(null)
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
              <Shield className="w-4 h-4 text-green-500" />
              <span>Güvenli Alışveriş</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span>Hızlı Teslimat</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <Star className="w-4 h-4 text-purple-500" />
              <span>Destansı Skinler</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner - PUBG Slider */}
      <div className="relative h-[200px] md:h-[300px] flex items-start overflow-hidden bg-[#1a1a1a]">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
          style={{
            backgroundImage: 'url(https://customer-assets.emergentagent.com/job_8b265523-4875-46c8-ab48-988eea2d3777/artifacts/prqvfd8b_wp5153882-pubg-fighting-wallpapers.jpg)',
            opacity: 1
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-[#1a1a1a]" />
        
        <div className="relative z-10 max-w-[1920px] w-full mx-auto px-4 md:px-6 pt-6 md:pt-10">
          <div className="flex items-center gap-3 md:gap-4">
            {!siteSettings ? (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Loader2 className="w-7 h-7 md:w-10 md:h-10 text-white animate-spin" />
              </div>
            ) : siteSettings.categoryIcon ? (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={siteSettings.categoryIcon}
                  alt="PUBG"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Star className="w-7 h-7 md:w-10 md:h-10 text-white fill-white" />
              </div>
            )}
            <div>
              <div className="text-xs md:text-sm text-white/60 mb-0.5 md:mb-1">Anasayfa &gt; Hesap Satış</div>
              <h1 className="text-xl md:text-[28px] font-bold text-white">PUBG Mobile Hesap Satış</h1>
              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                <span className="text-yellow-400 text-xs md:text-sm">★★★★★</span>
                <span className="text-white/70 text-xs md:text-sm">Destansı Skinli Hazır Hesaplar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex gap-4 md:gap-5">
          {/* Sidebar */}
          <div className="hidden lg:block w-[240px] xl:w-[265px] flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar />
            </div>
          </div>

          {/* Accounts Grid - UC kartları gibi */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                  <p className="text-white/60 text-sm">Hesaplar yükleniyor...</p>
                </div>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-20">
                <Star className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg">Şu an satışta hesap bulunmuyor</p>
                <p className="text-white/40 text-sm mt-2">Yeni hesaplar için takipte kalın!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredAccounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => handleAccountSelect(account)}
                    className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl flex flex-col border border-white/10 hover:border-purple-500/50 w-full"
                    style={{ backgroundColor: '#252a34', maxWidth: '280px', margin: '0 auto' }}
                  >
                    {/* Image Section */}
                    <div className="relative aspect-[4/3] bg-gradient-to-b from-[#2d3444] to-[#252a34] flex items-center justify-center p-2">
                      {account.imageUrl ? (
                        <img 
                          src={account.imageUrl}
                          alt={account.title}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&h=300&fit=crop";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Star className="w-12 h-12 text-white/30" />
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col p-3">
                      <div className="text-[11px] text-purple-400 font-bold uppercase">HESAP</div>
                      <div className="text-[14px] md:text-[13px] font-bold text-white line-clamp-2 min-h-[40px]">{account.title}</div>
                      
                      {/* Legendary Badge */}
                      {account.legendaryMax > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-[11px] text-yellow-400 font-medium">
                            {account.legendaryMin}-{account.legendaryMax} Destansı
                          </span>
                        </div>
                      )}
                      
                      {/* Level & Rank */}
                      {(account.level > 0 || account.rank) && (
                        <div className="flex items-center gap-2 mt-1">
                          {account.level > 0 && (
                            <span className="text-[10px] text-white/60">Lv.{account.level}</span>
                          )}
                          {account.rank && (
                            <span className="text-[10px] text-white/60">{account.rank}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Price Section */}
                      <div className="mt-3 pt-2 border-t border-white/10">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {account.discountPrice < account.price && (
                            <span className="text-[12px] text-red-400 line-through">₺{account.price.toFixed(2).replace('.', ',')}</span>
                          )}
                          <span className="text-[18px] font-bold text-white">₺{account.discountPrice.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {account.discountPercent > 0 && (
                          <div className="text-[11px] text-emerald-400 font-medium mt-1">%{account.discountPercent} indirim</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="bg-[#1e2229] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <span>Değerlendirmeler</span>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm">{reviewStats.avgRating.toFixed(1)} / 5</span>
              </div>
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Stats Summary */}
            <div className="bg-[#282d36] rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-5 h-5 ${star <= Math.round(reviewStats.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xl font-bold text-white">{reviewStats.avgRating.toFixed(2)}</span>
                  <span className="text-white/60">/ 5</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <p className="text-white/70 text-sm">
                  Değerlendirme anketine toplamda <span className="text-white font-semibold">{reviewStats.reviewCount.toLocaleString()}</span> kişi katıldı
                </p>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {loadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="bg-[#282d36] rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {review.userName?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{review.userName || 'Misafir'}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3.5 h-3.5 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-white/70 text-sm mb-2">{review.comment}</p>
                        )}
                        <p className="text-white/40 text-xs">
                          {new Date(review.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/60">
                  Henüz değerlendirme bulunmuyor.
                </div>
              )}
            </div>

            {/* Load More Button */}
            {reviewsHasMore && (
              <button
                onClick={loadMoreReviews}
                disabled={loadingReviews}
                className="mt-6 w-full py-3 bg-[#282d36] hover:bg-[#323842] rounded-lg text-blue-400 font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loadingReviews ? 'Yükleniyor...' : 'Daha fazla görüntüle'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal - UC modalı gibi ama Oyuncu ID olmadan */}
      <Dialog open={checkoutOpen} onOpenChange={(open) => {
        if (!orderProcessing) {
          setCheckoutOpen(open)
        }
      }}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden border-0" style={{ backgroundColor: 'transparent' }}>
          <div 
            className="absolute inset-0 bg-cover bg-center blur-sm"
            style={{
              backgroundImage: 'url(https://customer-assets.emergentagent.com/job_8b265523-4875-46c8-ab48-988eea2d3777/artifacts/prqvfd8b_wp5153882-pubg-fighting-wallpapers.jpg)',
              zIndex: -1
            }}
          />
          <div className="absolute inset-0 bg-black/70" style={{ zIndex: -1 }} />
          
          <div className="relative bg-[#1e2229]/95 backdrop-blur-md flex flex-col max-h-[90vh]">
            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-white/5 flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-wide">ÖDEME TÜRÜNÜ SEÇİN</h2>
            </div>
            
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Column - Payment Methods - HIDDEN ON MOBILE */}
                <div className="hidden md:block p-5 md:p-8 space-y-6 md:space-y-8 border-b md:border-b-0 md:border-r border-white/5">
                  <div>
                    <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Ödeme yöntemleri</Label>
                    
                    {/* Balance Payment Option - Only show if user has SUFFICIENT balance */}
                    {isAuthenticated && selectedAccount && userBalance >= selectedAccount.discountPrice && (
                      <div 
                        onClick={() => setPaymentMethod('balance')}
                        className={`relative p-4 md:p-5 rounded-lg border-2 mb-3 cursor-pointer transition-all ${
                          paymentMethod === 'balance'
                            ? 'bg-green-900/20 border-green-500'
                            : 'bg-[#12161D] border-white/10 hover:border-white/20'
                        }`}
                      >
                        {paymentMethod === 'balance' && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <div className="mb-3">
                          <div className="text-base md:text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Bakiye ile Öde
                          </div>
                          <div className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-[11px] text-green-400 font-semibold">
                            Anında teslimat
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-sm text-white/70">
                            Mevcut Bakiye: <span className="font-bold text-green-400">{userBalance.toFixed(2)} ₺</span>
                          </div>
                          <div className="text-xs text-green-400 font-semibold">
                            ✓ Yeterli bakiye
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card Payment Option */}
                    <div 
                      onClick={() => setPaymentMethod('card')}
                      className={`relative p-4 md:p-5 rounded-lg border-2 cursor-pointer transition-all ${
                        paymentMethod === 'card'
                          ? 'bg-purple-900/20 border-purple-500'
                          : 'bg-[#12161D] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {paymentMethod === 'card' && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <div className="text-base md:text-lg font-bold text-white mb-1 flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Kredi / Banka Kartı
                        </div>
                        <div className="inline-block px-2 py-0.5 rounded bg-white/10 text-[11px] text-white/70">
                          Anında teslimat
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <img src="/uploads/cards/visa.svg" alt="VISA" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
                        <img src="/uploads/cards/mastercard.svg" alt="Mastercard" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
                        <img src="/uploads/cards/troy.svg" alt="Troy" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Description in Modal */}
                  {selectedAccount?.description && (
                    <div className="pt-4 border-t border-white/10">
                      <Label className="text-sm text-white/80 uppercase mb-3 block">Hesap Açıklaması</Label>
                      <div className="text-sm text-white/60 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {selectedAccount.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Product Details */}
                {selectedAccount && (
                  <div className="p-5 md:p-8 space-y-6 md:space-y-8 bg-[#1a1e24]/95">
                    <div>
                      <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Hesap</Label>
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center bg-[#12161D] overflow-hidden p-2">
                          {selectedAccount.imageUrl ? (
                            <img 
                              src={selectedAccount.imageUrl}
                              alt={selectedAccount.title}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop";
                              }}
                            />
                          ) : (
                            <Star className="w-8 h-8 text-white/30" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-lg md:text-xl font-bold text-white mb-2">{selectedAccount.title}</div>
                          
                          {/* Features */}
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAccount.legendaryMax > 0 && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                ⭐ {selectedAccount.legendaryMin}-{selectedAccount.legendaryMax} Destansı
                              </span>
                            )}
                            {selectedAccount.level > 0 && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                Lv.{selectedAccount.level}
                              </span>
                            )}
                            {selectedAccount.rank && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                {selectedAccount.rank}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Fiyat detayları</Label>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm md:text-base">
                          <span className="text-white/70">Orjinal Fiyat</span>
                          <span className="text-white font-bold">₺ {selectedAccount.price.toFixed(2)}</span>
                        </div>
                        {selectedAccount.discountPrice < selectedAccount.price && (
                          <div className="flex justify-between items-center text-sm md:text-base">
                            <span className="text-purple-400 font-semibold">Size Özel Fiyat</span>
                            <span className="text-purple-400 font-bold">₺ {selectedAccount.discountPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-white/10">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm md:text-base text-white/70 uppercase">Ödenecek Tutar</span>
                        <span className="text-2xl md:text-3xl font-black text-white">
                          ₺ {selectedAccount.discountPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* Payment Button - Visible on all screens */}
                      <Button
                        onClick={handleCheckout}
                        disabled={orderProcessing}
                        className="flex w-full h-12 md:h-14 bg-purple-600 hover:bg-purple-500 text-white font-bold text-base md:text-lg uppercase tracking-wide rounded-lg items-center justify-center"
                      >
                        {orderProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            İşleniyor...
                          </>
                        ) : (
                          'Ödemeye Git'
                        )}
                      </Button>
                      
                      {/* Account Description - Visible on mobile at bottom */}
                      {selectedAccount?.description && (
                        <div className="pt-4 mt-4 border-t border-white/10">
                          <Label className="text-sm text-white/80 uppercase mb-3 block">Hesap Açıklaması</Label>
                          <div className="text-sm text-white/60 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {selectedAccount.description}
                          </div>
                        </div>
                      )}
                      
                      {/* Info Note */}
                      <p className="text-center text-white/40 text-xs mt-4">
                        Hesap bilgileri ödeme sonrası siparişlerinizden görüntülenebilir.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plyr Style Footer */}
      <footer className="mt-12 md:mt-16 bg-[#12151a] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
            
            {/* Column 1: Logo & Social */}
            <div className="space-y-5">
              {/* Logo */}
              <div className="flex items-center gap-3">
                {siteSettings?.logo ? (
                  <img 
                    src={siteSettings.logo} 
                    alt={siteSettings?.siteName || 'Logo'} 
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">P</span>
                  </div>
                )}
                {!siteSettings?.logo && (
                  <span className="text-xl font-bold text-white">{siteSettings?.siteName || 'PINLY'}</span>
                )}
              </div>
              
              <p className="text-white/50 text-sm">
                Güvenli ve hızlı PUBG hesap satış platformu
              </p>
              
              {/* Contact Info */}
              {(siteSettings?.contactPhone || siteSettings?.contactEmail) && (
                <div className="space-y-2 pt-2">
                  {siteSettings?.contactPhone && (
                    <a href={`tel:${siteSettings.contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {siteSettings.contactPhone}
                    </a>
                  )}
                  {siteSettings?.contactEmail && (
                    <a href={`mailto:${siteSettings.contactEmail}`} className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {siteSettings.contactEmail}
                    </a>
                  )}
                </div>
              )}
              
              {/* Social Icons */}
              <div className="flex items-center gap-3">
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <svg className="w-5 h-5 text-white/60 hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="Twitter/X"
                >
                  <svg className="w-5 h-5 text-white/60 hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: Hızlı Erişim */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
                Hızlı Erişim
              </h3>
              <ul className="space-y-3">
                {(footerSettings?.quickLinks || [
                  { label: 'Giriş Yap', action: 'login' },
                  { label: 'Kayıt Ol', action: 'register' }
                ]).map((link, index) => (
                  <li key={index}>
                    <button 
                      onClick={() => {
                        setAuthModalTab(link.action === 'login' ? 'login' : 'register');
                        setAuthModalOpen(true);
                      }}
                      className="text-white/50 hover:text-white hover:underline text-sm transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Popüler Kategoriler */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
                Popüler Kategoriler
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">
                    PUBG Mobile UC
                  </Link>
                </li>
                <li>
                  <Link href="/hesaplar" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">
                    PUBG Hesap Satış
                  </Link>
                </li>
                {(footerSettings?.categories || []).map((cat, index) => (
                  <li key={index}>
                    <a 
                      href={cat.url} 
                      className="text-white/50 hover:text-white hover:underline text-sm transition-colors"
                    >
                      {cat.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Kurumsal/Künye */}
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
                Kurumsal/Künye
              </h3>
              <ul className="space-y-3">
                {(footerSettings?.corporateLinks || []).length > 0 ? (
                  footerSettings.corporateLinks.map((link, index) => (
                    <li key={index}>
                      <a 
                        href={`/legal/${link.slug}`} 
                        className="text-white/50 hover:text-white hover:underline text-sm transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))
                ) : (
                  // Fallback if no footer settings
                  <>
                    <li><a href="/legal/hizmet-sartlari" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Hizmet Şartları</a></li>
                    <li><a href="/legal/kullanici-sozlesmesi" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Kullanıcı Sözleşmesi</a></li>
                    <li><a href="/legal/gizlilik-politikasi" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Gizlilik Politikası</a></li>
                    <li><a href="/legal/kvkk" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">KVKK Aydınlatma Metni</a></li>
                    <li><a href="/legal/iade-politikasi" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">İade Politikası</a></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/30 text-sm">
                © 2025 {siteSettings?.siteName || 'PINLY'}. Tüm hakları saklıdır.
              </p>
              <p className="text-white/20 text-xs text-center md:text-right">
                PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
