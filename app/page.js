'use client'

import { useState, useEffect } from 'react'
import { User, Check, X, Loader2, Info, Menu, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import AuthModal from '@/components/AuthModal'

// Banner Icon Component for dynamic icons
function BannerIcon({ icon, size }) {
  const icons = {
    fire: <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.276 1.15-4.326 2.919-5.581C8.687 9.89 9.12 9.094 9.12 8.2c0-.894-.433-1.69-1.201-2.219C7.15 5.326 6 3.276 6 1c0-.55.45-1 1-1s1 .45 1 1c0 1.378.688 2.604 1.756 3.281C10.543 4.831 11 5.55 11 6.4c0 .85-.457 1.569-1.244 2.119C8.688 9.196 8 10.422 8 11.8c0 2.21 1.79 4 4 4s4-1.79 4-4c0-1.378-.688-2.604-1.756-3.281C13.457 7.969 13 7.25 13 6.4c0-.85.457-1.569 1.244-2.119C15.312 3.604 16 2.378 16 1c0-.55.45-1 1-1s1 .45 1 1c0 2.276-1.15 4.326-2.919 5.581-.768.55-1.201 1.346-1.201 2.219 0 .894.433 1.69 1.201 2.219C16.85 11.674 18 13.724 18 16c0 3.866-3.134 7-7 7h1z"/>,
    bolt: <path d="M13 10V3L4 14h7v7l9-11h-7z"/>,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
    gift: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>,
    sparkles: <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>,
    tag: <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>,
    percent: <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>,
  };

  const colors = {
    fire: { from: 'from-orange-500/20', to: 'to-red-500/20', border: 'border-orange-500/30', text: 'text-orange-500', shadow: 'shadow-orange-500/10' },
    bolt: { from: 'from-yellow-500/20', to: 'to-amber-500/20', border: 'border-yellow-500/30', text: 'text-yellow-500', shadow: 'shadow-yellow-500/10' },
    star: { from: 'from-yellow-500/20', to: 'to-amber-500/20', border: 'border-yellow-500/30', text: 'text-yellow-500', shadow: 'shadow-yellow-500/10' },
    gift: { from: 'from-pink-500/20', to: 'to-rose-500/20', border: 'border-pink-500/30', text: 'text-pink-500', shadow: 'shadow-pink-500/10' },
    sparkles: { from: 'from-purple-500/20', to: 'to-violet-500/20', border: 'border-purple-500/30', text: 'text-purple-500', shadow: 'shadow-purple-500/10' },
    tag: { from: 'from-green-500/20', to: 'to-emerald-500/20', border: 'border-green-500/30', text: 'text-green-500', shadow: 'shadow-green-500/10' },
    percent: { from: 'from-red-500/20', to: 'to-rose-500/20', border: 'border-red-500/30', text: 'text-red-500', shadow: 'shadow-red-500/10' },
    clock: { from: 'from-blue-500/20', to: 'to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-500', shadow: 'shadow-blue-500/10' },
  };

  const color = colors[icon] || colors.fire;
  const iconPath = icons[icon] || icons.fire;
  const isStroke = ['gift', 'sparkles', 'tag', 'percent', 'clock'].includes(icon);

  if (size === 'desktop') {
    return (
      <div className={`hidden md:flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${color.from} ${color.to} border ${color.border} shadow-lg ${color.shadow}`}>
        <svg className={`w-8 h-8 ${color.text}`} fill={isStroke ? 'none' : 'currentColor'} stroke={isStroke ? 'currentColor' : 'none'} strokeWidth={isStroke ? '2' : '0'} viewBox="0 0 24 24">
          {iconPath}
        </svg>
      </div>
    );
  }

  return (
    <div className={`md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${color.from} ${color.to} border ${color.border}`}>
      <svg className={`w-6 h-6 ${color.text}`} fill={isStroke ? 'none' : 'currentColor'} stroke={isStroke ? 'currentColor' : 'none'} strokeWidth={isStroke ? '2' : '0'} viewBox="0 0 24 24">
        {iconPath}
      </svg>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [playerIdModalOpen, setPlayerIdModalOpen] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerValid, setPlayerValid] = useState(null)
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [playerIdError, setPlayerIdError] = useState('')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState('register')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [siteSettings, setSiteSettings] = useState(null)
  const [regions, setRegions] = useState([])
  const [activeInfoTab, setActiveInfoTab] = useState('description')
  const [gameContent, setGameContent] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewStats, setReviewStats] = useState({ avgRating: 5.0, reviewCount: 0 })
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsHasMore, setReviewsHasMore] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [footerSettings, setFooterSettings] = useState(null)
  const [todayDate, setTodayDate] = useState('')
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })

  // Calculate time remaining until midnight (end of day)
  const calculateTimeToMidnight = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(23, 59, 59, 999)
    
    const diff = midnight.getTime() - now.getTime()
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0 }
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return { hours, minutes, seconds }
  }

  useEffect(() => {
    fetchProducts()
    checkAuth()
    fetchSiteSettings()
    fetchRegions()
    fetchGameContent()
    fetchReviews(1)
    fetchFooterSettings()
    handleGoogleAuthCallback() // Handle Google OAuth callback
    handleLoginRedirect() // Handle login redirect from /admin/login
    
    // Set today's date only on client-side to avoid hydration mismatch
    setTodayDate(new Date().toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }))

    // Initialize countdown
    setCountdown(calculateTimeToMidnight())

    // Countdown interval - updates every second
    const countdownInterval = setInterval(() => {
      const newTime = calculateTimeToMidnight()
      setCountdown(newTime)
      
      // Auto-reset date at midnight
      if (newTime.hours === 0 && newTime.minutes === 0 && newTime.seconds === 0) {
        setTimeout(() => {
          setTodayDate(new Date().toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }))
        }, 1000)
      }
    }, 1000)

    // Handle visibility change - recalculate when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setCountdown(calculateTimeToMidnight())
        setTodayDate(new Date().toLocaleDateString('tr-TR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(countdownInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Handle login redirect from /admin/login
  const handleLoginRedirect = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const loginParam = urlParams.get('login')
    
    if (loginParam === 'true') {
      // Open login modal
      setAuthModalOpen(true)
      setAuthModalTab('login')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  // Handle Google OAuth callback - read cookies and save to localStorage
  const handleGoogleAuthCallback = () => {
    // Check URL for google_auth success
    const urlParams = new URLSearchParams(window.location.search)
    const googleAuthStatus = urlParams.get('google_auth')
    const errorParam = urlParams.get('error')
    
    // Handle errors
    if (errorParam) {
      const errorMessages = {
        'oauth_disabled': 'Google ile giriş şu an kullanılamıyor',
        'oauth_not_configured': 'Google OAuth yapılandırılmamış',
        'oauth_config_error': 'OAuth yapılandırma hatası',
        'google_auth_denied': 'Google girişi reddedildi',
        'invalid_callback': 'Geçersiz geri dönüş',
        'invalid_state': 'Güvenlik doğrulaması başarısız',
        'token_exchange_failed': 'Token alınamadı',
        'user_info_failed': 'Kullanıcı bilgisi alınamadı',
        'oauth_callback_error': 'Giriş işlemi başarısız'
      }
      const message = errorMessages[errorParam] || 'Giriş sırasında bir hata oluştu'
      toast.error(message)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    
    // Handle successful Google auth
    if (googleAuthStatus === 'success') {
      // Read token from cookie
      const getCookie = (name) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop().split(';').shift()
        return null
      }
      
      const token = getCookie('googleAuthToken')
      const userDataEncoded = getCookie('googleAuthUser')
      
      if (token && userDataEncoded) {
        try {
          const userData = JSON.parse(decodeURIComponent(userDataEncoded))
          
          // Save to localStorage
          localStorage.setItem('userToken', token)
          localStorage.setItem('userData', JSON.stringify(userData))
          
          // Update state
          setUser(userData)
          
          // Show success message
          toast.success('Google ile giriş başarılı!')
          
          // Clear cookies
          document.cookie = 'googleAuthToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'googleAuthUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        } catch (error) {
          console.error('Error parsing Google auth data:', error)
        }
      }
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
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

  const fetchGameContent = async () => {
    try {
      const response = await fetch('/api/content/pubg')
      const data = await response.json()
      if (data.success) {
        setGameContent(data.data)
      }
    } catch (error) {
      console.error('Error fetching game content:', error)
    }
  }

  const fetchReviews = async (page = 1, append = false) => {
    setLoadingReviews(true)
    try {
      const response = await fetch(`/api/reviews?game=pubg&page=${page}&limit=5`)
      const data = await response.json()
      if (data.success) {
        if (append) {
          setReviews(prev => [...prev, ...data.data.reviews])
        } else {
          setReviews(data.data.reviews)
        }
        setReviewStats(data.data.stats)
        setReviewsHasMore(data.data.pagination.hasMore)
        setReviewsPage(page)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const loadMoreReviews = () => {
    fetchReviews(reviewsPage + 1, true)
  }

  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/regions')
      const data = await response.json()
      if (data.success) {
        setRegions(data.data)
      }
    } catch (error) {
      console.error('Error fetching regions:', error)
    }
  }

  const fetchSiteSettings = async () => {
    try {
      const response = await fetch('/api/site/settings')
      const data = await response.json()
      if (data.success) {
        setSiteSettings(data.data)
        
        // Update document title dynamically
        if (data.data.metaTitle) {
          document.title = data.data.metaTitle
        }
        
        // Update meta description dynamically
        if (data.data.metaDescription) {
          let metaDesc = document.querySelector('meta[name="description"]')
          if (!metaDesc) {
            metaDesc = document.createElement('meta')
            metaDesc.name = 'description'
            document.head.appendChild(metaDesc)
          }
          metaDesc.content = data.data.metaDescription
        }
        
        // Update favicon dynamically
        if (data.data.favicon) {
          const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
          link.type = 'image/x-icon'
          link.rel = 'icon'
          link.href = `${data.data.favicon}?v=${Date.now()}` // Cache busting
          document.getElementsByTagName('head')[0].appendChild(link)
        }
      }
    } catch (error) {
      console.error('Error fetching site settings:', error)
    }
  }

  const checkAuth = () => {
    const token = localStorage.getItem('userToken')
    setIsAuthenticated(!!token)
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Ürünler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setCheckoutOpen(true)
    setPlayerId('')
    setPlayerName('')
    setPlayerValid(null)
  }

  const handleCheckout = async () => {
    // 1. Check player ID first
    if (!playerValid || !playerName) {
      setPlayerIdModalOpen(true)
      setPlayerIdError('')
      return
    }

    // 2. Check authentication
    const token = localStorage.getItem('userToken')
    if (!token) {
      // Open auth modal instead of just showing toast
      setAuthModalTab('login')
      setAuthModalOpen(true)
      toast.error('Sipariş vermek için giriş yapmalısınız')
      return
    }

    // 3. Proceed with order
    setOrderProcessing(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          playerId,
          playerName
        })
      })

      const data = await response.json()
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
        setIsAuthenticated(false)
        setAuthModalTab('login')
        setAuthModalOpen(true)
        toast.error('Oturumunuz sonlandı. Lütfen tekrar giriş yapın')
        return
      }
      
      if (data.success) {
        // Shopier requires form POST submission
        if (data.data.paymentData && data.data.signature) {
          // Create a hidden form and submit it
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = data.data.paymentUrl
          
          // Add data field
          const dataInput = document.createElement('input')
          dataInput.type = 'hidden'
          dataInput.name = 'data'
          dataInput.value = data.data.paymentData
          form.appendChild(dataInput)
          
          // Add signature field
          const signatureInput = document.createElement('input')
          signatureInput.type = 'hidden'
          signatureInput.name = 'signature'
          signatureInput.value = data.data.signature
          form.appendChild(signatureInput)
          
          document.body.appendChild(form)
          form.submit()
        } else {
          // Fallback to direct URL
          window.location.href = data.data.paymentUrl
        }
      } else {
        if (data.code === 'AUTH_REQUIRED') {
          setAuthModalTab('login')
          setAuthModalOpen(true)
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

  const handleAuthSuccess = (authData) => {
    setIsAuthenticated(true)
    toast.success('Giriş başarılı! Şimdi ödemeye devam edebilirsiniz.')
    // User can now click checkout again
  }

  const handlePlayerIdConfirm = async () => {
    if (!playerId || playerId.length < 6) {
      setPlayerIdError('Lütfen geçerli bir Oyuncu ID girin')
      return
    }

    setPlayerLoading(true)
    setPlayerIdError('')
    
    try {
      const response = await fetch(`/api/player/resolve?id=${playerId}`)
      const data = await response.json()
      
      if (data.success) {
        setPlayerName(data.data.playerName)
        setPlayerValid(true)
        setPlayerIdModalOpen(false)
        toast.success('Oyuncu bulundu!')
      } else {
        setPlayerIdError(data.error || 'Oyuncu bulunamadı')
        setPlayerName('')
        setPlayerValid(false)
      }
    } catch (error) {
      console.error('Error resolving player:', error)
      setPlayerIdError('Oyuncu adı alınırken hata oluştu')
      setPlayerName('')
      setPlayerValid(false)
    } finally {
      setPlayerLoading(false)
    }
  }

  // Flag badge component for regions without uploaded flag
  const FlagBadge = ({ code, size = 'sm' }) => {
    const colors = {
      'TR': 'bg-red-600',
      'GLOBAL': 'bg-blue-600',
      'DE': 'bg-yellow-500 text-black',
      'FR': 'bg-blue-500',
      'JP': 'bg-red-500',
    }
    const sizeClasses = size === 'lg' ? 'w-[18px] h-[14px] text-[9px]' : 'w-5 h-4 text-[8px]'
    return (
      <div className={`${sizeClasses} rounded-sm flex items-center justify-center font-bold text-white ${colors[code] || 'bg-gray-600'}`}>
        {code === 'GLOBAL' ? '🌐' : code?.substring(0, 2) || '?'}
      </div>
    )
  }

  // Region display component - shows flag + name from regions data
  const RegionDisplay = ({ regionCode = 'TR', size = 'sm', showWhiteText = false }) => {
    const region = regions.find(r => r.code === regionCode) || { code: regionCode, name: regionCode === 'TR' ? 'Türkiye' : regionCode, flagImageUrl: null }
    const flagSize = size === 'lg' ? 'w-[18px] h-[14px]' : 'w-4 h-3'
    const textColor = showWhiteText ? 'text-white' : ''
    
    return (
      <div className="flex items-center gap-1.5">
        {region.flagImageUrl ? (
          <img 
            src={`${region.flagImageUrl}?v=${Date.now()}`}
            alt={region.name}
            className={`${flagSize} object-cover rounded-sm`}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
            }}
          />
        ) : null}
        {!region.flagImageUrl && <FlagBadge code={region.code} size={size} />}
        <span className={textColor}>{region.name?.toUpperCase()}</span>
      </div>
    )
  }

  const FilterSidebar = () => (
    <div className="w-full rounded-lg bg-[#1e2229] p-5">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
        </svg>
        <span className="text-white font-bold text-base uppercase">Filtrele</span>
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="text-white text-sm font-bold mb-3">Bölge</h3>
          <div className="mb-2">
            <input 
              type="text" 
              placeholder="Ara"
              className="w-full px-3 py-1.5 text-sm bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            {regions.length > 0 ? (
              regions.map((region, index) => (
                <label key={region.id || index} className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-white/80">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded" defaultChecked={index === 0} />
                  {region.flagImageUrl ? (
                    <img 
                      src={`${region.flagImageUrl}?v=${Date.now()}`}
                      alt={region.name}
                      className="w-5 h-4 object-cover rounded-sm"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  {!region.flagImageUrl && <FlagBadge code={region.code} />}
                  <span>{region.name}</span>
                </label>
              ))
            ) : (
              // Fallback if regions not loaded yet
              <>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-white/80">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded" defaultChecked />
                  <FlagBadge code="TR" />
                  <span>Türkiye</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-white/80">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded" />
                  <FlagBadge code="GLOBAL" />
                  <span>Küresel</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-white/80">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded" />
                  <FlagBadge code="DE" />
                  <span>Almanya</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-white/80">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded" />
                  <FlagBadge code="FR" />
                  <span>Fransa</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-white/80">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded" />
                  <FlagBadge code="JP" />
                  <span>Japonya</span>
                </label>
              </>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <h3 className="text-white text-sm font-bold mb-3">Fiyat Aralığı</h3>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="En Az"
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
            />
            <input 
              type="number" 
              placeholder="En Çok"
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-white/10">
          <h3 className="text-white text-sm font-bold mb-3">Kelime ile Filtrele</h3>
          <input 
            type="text" 
            placeholder="Kelime"
            className="w-full px-3 py-1.5 text-sm bg-black/30 border border-white/10 rounded text-white placeholder:text-white/40"
          />
        </div>

        <Button className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-full">
          Filtreleri Uygula
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Toaster position="top-center" richColors />
      
      <header className="h-[60px] bg-[#1a1a1a] border-b border-white/5">
        <div className="h-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            {siteSettings?.logo ? (
              <img 
                src={`${siteSettings.logo}?v=${Date.now()}`} 
                alt={siteSettings?.siteName || 'Logo'} 
                className="h-8 md:h-9 object-contain"
              />
            ) : (
              <>
                <div className="w-8 h-8 md:w-9 md:h-9 rounded bg-blue-600 flex items-center justify-center font-black text-xs md:text-sm text-white">
                  UC
                </div>
                <span className="text-white font-semibold text-base md:text-lg">
                  {siteSettings?.siteName || 'PUBG UC'}
                </span>
              </>
            )}
          </div>
            
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
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Auth Buttons / User Menu */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setAuthModalTab('login');
                    setAuthModalOpen(true);
                  }}
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
                >
                  Giriş Yap
                </Button>
                <Button
                  onClick={() => {
                    setAuthModalTab('register');
                    setAuthModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Kayıt Ol
                </Button>
              </div>
            ) : (
              <div className="relative group">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline">Hesabım</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-[#1e2229] rounded-xl shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => window.location.href = '/account'}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      Hesabım
                    </button>
                    <button
                      onClick={() => window.location.href = '/account/profile'}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profil Bilgileri
                    </button>
                    <button
                      onClick={() => window.location.href = '/account/orders'}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Siparişlerim
                    </button>
                    <button
                      onClick={() => window.location.href = '/account/security'}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Güvenlik
                    </button>
                    <button
                      onClick={() => window.location.href = '/account/support'}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Destek Taleplerim
                    </button>
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <button
                      onClick={() => {
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('userData');
                        setIsAuthenticated(false);
                        toast.success('Çıkış yapıldı');
                        window.location.reload();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-600/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative h-[200px] md:h-[300px] flex items-start overflow-hidden bg-[#1a1a1a]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: siteSettings?.heroImage 
              ? `url(${siteSettings.heroImage}?v=${Date.now()})`
              : 'url(https://customer-assets.emergentagent.com/job_8b265523-4875-46c8-ab48-988eea2d3777/artifacts/prqvfd8b_wp5153882-pubg-fighting-wallpapers.jpg)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-[#1a1a1a]" />
        
        <div className="relative z-10 max-w-[1920px] w-full mx-auto px-4 md:px-6 pt-6 md:pt-10">
          <div className="flex items-center gap-3 md:gap-4">
            {siteSettings?.categoryIcon ? (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={`${siteSettings.categoryIcon}?v=${Date.now()}`}
                  alt="Category"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <span className="font-black text-xl md:text-3xl text-white">P</span>
              </div>
            )}
            <div>
              <div className="text-xs md:text-sm text-white/60 mb-0.5 md:mb-1">Anasayfa &gt; Oyunlar</div>
              <h1 className="text-xl md:text-[28px] font-bold text-white">PUBG Mobile</h1>
              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                <span className="text-yellow-400 text-xs md:text-sm">★★★★★ 5/5</span>
                <span className="text-white/70 text-xs md:text-sm">(2008) yorum</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Banner - "Bugüne Özel Fiyatlar" with Countdown */}
      {siteSettings?.dailyBannerEnabled !== false && (
        <div 
          className="relative overflow-hidden mx-4 md:mx-6 mt-4 rounded-2xl animate-fadeInUp"
          role="banner"
          aria-label="Günlük kampanya banner"
          style={{ minHeight: '80px' }}
        >
          {/* Background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f35] via-[#252d4a] to-[#1a1f35]" />
          
          {/* Glow effects */}
          <div className="absolute top-0 left-1/4 w-64 h-32 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-purple-500/15 rounded-full blur-3xl" />
          
          {/* Countdown glow effect - intensifies in last 10 minutes */}
          {siteSettings?.dailyCountdownEnabled !== false && countdown.hours === 0 && countdown.minutes < 10 && (
            <div className="absolute top-1/2 right-1/4 w-48 h-24 bg-orange-500/30 rounded-full blur-3xl animate-pulse" />
          )}
          
          {/* Border glow */}
          <div className="absolute inset-0 rounded-2xl border border-white/10" />
          
          {/* Content */}
          <div className="relative z-10 px-5 md:px-8 py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-4">
            {/* Left side - Text */}
            <div className="flex items-center gap-4 text-center md:text-left">
              {/* Dynamic Icon - Desktop */}
              <BannerIcon icon={siteSettings?.dailyBannerIcon || 'fire'} size="desktop" />
              
              {/* Dynamic Icon - Mobile */}
              <BannerIcon icon={siteSettings?.dailyBannerIcon || 'fire'} size="mobile" />
              
              <div>
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-tight">
                  {siteSettings?.dailyBannerTitle || 'Bugüne Özel Fiyatlar'}
                </h2>
                <p className="text-sm md:text-base text-white/60 mt-0.5">
                  {siteSettings?.dailyBannerSubtitle || todayDate || ''}
                </p>
              </div>
            </div>
            
            {/* Right side - Countdown + Badge */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
              {/* Countdown Timer */}
              {siteSettings?.dailyCountdownEnabled !== false && (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] md:text-xs text-white/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {siteSettings?.dailyCountdownLabel || 'Kampanya bitimine'}
                  </span>
                  <div 
                    className={`flex items-center gap-1 md:gap-1.5 font-mono text-lg md:text-xl lg:text-2xl font-bold tracking-wider transition-colors duration-500 ${
                      countdown.hours === 0 && countdown.minutes < 10
                        ? countdown.minutes < 5
                          ? 'text-red-400'
                          : 'text-orange-400'
                        : 'text-cyan-400'
                    }`}
                    style={{
                      textShadow: countdown.hours === 0 && countdown.minutes < 10
                        ? countdown.minutes < 5
                          ? '0 0 20px rgba(248, 113, 113, 0.6), 0 0 40px rgba(248, 113, 113, 0.3)'
                          : '0 0 20px rgba(251, 146, 60, 0.6), 0 0 40px rgba(251, 146, 60, 0.3)'
                        : '0 0 20px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.2)'
                    }}
                  >
                    {/* Hours */}
                    <div className="relative">
                      <div className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-black/40 border ${
                        countdown.hours === 0 && countdown.minutes < 10
                          ? countdown.minutes < 5
                            ? 'border-red-500/40'
                            : 'border-orange-500/40'
                          : 'border-cyan-500/30'
                      }`}>
                        <span className={`transition-all duration-200 ${countdown.seconds % 2 === 0 ? 'opacity-100' : 'opacity-95'}`}>
                          {String(countdown.hours).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Separator */}
                    <span className={`animate-pulse ${
                      countdown.hours === 0 && countdown.minutes < 10
                        ? countdown.minutes < 5
                          ? 'text-red-400'
                          : 'text-orange-400'
                        : 'text-cyan-400/80'
                    }`}>:</span>
                    
                    {/* Minutes */}
                    <div className="relative">
                      <div className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-black/40 border ${
                        countdown.hours === 0 && countdown.minutes < 10
                          ? countdown.minutes < 5
                            ? 'border-red-500/40'
                            : 'border-orange-500/40'
                          : 'border-cyan-500/30'
                      }`}>
                        <span className={`transition-all duration-200 ${countdown.seconds % 2 === 0 ? 'opacity-100' : 'opacity-95'}`}>
                          {String(countdown.minutes).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Separator */}
                    <span className={`animate-pulse ${
                      countdown.hours === 0 && countdown.minutes < 10
                        ? countdown.minutes < 5
                          ? 'text-red-400'
                          : 'text-orange-400'
                        : 'text-cyan-400/80'
                    }`}>:</span>
                    
                    {/* Seconds */}
                    <div className="relative">
                      <div className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-black/40 border ${
                        countdown.hours === 0 && countdown.minutes < 10
                          ? countdown.minutes < 5
                            ? 'border-red-500/40'
                            : 'border-orange-500/40'
                          : 'border-cyan-500/30'
                      }`}>
                        <span 
                          className="inline-block transition-transform duration-100"
                          style={{
                            transform: `scale(${countdown.seconds % 2 === 0 ? 1 : 0.98})`
                          }}
                        >
                          {String(countdown.seconds).padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Divider - only on desktop when countdown is visible */}
              {siteSettings?.dailyCountdownEnabled !== false && (
                <div className="hidden md:block w-px h-10 bg-white/10" />
              )}
              
              {/* Badge */}
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                <span className="text-xs md:text-sm font-semibold text-yellow-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Günlük Kampanya
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex gap-4 md:gap-5">
          <div className="hidden lg:block w-[240px] xl:w-[265px] flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar />
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl flex flex-col border border-white/10 hover:border-white/20 w-full aspect-[2/2.8] md:aspect-[2/3]"
                    style={{ backgroundColor: '#252a34', maxWidth: '270px', margin: '0 auto' }}
                  >
                    {/* Info Icon */}
                    <div className="absolute top-3 right-3 w-7 h-7 md:w-5 md:h-5 rounded-full bg-white/90 flex items-center justify-center z-20">
                      <span className="text-gray-700 font-bold text-sm md:text-xs">i</span>
                    </div>

                    {/* Image Section - 55% height */}
                    <div className="relative h-[55%] bg-gradient-to-b from-[#2d3444] to-[#252a34] flex items-center justify-center" style={{ padding: '14px' }}>
                      <img 
                        src={product.imageUrl || "https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=300&h=300&fit=crop"}
                        alt={product.title}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=300&h=300&fit=crop";
                        }}
                      />
                    </div>

                    {/* Content Section - 45% */}
                    <div className="h-[45%] flex flex-col justify-between" style={{ padding: '14px' }}>
                      <div>
                        <div className="text-[13px] md:text-[10px] text-white/60 font-bold uppercase">MOBİLE</div>
                        <div className="text-[18px] md:text-[13px] font-bold text-white">{product.ucAmount} UC</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <RegionDisplay regionCode={product.regionCode || 'TR'} size="sm" showWhiteText={true} />
                        </div>
                        <div className="text-[12px] md:text-[9px] text-emerald-400">Bölgenizde kullanılabilir</div>
                      </div>
                      <div>
                        {product.discountPrice < product.price && (
                          <div className="text-[13px] md:text-[9px] text-red-500 line-through">₺{product.price.toFixed(2).replace('.', ',')}</div>
                        )}
                        <div className="text-[22px] md:text-[15px] font-bold text-white">₺ {product.discountPrice.toFixed(2).replace('.', ',')}</div>
                        {product.discountPercent > 0 && (
                          <div className="text-[13px] md:text-[11px] text-emerald-400 font-medium">{product.discountPercent.toFixed(1).replace('.', ',')}% ▼ indirim</div>
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

      {/* Plyr Style Tab Section - Description & Reviews */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-[#1e2229] rounded-xl overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveInfoTab('description')}
              className={`px-6 py-4 text-sm font-semibold transition-colors relative ${
                activeInfoTab === 'description'
                  ? 'text-white bg-[#282d36]'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              Açıklama
              {activeInfoTab === 'description' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveInfoTab('reviews')}
              className={`px-6 py-4 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
                activeInfoTab === 'reviews'
                  ? 'text-white bg-[#282d36]'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <span>Değerlendirmeler</span>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-xs">{reviewStats.avgRating.toFixed(1)} / 5</span>
              </div>
              {activeInfoTab === 'reviews' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Description Tab */}
            {activeInfoTab === 'description' && (
              <div>
                <div 
                  className={`prose prose-invert max-w-none overflow-hidden transition-all duration-300 ${
                    descriptionExpanded ? '' : 'max-h-[300px]'
                  }`}
                >
                  {gameContent?.description ? (
                    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                      {gameContent.description.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) {
                          return <h1 key={i} className="text-2xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-xl font-semibold text-white mt-4 mb-2">{line.slice(3)}</h2>
                        }
                        if (line.startsWith('- ')) {
                          return <li key={i} className="ml-4 text-white/70">{line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('<strong>').map((part, j) => 
                            part.includes('</strong>') 
                              ? <><strong key={j} className="text-white">{part.split('</strong>')[0]}</strong>{part.split('</strong>')[1]}</>
                              : part
                          )}</li>
                        }
                        if (line.startsWith('✓ ')) {
                          return <div key={i} className="flex items-start gap-2 text-green-400"><Check className="w-4 h-4 mt-0.5 flex-shrink-0" /><span className="text-white/70">{line.slice(2).replace(/\*\*(.*?)\*\*/g, (_, text) => text)}</span></div>
                        }
                        if (line === '---') {
                          return <hr key={i} className="border-white/10 my-4" />
                        }
                        if (line.startsWith('*') && line.endsWith('*')) {
                          return <p key={i} className="text-white/50 italic text-xs mt-2">{line.slice(1, -1)}</p>
                        }
                        if (line.trim() === '') {
                          return <br key={i} />
                        }
                        return <p key={i} className="text-white/70 mb-2">{line}</p>
                      })}
                    </div>
                  ) : (
                    <p className="text-white/60">İçerik yükleniyor...</p>
                  )}
                </div>
                
                {/* Expand/Collapse Button */}
                {gameContent?.description && gameContent.description.length > 500 && (
                  <button
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    {descriptionExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Daha az göster
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Devamını Gör
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeInfoTab === 'reviews' && (
              <div>
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
                  {reviews.length > 0 ? (
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
            )}
          </div>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
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
                <div className="p-5 md:p-8 space-y-6 md:space-y-8 border-b md:border-b-0 md:border-r border-white/5">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm md:text-base text-white/80 uppercase">Oyuncu ID</Label>
                      {!playerValid && (
                        <button 
                          onClick={() => setPlayerIdModalOpen(true)}
                          className="text-xs md:text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          Oyuncu ID Girin
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {playerValid && playerName ? (
                      <div className="px-4 py-3.5 rounded bg-green-500/15 border border-green-500/30 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-green-400 mb-1 text-xs font-semibold">
                            <Check className="w-4 h-4" />
                            <span>Oyuncu Bulundu</span>
                          </div>
                          <p className="text-white text-base font-bold">{playerName}</p>
                          <p className="text-white/50 text-xs mt-0.5">ID: {playerId}</p>
                        </div>
                        <button
                          onClick={() => {
                            setPlayerValid(null)
                            setPlayerName('')
                            setPlayerId('')
                          }}
                          className="text-white/60 hover:text-white text-xs"
                        >
                          Değiştir
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setPlayerIdModalOpen(true)}
                        className="px-4 py-3 rounded bg-[#12161D] border border-white/10 text-white/40 cursor-pointer hover:border-white/20 transition-colors"
                      >
                        <span className="text-sm">Oyuncu ID'nizi girin</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Ödeme yöntemleri</Label>
                    
                    <div className="relative p-4 md:p-5 rounded-lg bg-[#12161D] border border-white/10">
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-base md:text-lg font-bold text-white mb-1">Kredi / Banka Kartı</div>
                        <div className="inline-block px-2 py-0.5 rounded bg-white/10 text-[11px] text-white/70">
                          Anında teslimat
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-white rounded text-blue-600 font-bold text-xs">VISA</div>
                        <div className="px-2 py-1 bg-white rounded text-red-600 font-bold text-xs">MC</div>
                        <div className="px-2 py-1 bg-white rounded text-blue-500 font-bold text-xs">TROY</div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedProduct && (
                  <div className="p-5 md:p-8 space-y-6 md:space-y-8 bg-[#1a1e24]/95">
                    <div>
                      <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Ürün</Label>
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center bg-[#12161D] overflow-hidden p-2">
                          <img 
                            src={selectedProduct.imageUrl || "https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=100&h=100&fit=crop"}
                            alt={selectedProduct.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=100&h=100&fit=crop";
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-xl md:text-2xl font-bold text-white mb-2">{selectedProduct.title}</div>
                          <div className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-white mb-1">
                            <RegionDisplay regionCode={selectedProduct.regionCode || 'TR'} size="lg" />
                          </div>
                          <div className="text-[11px] md:text-xs text-green-400">Bölgenizde kullanılabilir</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Fiyat detayları</Label>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm md:text-base">
                          <span className="text-white/70">Orjinal Fiyat</span>
                          <span className="text-white font-bold">₺ {selectedProduct.price.toFixed(2)}</span>
                        </div>
                        {selectedProduct.discountPrice < selectedProduct.price && (
                          <div className="flex justify-between items-center text-sm md:text-base">
                            <span className="text-green-400 font-semibold">Size Özel Fiyat</span>
                            <span className="text-green-400 font-bold">₺ {selectedProduct.discountPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-white/10">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm md:text-base text-white/70 uppercase">Ödenecek Tutar</span>
                        <span className="text-2xl md:text-3xl font-black text-white">
                          ₺ {selectedProduct.discountPrice.toFixed(2)}
                        </span>
                      </div>

                      <Button
                        onClick={handleCheckout}
                        disabled={orderProcessing}
                        className="w-full h-12 md:h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base md:text-lg uppercase tracking-wide rounded-lg"
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={playerIdModalOpen} onOpenChange={setPlayerIdModalOpen}>
        <DialogContent 
          className="max-w-[90vw] md:max-w-md p-0 gap-0 border-0 rounded-lg overflow-hidden" 
          style={{ 
            backgroundColor: 'transparent',
            backgroundImage: 'none'
          }}
        >
          {/* PUBG Wallpaper - As first child with absolute positioning */}
          <div className="absolute top-0 left-0 right-0 bottom-0 z-0">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: 'url(https://customer-assets.emergentagent.com/job_8b265523-4875-46c8-ab48-988eea2d3777/artifacts/prqvfd8b_wp5153882-pubg-fighting-wallpapers.jpg)',
                filter: 'blur(6px)'
              }}
            />
            <div className="absolute inset-0 bg-black/35" />
          </div>
          
          {/* Content - relative z-10 to stay above background */}
          <div className="relative z-10 bg-[#1e2229]/90 backdrop-blur-sm rounded-lg">
            {playerIdError && (
              <div className="px-5 py-3 bg-red-600 flex items-start gap-3 rounded-t-lg">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 font-bold text-sm">!</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">Hata</div>
                  <div className="text-sm text-white">{playerIdError}</div>
                </div>
              </div>
            )}

            <div className="px-6 py-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Oyuncu ID</h2>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <Label className="text-sm text-white/70 mb-2 block">Oyuncu ID'nizi girin</Label>
                <Input
                  placeholder="Oyuncu ID"
                  value={playerId}
                  onChange={(e) => {
                    setPlayerId(e.target.value)
                    setPlayerIdError('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePlayerIdConfirm()
                    }
                  }}
                  className="h-12 px-4 text-sm bg-[#12161D] text-white placeholder:text-white/40 border border-white/10 focus:border-blue-500 rounded"
                  autoFocus
                />
              </div>

              <Button
                onClick={handlePlayerIdConfirm}
                disabled={playerLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base uppercase tracking-wide rounded-lg"
              >
                {playerLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Doğrulanıyor...
                  </>
                ) : (
                  'Onayla'
                )}
              </Button>
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
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">UC</span>
                  </div>
                )}
                {!siteSettings?.logo && (
                  <span className="text-xl font-bold text-white">{siteSettings?.siteName || 'PUBG UC Store'}</span>
                )}
              </div>
              
              <p className="text-white/50 text-sm">
                Güvenli ve hızlı UC satın alma platformu
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
                {(footerSettings?.categories || [{ label: 'PUBG Mobile', url: '/' }]).map((cat, index) => (
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
                © 2025 {siteSettings?.siteName || 'PUBG UC Store'}. Tüm hakları saklıdır.
              </p>
              <p className="text-white/20 text-xs text-center md:text-right">
                Bu site PUBG Mobile veya Tencent Games ile resmi bir bağlantısı yoktur.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        defaultTab={authModalTab}
      />
    </div>
  )
}
