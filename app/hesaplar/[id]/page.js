'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Star, ChevronLeft, Check, CreditCard, Wallet, User, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import Link from 'next/link'
import AuthModal from '@/components/AuthModal'

export default function HesapDetayPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [siteSettings, setSiteSettings] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [userBalance, setUserBalance] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState('login')

  useEffect(() => {
    if (params.id) {
      fetchAccount(params.id)
    }
    fetchSiteSettings()
    checkAuth()
  }, [params.id])

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

  const fetchAccount = async (id) => {
    try {
      const response = await fetch(`/api/accounts/${id}`)
      const data = await response.json()
      if (data.success) {
        setAccount(data.data)
        // Auto-select payment method based on balance
        if (userBalance >= data.data.discountPrice) {
          setPaymentMethod('balance')
        }
      } else {
        toast.error('Hesap bulunamadı')
        router.push('/hesaplar')
      }
    } catch (error) {
      console.error('Error fetching account:', error)
      toast.error('Hesap yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    // Check authentication
    const token = localStorage.getItem('userToken')
    if (!token) {
      setAuthModalTab('login')
      setAuthModalOpen(true)
      toast.error('Satın almak için giriş yapmalısınız')
      return
    }

    // Check balance if payment method is balance
    if (paymentMethod === 'balance' && userBalance < account.discountPrice) {
      toast.error(`Yetersiz bakiye. Eksik: ${(account.discountPrice - userBalance).toFixed(2)} ₺`)
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
          accountId: account.id,
          paymentMethod: paymentMethod
        })
      })

      const data = await response.json()
      
      if (response.status === 401) {
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
        setIsAuthenticated(false)
        setAuthModalTab('login')
        setAuthModalOpen(true)
        toast.error('Oturumunuz sonlandı. Lütfen tekrar giriş yapın')
        return
      }
      
      if (data.success) {
        // Balance payment - direct success
        if (paymentMethod === 'balance') {
          toast.success('Hesap satın alındı! Siparişlerinizden detayları görebilirsiniz.')
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
          // Redirect to order page
          setTimeout(() => {
            router.push(`/account/orders/${data.data.orderId}`)
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
          setAuthModalTab('login')
          setAuthModalOpen(true)
        } else if (data.code === 'INCOMPLETE_PROFILE') {
          toast.error('Profil bilgilerinizi tamamlayın')
          router.push('/account/profile')
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
    toast.success('Giriş başarılı! Şimdi satın alabilirsiniz.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-white/60">Hesap bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Toaster position="top-center" richColors />
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        onSuccess={handleAuthSuccess}
      />

      {/* Header */}
      <header className="h-[60px] bg-[#1a1a1a] border-b border-white/5">
        <div className="h-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {siteSettings?.logo ? (
              <img src={siteSettings.logo} alt="Logo" className="h-12 object-contain" />
            ) : (
              <span className="text-white font-semibold text-xl">{siteSettings?.siteName || 'PINLY'}</span>
            )}
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-white/70 hover:text-white text-sm">UC Satış</Link>
            <Link href="/hesaplar" className="text-white text-sm border-b-2 border-purple-500 pb-1">Hesap Satış</Link>
          </nav>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                Giriş Yap
              </Button>
            ) : (
              <Link href="/account/orders">
                <Button variant="ghost" className="text-white/80 hover:text-white">
                  <User className="w-5 h-5 mr-2" />
                  Hesabım
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Link href="/hesaplar" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span>Hesaplara Dön</span>
        </Link>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Account Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#2d3444] to-[#252a34] aspect-video">
              {account.imageUrl ? (
                <img src={account.imageUrl} alt={account.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Star className="w-24 h-24 text-white/20" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {account.legendaryMax > 0 && (
                  <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white text-sm font-bold flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-current" />
                    {account.legendaryMin}-{account.legendaryMax} Destansı Skin
                  </div>
                )}
              </div>
              
              {account.discountPercent > 0 && (
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-red-500 rounded-full text-white text-sm font-bold">
                  %{account.discountPercent} İndirim
                </div>
              )}
            </div>

            {/* Title & Features */}
            <div className="bg-[#1e2229] rounded-2xl p-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{account.title}</h1>
              
              {/* Feature Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {account.level > 0 && (
                  <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-sm rounded-full font-medium">
                    Level {account.level}
                  </span>
                )}
                {account.rank && (
                  <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 text-sm rounded-full font-medium">
                    {account.rank}
                  </span>
                )}
                {account.features?.map((feature, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white/10 text-white/70 text-sm rounded-full">
                    {feature}
                  </span>
                ))}
              </div>

              {/* Description */}
              {account.description && (
                <div className="prose prose-invert max-w-none">
                  <h3 className="text-white text-lg font-semibold mb-3">Hesap Açıklaması</h3>
                  <div className="text-white/70 whitespace-pre-wrap leading-relaxed">
                    {account.description}
                  </div>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="bg-[#1e2229] rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">Güvence</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Güvenli Ödeme</p>
                    <p className="text-white/50 text-xs">256-bit SSL</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Hızlı Teslimat</p>
                    <p className="text-white/50 text-xs">Anında bilgi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Garanti</p>
                    <p className="text-white/50 text-xs">7/24 Destek</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Purchase Box */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <div className="bg-[#1e2229] rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-6">Satın Al</h2>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-white/60 text-sm mb-1">Fiyat</div>
                  {account.discountPrice < account.price && (
                    <div className="text-lg text-red-400 line-through">₺{account.price.toFixed(2)}</div>
                  )}
                  <div className="text-4xl font-bold text-white">₺{account.discountPrice.toFixed(2)}</div>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                  <div className="text-white/60 text-sm mb-3">Ödeme Yöntemi</div>
                  <div className="space-y-3">
                    {/* Card Payment */}
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20'}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'card' ? 'bg-blue-500' : 'bg-white/10'}`}>
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium">Kredi / Banka Kartı</div>
                        <div className="text-white/50 text-sm">Anında teslimat</div>
                      </div>
                      {paymentMethod === 'card' && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Balance Payment */}
                    {isAuthenticated && (
                      <button
                        onClick={() => setPaymentMethod('balance')}
                        disabled={userBalance < account.discountPrice}
                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${paymentMethod === 'balance' ? 'border-green-500 bg-green-500/10' : 'border-white/10 hover:border-white/20'} ${userBalance < account.discountPrice ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'balance' ? 'bg-green-500' : 'bg-white/10'}`}>
                          <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-white font-medium">Bakiye ile Öde</div>
                          <div className="text-white/50 text-sm">Bakiye: ₺{userBalance.toFixed(2)}</div>
                        </div>
                        {paymentMethod === 'balance' && userBalance >= account.discountPrice && (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Important Note */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <p className="text-amber-400 text-sm">
                    <strong>Not:</strong> Hesap bilgileri ödeme sonrası siparişlerinizden görüntülenebilir.
                  </p>
                </div>

                {/* Purchase Button */}
                <Button
                  onClick={handlePurchase}
                  disabled={orderProcessing}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl"
                >
                  {orderProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    'Satın Al'
                  )}
                </Button>

                {!isAuthenticated && (
                  <p className="text-center text-white/50 text-sm mt-4">
                    Satın almak için <button onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }} className="text-blue-400 hover:underline">giriş yapın</button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
