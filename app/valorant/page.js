'use client'

import { useState, useEffect } from 'react'
import { User, Check, X, Loader2, Info, Menu, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

export default function ValorantPage() {
  // 🎮 VALORANT PAGE CONFIGURATION
  const GAME_TYPE = 'valorant'
  const GAME_NAME = 'Valorant'
  const CURRENCY_NAME = 'VP'
  const THEME_COLOR = 'red' // Valorant kırmızı teması
  
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
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState('register')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [siteSettings, setSiteSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('siteSettingsCache')
        return cached ? JSON.parse(cached) : null
      } catch { return null }
    }
    return null
  })
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
  const [userBalance, setUserBalance] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('card') // 'card' or 'balance'

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

  // 🚀 TÜM VERİLERİ TEK SEFERDE ÇEK - Performans Optimizasyonu
  const fetchHomepageData = async () => {
    try {
      // İlk olarak localStorage'dan önbellek oku (flash sorununu önlemek için)
      const cachedSettings = localStorage.getItem('siteSettingsCache')
      if (cachedSettings) {
        try {
          const cached = JSON.parse(cachedSettings)
          setSiteSettings(cached)
          applySettings(cached)
        } catch (e) {
          localStorage.removeItem('siteSettingsCache')
        }
      }
      
      // TEK API ÇAĞRISI - Tüm veriler
      const response = await fetch('/api/homepage?game=valorant')
      const data = await response.json()
      
      if (data.success) {
        const { products, siteSettings, footerSettings, seoSettings, regions, gameContent, reviews } = data.data
        
        // State'leri güncelle
        setProducts(products || [])
        setSiteSettings(siteSettings)
        setRegions(regions || [])
        setGameContent(gameContent)
        setFooterSettings(footerSettings)
        
        // Reviews
        if (reviews) {
          setReviews(reviews.items || [])
          setReviewStats(reviews.stats || { avgRating: 5.0, reviewCount: 0 })
          // Set hasMore if total reviews > displayed reviews
          const totalReviews = reviews.stats?.reviewCount || 0
          const displayedReviews = reviews.items?.length || 0
          setReviewsHasMore(totalReviews > displayedReviews)
        }
        
        // Site ayarlarını DOM'a uygula
        if (siteSettings) {
          applySettings(siteSettings)
          localStorage.setItem('siteSettingsCache', JSON.stringify(siteSettings))
        }
        
        // SEO: GA4 ve GSC
        if (seoSettings) {
          if (seoSettings.ga4MeasurementId) {
            injectGA4Script(seoSettings.ga4MeasurementId)
          }
          if (seoSettings.gscVerificationCode) {
            injectGSCMetaTag(seoSettings.gscVerificationCode)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching homepage data:', error)
      // Fallback: Ayrı ayrı çağır (network hatası durumunda)
      fetchProducts()
      fetchSiteSettings()
      fetchRegions()
      fetchGameContent()
      fetchReviews(1)
      fetchFooterSettings()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 🚀 TEK ÇAĞRI - Tüm homepage verileri
    fetchHomepageData()
    
    // Kullanıcı auth kontrolü (ayrı kalmalı - token gerektiriyor)
    checkAuth()
    
    // OAuth callback ve redirect işlemleri
    handleGoogleAuthCallback()
    handleLoginRedirect()
    
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

  // Handle product parameter from URL for Google Ads site links
  useEffect(() => {
    if (products.length === 0) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product');
    
    if (productParam) {
      // Find product by slug (e.g., "375vp", "825vp", "1700vp")
      const slug = productParam.toLowerCase().replace('-', '');
      
      // Try to match by VP amount in title
      const vpAmount = parseInt(slug.replace('vp', '').replace('uc', ''));
      
      let matchedProduct = null;
      
      if (!isNaN(vpAmount)) {
        // Find product that contains the VP amount in title or vpAmount field
        matchedProduct = products.find(p => {
          // Check vpAmount field first
          if (p.vpAmount && parseInt(p.vpAmount) === vpAmount) {
            return true;
          }
          // Check title
          const title = p.title.toLowerCase();
          const matches = title.match(/(\d+)\s*vp/i);
          if (matches) {
            return parseInt(matches[1]) === vpAmount;
          }
          return false;
        });
      }
      
      // Also try to match by product ID
      if (!matchedProduct) {
        matchedProduct = products.find(p => p.id === productParam);
      }
      
      if (matchedProduct) {
        // Open checkout modal for this product
        setSelectedProduct(matchedProduct);
        setCheckoutOpen(true);
        
        // Clean URL (remove product parameter)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [products]);

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
          // First decode URI component, then decode base64
          const decodedBase64 = decodeURIComponent(userDataEncoded)
          const userData = JSON.parse(atob(decodedBase64))
          
          // Save to localStorage
          localStorage.setItem('userToken', token)
          localStorage.setItem('userData', JSON.stringify(userData))
          
          // Update state
          setUser(userData)
          setIsAuthenticated(true)
          
          // Show success message
          toast.success('Google ile giriş başarılı!')
          
          // Check if phone is missing - open phone modal
          if (!userData.phone) {
            setPhoneModalOpen(true)
          }
          
          // Clear cookies
          document.cookie = 'googleAuthToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'googleAuthUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        } catch (error) {
          console.error('Error parsing Google auth data:', error)
          toast.error('Giriş işlemi tamamlanamadı')
        }
      } else {
        console.log('Google auth cookies not found:', { token: !!token, userDataEncoded: !!userDataEncoded })
      }
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  // Save phone number for Google users
  const handleSavePhone = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Geçerli bir telefon numarası girin')
      return
    }
    
    setPhoneLoading(true)
    try {
      const token = localStorage.getItem('userToken')
      const response = await fetch('/api/user/update-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: phoneNumber })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update local storage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        userData.phone = phoneNumber
        localStorage.setItem('userData', JSON.stringify(userData))
        
        // Update state
        setUser(userData)
        setPhoneModalOpen(false)
        setPhoneNumber('')
        toast.success('Telefon numarası kaydedildi!')
      } else {
        toast.error(data.error || 'Kayıt başarısız')
      }
    } catch (error) {
      console.error('Error saving phone:', error)
      toast.error('Bağlantı hatası')
    } finally {
      setPhoneLoading(false)
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

  // Load SEO settings and inject GA4 script
  const loadSEOSettings = async () => {
    try {
      const response = await fetch('/api/seo/settings')
      const data = await response.json()
      
      if (data.success && data.data) {
        // Inject GA4 if measurement ID exists
        if (data.data.ga4MeasurementId) {
          injectGA4Script(data.data.ga4MeasurementId)
        }
        
        // Inject GSC verification meta tag
        if (data.data.gscVerificationCode) {
          injectGSCMetaTag(data.data.gscVerificationCode)
        }
      }
    } catch (error) {
      console.error('Error loading SEO settings:', error)
    }
  }

  // Inject Google Analytics 4 script
  const injectGA4Script = (measurementId) => {
    if (document.querySelector(`script[src*="${measurementId}"]`)) return // Already loaded
    
    // Load gtag.js
    const gtagScript = document.createElement('script')
    gtagScript.async = true
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(gtagScript)

    // Initialize gtag
    const initScript = document.createElement('script')
    initScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_title: document.title,
        page_location: window.location.href
      });
    `
    document.head.appendChild(initScript)

    // Make gtag globally available for events
    window.gtag = window.gtag || function(){(window.dataLayer = window.dataLayer || []).push(arguments)}
  }

  // Inject Google Search Console verification meta tag
  const injectGSCMetaTag = (verificationCode) => {
    if (document.querySelector('meta[name="google-site-verification"]')) return // Already exists
    
    const meta = document.createElement('meta')
    meta.name = 'google-site-verification'
    meta.content = verificationCode
    document.head.appendChild(meta)
  }

  // GA4 Event tracking helper
  const trackEvent = (eventName, eventParams = {}) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams)
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
        // Calculate hasMore from pagination (page < pages)
        const pagination = data.data.pagination
        setReviewsHasMore(pagination.page < pagination.pages)
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
      // İlk olarak localStorage'dan önbellek oku (flash sorununu önlemek için)
      const cachedSettings = localStorage.getItem('siteSettingsCache')
      if (cachedSettings) {
        try {
          const cached = JSON.parse(cachedSettings)
          setSiteSettings(cached)
          applySettings(cached)
        } catch (e) {
          // Önbellek bozuksa sil
          localStorage.removeItem('siteSettingsCache')
        }
      }
      
      // API'den güncel ayarları al
      const response = await fetch('/api/site/settings')
      const data = await response.json()
      if (data.success) {
        setSiteSettings(data.data)
        applySettings(data.data)
        
        // Önbelleğe kaydet
        localStorage.setItem('siteSettingsCache', JSON.stringify(data.data))
      }
    } catch (error) {
      console.error('Error fetching site settings:', error)
    }
  }
  
  // Site ayarlarını DOM'a uygula (title, meta, favicon)
  const applySettings = (settings) => {
    // Update document title dynamically
    if (settings.metaTitle) {
      document.title = settings.metaTitle
    }
    
    // Update meta description dynamically
    if (settings.metaDescription) {
      let metaDesc = document.querySelector('meta[name="description"]')
      if (!metaDesc) {
        metaDesc = document.createElement('meta')
        metaDesc.name = 'description'
        document.head.appendChild(metaDesc)
      }
      metaDesc.content = settings.metaDescription
    }
    
    // Update favicon dynamically
    if (settings.favicon) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'icon'
      link.href = settings.favicon // Cache busting removed - caused flickering
      document.getElementsByTagName('head')[0].appendChild(link)
    }
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('userToken')
    const userData = localStorage.getItem('userData')
    
    setIsAuthenticated(!!token)
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
        
        // Fetch user balance
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
    setTermsAccepted(true) // Terms pre-accepted for new product
    
    // Update URL with product parameter for Google Ads tracking (VP için)
    const vpAmount = product.title.match(/(\d+)\s*VP/i) || product.vpAmount;
    if (vpAmount) {
      const amount = typeof vpAmount === 'object' ? vpAmount[1] : (product.vpAmount || product.ucAmount);
      const productSlug = amount + 'vp';
      window.history.pushState({}, '', `?product=${productSlug}`);
    }
    
    // Auto-select payment method based on balance
    if (isAuthenticated && userBalance >= product.discountPrice) {
      setPaymentMethod('balance') // Sufficient balance - default to balance
    } else {
      setPaymentMethod('card') // Insufficient or no balance - default to card
    }
    
    // GA4 view_item event
    trackEvent('view_item', {
      currency: 'TRY',
      value: product.discountPrice,
      items: [{
        item_id: product.id,
        item_name: product.title,
        price: product.discountPrice,
        quantity: 1
      }]
    })
  }

  const handleCheckout = async () => {
    // Valorant için Oyuncu ID kontrolü yok - direkt kod teslimi

    // 1. Check authentication
    const token = localStorage.getItem('userToken')
    if (!token) {
      // Open auth modal instead of just showing toast
      setAuthModalTab('login')
      setAuthModalOpen(true)
      toast.error('Sipariş vermek için giriş yapmalısınız')
      return
    }

    // 2. Check balance if payment method is balance
    if (paymentMethod === 'balance') {
      if (userBalance < selectedProduct.discountPrice) {
        toast.error(`Yetersiz bakiye. Eksik: ${(selectedProduct.discountPrice - userBalance).toFixed(2)} ₺`)
        return
      }
    }

    // GA4 begin_checkout event
    trackEvent('begin_checkout', {
      currency: 'TRY',
      value: selectedProduct.discountPrice,
      items: [{
        item_id: selectedProduct.id,
        item_name: selectedProduct.title,
        price: selectedProduct.discountPrice,
        quantity: 1
      }]
    })

    // 4. Proceed with order
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
          playerId: 'valorant-direct', // Valorant için oyuncu ID gerekmiyor
          playerName: 'Valorant VP',
          paymentMethod: paymentMethod, // 'card' or 'balance'
          game: GAME_TYPE, // 'valorant'
          termsAccepted: termsAccepted,
          termsAcceptedAt: new Date().toISOString()
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
        // Balance payment - direct success
        if (paymentMethod === 'balance') {
          toast.success('Sipariş başarıyla oluşturuldu! Kodlarınız hesabınıza yükleniyor...')
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
          // Redirect to order page after 2 seconds
          setTimeout(() => {
            window.location.href = `/account/orders/${data.data.orderId}`
          }, 2000)
          return
        }

        // Card payment - Shopier redirect
        if (data.data.formData && data.data.paymentUrl) {
          // Create a hidden form and submit it with all Shopier fields
          const form = document.createElement('form')
          form.method = 'POST'
          form.action = data.data.paymentUrl
          
          // Add all form fields from backend response
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
          toast.error('Ödeme sayfası oluşturulamadı')
        }
      } else {
        toast.error(data.error || 'Sipariş oluşturulamadı')
      }
    } catch (error) {
      console.error('Order error:', error)
      toast.error('Sipariş işlemi sırasında bir hata oluştu')
    } finally {
      setOrderProcessing(false)
    }
  }

  const handlePlayerIdConfirm = async () => {
    if (!playerId || playerId.length < 6) {
      setPlayerIdError('Oyuncu ID en az 6 karakter olmalıdır')
      return
    }
    
    setPlayerLoading(true)
    setPlayerIdError('')
    
    try {
      const response = await fetch(`/api/player/resolve?playerId=${encodeURIComponent(playerId)}`)
      const data = await response.json()
      
      if (data.success) {
        setPlayerName(data.data.playerName)
        setPlayerValid(true)
        setPlayerIdModalOpen(false)
        toast.success(`Oyuncu bulundu: ${data.data.playerName}`)
      } else {
        setPlayerIdError(data.error || 'Oyuncu bulunamadı')
        setPlayerValid(false)
      }
    } catch (error) {
      setPlayerIdError('Bağlantı hatası. Lütfen tekrar deneyin.')
      setPlayerValid(false)
    } finally {
      setPlayerLoading(false)
    }
  }

  const handleAuthSuccess = (userData, token) => {
    setIsAuthenticated(true)
    setUser(userData)
    setAuthModalOpen(false)
    toast.success('Giriş başarılı!')
    
    // Fetch user balance
    fetch('/api/account/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserBalance(data.data.balance || 0)
        }
      })
  }

  const handleLogout = () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userData')
    setIsAuthenticated(false)
    setUser(null)
    setUserBalance(0)
    toast.success('Çıkış yapıldı')
    window.location.reload()
  }

  // Region display component
  const RegionDisplay = ({ regionCode, size = 'sm', showWhiteText = false }) => {
    const region = regions.find(r => r.code === regionCode) || { code: regionCode, name: regionCode, flag: '🌍', flagImageUrl: null }
    
    const sizeClasses = {
      sm: 'text-[9px] md:text-[10px]',
      md: 'text-[10px] md:text-xs',
      lg: 'text-xs md:text-sm'
    }

    const imgSizeClasses = {
      sm: 'w-4 h-3',
      md: 'w-5 h-4',
      lg: 'w-6 h-4'
    }
    
    return (
      <span className={`flex items-center gap-1 ${sizeClasses[size]} ${showWhiteText ? 'text-white' : 'text-white/70'} font-medium`}>
        {region.flagImageUrl ? (
          <img src={region.flagImageUrl} alt={region.name} className={`${imgSizeClasses[size]} object-cover rounded-sm`} />
        ) : (
          <span>{region.flag || '🌍'}</span>
        )}
        <span>{region.name}</span>
      </span>
    )
  }

  // Filter Sidebar Component
  const FilterSidebar = () => (
    <div className="w-full space-y-3">
      <div className="bg-[#1e2229] rounded-lg p-4 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Oyun Türü</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded bg-[#12161D] border-white/20 text-blue-500 focus:ring-blue-500/20" defaultChecked />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">Valorant</span>
          </label>
        </div>
      </div>
      
      <div className="bg-[#1e2229] rounded-lg p-4 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Bölge</h3>
        <div className="space-y-2">
          {/* Valorant için sadece Türkiye bölgesi */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded bg-[#12161D] border-white/20 text-blue-500 focus:ring-blue-500/20" defaultChecked />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors flex items-center gap-1.5">
              <img src="https://flagcdn.com/w40/tr.png" alt="Türkiye" className="w-5 h-4 object-cover rounded-sm" />
              Türkiye
            </span>
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#12151a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-[#1e2229] border-white/10 p-0">
                <div className="p-4 border-b border-white/5">
                  {siteSettings?.logo ? (
                    <img src={siteSettings.logo} alt={siteSettings?.siteName || 'Logo'} className="h-8 w-auto" />
                  ) : (
                    <span className="text-xl font-bold text-white">{siteSettings?.siteName || 'PINLY'}</span>
                  )}
                </div>
                <div className="p-4">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              {siteSettings?.logo ? (
                <img 
                  src={siteSettings.logo}
                  alt={siteSettings?.siteName || 'Logo'} 
                  className="h-8 md:h-10 w-auto object-contain"
                />
              ) : siteSettings ? (
                <span className="text-xl md:text-2xl font-bold text-white">{siteSettings?.siteName || 'PINLY'}</span>
              ) : (
                <div className="h-8 md:h-10 w-24 bg-white/5 animate-pulse rounded"></div>
              )}
            </a>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="/" className="text-sm text-white/70 hover:text-yellow-400 transition-colors">PUBG UC</a>
              <a href="/valorant" className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium">Valorant VP</a>
              <a href="/mlbb" className="text-sm text-white/70 hover:text-blue-400 transition-colors">MLBB Diamonds</a>
              <a href="/blog" className="text-sm text-white/70 hover:text-white transition-colors">Blog</a>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2 md:gap-3">
              {isAuthenticated ? (
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-white hover:bg-white/10 px-2 md:px-3"
                  >
                    {/* Mobilde Siparişlerim yazısı, Desktop'ta avatar */}
                    <span className="md:hidden text-xs font-medium">📦 Siparişlerim</span>
                    <div className="hidden md:flex w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white text-sm font-bold">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline text-sm">{user?.firstName || 'Hesabım'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e2229] rounded-lg shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-2 border-b border-white/5">
                      <p className="text-sm text-white font-medium truncate">{user?.email}</p>
                      {userBalance > 0 && (
                        <p className="text-xs text-green-400 mt-1">Bakiye: {userBalance.toFixed(2)} ₺</p>
                      )}
                    </div>
                    <div className="p-1">
                      <a href="/account/orders" className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                        📦 Siparişlerim
                      </a>
                      <a href="/account/support" className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                        💬 Destek Taleplerim
                      </a>
                      {/* Canlı Destek - Aktifse tıklanabilir, pasifse bilgi gösterir */}
                      {siteSettings?.liveSupportEnabled ? (
                        <button 
                          onClick={() => {
                            if (window.$crisp) {
                              window.$crisp.push(["do", "chat:open"]);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-green-400 hover:text-green-300 hover:bg-white/5 rounded-md transition-colors w-full text-left"
                        >
                          🟢 Canlı Destek
                          <span className="text-[10px] text-white/40">({siteSettings?.liveSupportHours || '14:00-22:00'})</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 cursor-not-allowed">
                          🔴 Canlı Destek
                          <span className="text-[10px]">({siteSettings?.liveSupportHours || '14:00-22:00'} arası açık)</span>
                        </div>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-md transition-colors w-full text-left"
                      >
                        🚪 Çıkış Yap
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-white/80 hover:text-white hover:bg-white/10 text-sm hidden md:flex"
                    onClick={() => {
                      setAuthModalTab('login')
                      setAuthModalOpen(true)
                    }}
                  >
                    Giriş Yap
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 md:px-4"
                    onClick={() => {
                      setAuthModalTab('register')
                      setAuthModalOpen(true)
                    }}
                  >
                    Kayıt Ol
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Trust Bar */}
      <div className="bg-[#12151a] border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-2">
          <div className="flex items-center justify-center gap-4 md:gap-8 text-[11px] md:text-xs overflow-x-auto">
            <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>SSL Güvenli</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Anında Teslimat</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span>7/24 Destek</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-1.5 text-white/80">
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>10.000+ Mutlu Müşteri</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-[200px] md:h-[300px] flex items-start overflow-hidden bg-[#1a1a1a]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: siteSettings?.valorantHeroImage 
              ? `url(${siteSettings.valorantHeroImage})`
              : siteSettings?.heroImage 
                ? `url(${siteSettings.heroImage})`
                : 'url(https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt81a85f0d04358da3/5eb7cdc19df5cf37047009d1/Valorant_VALORANT_Background.jpg)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-[#1a1a1a]" />
        
        <div className="relative z-10 max-w-[1920px] w-full mx-auto px-4 md:px-6 pt-6 md:pt-10">
          <div className="flex items-center gap-3 md:gap-4">
            {siteSettings?.categoryIcon ? (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={siteSettings.categoryIcon}
                  alt="Category"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : siteSettings ? (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <span className="font-black text-xl md:text-3xl text-white">P</span>
              </div>
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg bg-white/5 animate-pulse shadow-lg"></div>
            )}
            <div>
              <div className="text-xs md:text-sm text-white/60 mb-0.5 md:mb-1">Anasayfa &gt; Oyunlar</div>
              <h1 className="text-xl md:text-[28px] font-bold text-white">Valorant</h1>
              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                <span className="text-red-400 text-xs md:text-sm">★★★★★ 5/5</span>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`product-card-glow group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl flex flex-col border ${(product.vpAmount === 8900 || product.ucAmount === 8900 || product.title?.includes('8900')) ? 'border-yellow-500/50 ring-2 ring-yellow-500/30' : 'border-white/10'} hover:border-white/20 w-full aspect-[2/3.8] md:aspect-[2/3]`}
                    style={{ backgroundColor: '#252a34', maxWidth: '270px', margin: '0 auto' }}
                  >
                    {/* En Çok Tercih Edilen Badge */}
                    {(product.vpAmount === 8900 || product.ucAmount === 8900 || product.title?.includes('8900')) && (
                      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white text-[10px] md:text-[11px] font-bold py-1 px-2 text-center shadow-lg">
                        ⭐ EN ÇOK TERCİH EDİLEN
                      </div>
                    )}
                    
                    {/* Info Icon */}
                    <div className={`absolute ${(product.vpAmount === 8900 || product.ucAmount === 8900 || product.title?.includes('8900')) ? 'top-8' : 'top-2'} right-2 w-6 h-6 md:w-5 md:h-5 rounded-full bg-white/90 flex items-center justify-center z-20`}>
                      <span className="text-gray-700 font-bold text-xs md:text-xs">i</span>
                    </div>

                    {/* Image Section */}
                    <div className="relative h-[42%] md:h-[55%] bg-gradient-to-b from-[#2d3444] to-[#252a34] flex items-center justify-center p-2 md:p-4">
                      {/* Flare Effect - PLYR Style */}
                      <div className="go-product-shine">
                        <div className="go-product-shine-overlay"></div>
                        <img className="go-flare" src="/flare.png" alt="" />
                      </div>
                      <img 
                        src={product.imageUrl || "https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=300&h=300&fit=crop"}
                        alt={product.title}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 relative z-10"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=300&h=300&fit=crop";
                        }}
                      />
                    </div>

                    {/* Content Section */}
                    <div className="h-[58%] md:h-[45%] flex flex-col justify-between p-2.5 md:p-3.5">
                      <div>
                        <div className="text-[15px] md:text-[13px] font-bold text-white">{product.vpAmount || product.ucAmount} VP</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <RegionDisplay regionCode={product.regionCode || 'TR'} size="sm" showWhiteText={true} />
                        </div>
                        <div className="text-[9px] md:text-[9px] text-emerald-400 mt-0.5">Bölgenizde kullanılabilir</div>
                      </div>
                      <div className="mt-1">
                        {product.discountPrice < product.price && (
                          <div className="text-[11px] md:text-[9px] text-red-500 line-through">₺{product.price.toFixed(2).replace('.', ',')}</div>
                        )}
                        <div className="text-[18px] md:text-[15px] font-bold text-white">₺ {product.discountPrice.toFixed(2).replace('.', ',')}</div>
                        {product.discountPercent > 0 && (
                          <div className="text-[10px] md:text-[11px] text-emerald-400 font-medium">{product.discountPercent.toFixed(1).replace('.', ',')}% ▼ indirim</div>
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
        
        {/* Canlı Destek Butonu - Üstte */}
        <div className="flex justify-center mb-4">
          {siteSettings?.liveSupportEnabled ? (
            <button
              onClick={() => {
                if (window.$crisp) {
                  window.$crisp.push(["do", "chat:open"]);
                }
              }}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-base font-semibold transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              Canlı Destek
              <span className="text-xs opacity-75">({siteSettings?.liveSupportHours || '14:00-22:00'})</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-600/50 text-white/50 rounded-xl text-base font-semibold cursor-not-allowed">
              <span className="relative flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
              </span>
              Canlı Destek Kapalı
              <span className="text-xs">({siteSettings?.liveSupportHours || '14:00-22:00'} arası açık)</span>
            </div>
          )}
        </div>

        <div className="bg-[#1e2229] rounded-xl border border-white/5">
          {/* Tab Headers */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveInfoTab('description')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative ${
                activeInfoTab === 'description' 
                  ? 'text-white' 
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Açıklama
              {activeInfoTab === 'description' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              onClick={() => setActiveInfoTab('reviews')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all relative ${
                activeInfoTab === 'reviews' 
                  ? 'text-white' 
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              Değerlendirmeler ({reviewStats.reviewCount})
              {activeInfoTab === 'reviews' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeInfoTab === 'description' && (
              <div className="prose prose-invert max-w-none">
                {/* Valorant için özel açıklama - gameContent kullanılmıyor */}
                <div className="space-y-6">
                  {/* Ana Açıklama */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-3">Valorant: Oynanış, Tarihçe ve Sistem Gereksinimleri</h3>
                    <div className={`text-white/80 text-sm leading-relaxed whitespace-pre-line transition-all duration-300 ${!descriptionExpanded ? 'max-h-32 overflow-hidden' : ''}`}>
                      <p className="mb-4">Valorant, Riot Games tarafından geliştirilen ve 2020 yılında piyasaya sürülen ücretsiz taktiksel birinci şahıs nişancı (FPS) oyunudur. Oyun, Counter-Strike serisi ile Overwatch'un mekaniklerini birleştirerek benzersiz bir deneyim sunar.</p>
                      
                      <p className="mb-4">5v5 formatında oynanan Valorant'ta, oyuncular farklı yeteneklere sahip "Ajan" karakterlerini seçer. Her ajanın kendine özgü 4 yeteneği vardır: bir imza yeteneği, iki satın alınabilir yetenek ve bir ultimate yeteneği.</p>
                      
                      <p className="mb-4">Valorant Points (VP), oyun içi premium para birimidir. VP ile şunları satın alabilirsiniz:</p>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li>Silah skinleri ve koleksiyonları</li>
                        <li>Battle Pass ve Premium Battle Pass</li>
                        <li>Ajan kostümleri ve aksesuarları</li>
                        <li>Radianite Points (skin yükseltmeleri için)</li>
                        <li>Spray'ler, kartlar ve başlıklar</li>
                      </ul>
                      
                      <p className="font-semibold text-white mb-2">Sistem Gereksinimleri (Minimum):</p>
                      <ul className="list-disc list-inside mb-4 space-y-1">
                        <li>İşletim Sistemi: Windows 7/8/10 64-bit</li>
                        <li>RAM: 4 GB</li>
                        <li>VRAM: 1 GB</li>
                        <li>İşlemci: Intel Core 2 Duo E8400</li>
                      </ul>
                    </div>
                  </div>

                  {/* Show More/Less Button */}
                  <button
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                  >
                    {descriptionExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Daha az göster
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Devamını göster
                      </>
                    )}
                  </button>

                  {/* VP Paketleri */}
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-white mb-4">VP Paketleri</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        { amount: '375 VP', description: 'Başlangıç' },
                        { amount: '825 VP', description: 'Standart' },
                        { amount: '1700 VP', description: 'Popüler' },
                        { amount: '2925 VP', description: 'Değerli' },
                        { amount: '4325 VP', description: 'Premium' },
                        { amount: '8900 VP', description: 'Mega' }
                      ].map((pkg, idx) => (
                        <div key={idx} className="bg-[#282d36] rounded-lg p-3 text-center border border-white/5">
                          <div className="text-red-400 font-bold text-lg">{pkg.amount}</div>
                          <div className="text-white/50 text-xs">{pkg.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Özellikler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-[#282d36] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">🚀 Anında Teslimat</h4>
                      <p className="text-white/60 text-sm">Ödemeniz onaylandıktan sonra VP kodunuz anında iletilir ve siparişleriniz bölümünde görüntülenir.</p>
                    </div>
                    <div className="bg-[#282d36] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">🔒 Güvenli Ödeme</h4>
                      <p className="text-white/60 text-sm">256-bit SSL şifreleme ile tüm ödemeleriniz güvende.</p>
                    </div>
                    <div className="bg-[#282d36] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">💳 Kolay Kullanım</h4>
                      <p className="text-white/60 text-sm">Aldığınız VP kodunu Valorant mağazasında kullanabilirsiniz.</p>
                    </div>
                    <div className="bg-[#282d36] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">📞 7/24 Destek</h4>
                      <p className="text-white/60 text-sm">Herhangi bir sorun yaşarsanız destek ekibimiz size yardımcı olacaktır.</p>
                    </div>
                  </div>

                  {/* SSS */}
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-white mb-4">Sıkça Sorulan Sorular</h3>
                    <div className="space-y-3">
                      <div className="bg-[#282d36] rounded-lg p-4 border border-white/5">
                        <h4 className="text-white font-medium mb-2">VP kodu nasıl kullanılır?</h4>
                        <p className="text-white/60 text-sm">Valorant'ı açın, mağazaya gidin ve "VP Satın Al" bölümünden "Kodu Kullan" seçeneğini seçin. Aldığınız kodu girerek VP'nizi hesabınıza yükleyin.</p>
                      </div>
                      <div className="bg-[#282d36] rounded-lg p-4 border border-white/5">
                        <h4 className="text-white font-medium mb-2">VP kodları hangi bölgelerde geçerli?</h4>
                        <p className="text-white/60 text-sm">VP kodları Türkiye bölgesi için geçerlidir. Hesabınızın Türkiye sunucusunda olduğundan emin olun.</p>
                      </div>
                      <div className="bg-[#282d36] rounded-lg p-4 border border-white/5">
                        <h4 className="text-white font-medium mb-2">Teslimat ne kadar sürer?</h4>
                        <p className="text-white/60 text-sm">Ödemeniz onaylandıktan sonra VP kodunuz anında e-posta ile gönderilir ve siparişleriniz bölümünde görüntülenir.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeInfoTab === 'reviews' && (
              <div className="space-y-6">
                {/* Stats Summary */}
                <div className="flex items-center gap-6 p-4 bg-[#282d36] rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">{reviewStats.avgRating.toFixed(1)}</div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= reviewStats.avgRating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} 
                        />
                      ))}
                    </div>
                    <div className="text-white/40 text-xs mt-1">{reviewStats.reviewCount} değerlendirme</div>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div key={review.id} className="p-4 bg-[#282d36] rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
                            <img 
                              src={siteSettings?.logoUrl || '/logo.png'} 
                              alt="Pinly" 
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<span class="text-blue-600 font-bold text-sm">P</span>';
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">Misafir</span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star 
                                    key={star} 
                                    className={`w-3 h-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-white/70 text-sm">{review.comment}</p>
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

      <Dialog open={checkoutOpen} onOpenChange={(open) => {
        setCheckoutOpen(open);
        // Clear URL when modal is closed
        if (!open) {
          window.history.pushState({}, '', window.location.pathname);
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
                <div className="p-5 md:p-8 space-y-6 md:space-y-8 border-b md:border-b-0 md:border-r border-white/5">
                  {/* Valorant VP - Oyuncu ID gerekmez, direkt kod teslimi */}
                  <div className="px-4 py-3.5 rounded bg-red-500/15 border border-red-500/30">
                    <div className="flex items-center gap-2 text-red-400 mb-1 text-xs font-semibold">
                      <Check className="w-4 h-4" />
                      <span>Valorant VP Kodu</span>
                    </div>
                    <p className="text-white/70 text-sm">Ödeme sonrası VP kodunuz anında e-posta ile gönderilecek ve Siparişlerim bölümünde görüntülenecektir.</p>
                  </div>

                  <div>
                    <Label className="text-sm md:text-base text-white/80 uppercase mb-4 block">Ödeme yöntemleri</Label>
                    
                    {/* Balance Payment Option - Only show if user has SUFFICIENT balance */}
                    {isAuthenticated && selectedProduct && userBalance >= selectedProduct.discountPrice && (
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
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                            </svg>
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
                          ? 'bg-blue-900/20 border-blue-500'
                          : 'bg-[#12161D] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {paymentMethod === 'card' && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <div className="text-base md:text-lg font-bold text-white mb-1">Kredi / Banka Kartı</div>
                        <div className="inline-block px-2 py-0.5 rounded bg-white/10 text-[11px] text-white/70">
                          Anında teslimat
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <img src="/uploads/cards/visa.svg" alt="VISA" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <span className="px-2 py-1 bg-white rounded text-blue-600 font-bold text-xs hidden">VISA</span>
                        <img src="/uploads/cards/mastercard.svg" alt="Mastercard" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <span className="px-2 py-1 bg-white rounded text-red-600 font-bold text-xs hidden">MC</span>
                        <img src="/uploads/cards/troy.svg" alt="Troy" className="h-6 w-auto" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                        <span className="px-2 py-1 bg-white rounded text-blue-500 font-bold text-xs hidden">TROY</span>
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
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm md:text-base text-white/70 uppercase">Ödenecek Tutar</span>
                        <span className="text-2xl md:text-3xl font-black text-white">
                          ₺ {selectedProduct.discountPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* Satış Koşulları Onayı */}
                      <div className="flex items-start gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="termsCheckboxValorant"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                        />
                        <label htmlFor="termsCheckboxValorant" className="text-xs text-white/50 cursor-pointer">
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); setTermsModalOpen(true); }}
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            Satış koşullarını
                          </button>
                          {' '}okudum ve kabul ediyorum.
                        </label>
                      </div>

                      <Button
                        onClick={handleCheckout}
                        disabled={orderProcessing || !termsAccepted}
                        className={`w-full h-12 md:h-14 text-white font-bold text-base md:text-lg uppercase tracking-wide rounded-lg transition-all ${
                          termsAccepted 
                            ? 'bg-blue-600 hover:bg-blue-500' 
                            : 'bg-gray-600 cursor-not-allowed opacity-60'
                        }`}
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
                  <span className="text-xl font-bold text-white">{siteSettings?.siteName || 'PINLY'}</span>
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
                {(footerSettings?.categories || [{ label: 'PUBG UC', url: '/' }, { label: 'Valorant VP', url: '/valorant' }, { label: 'MLBB Diamonds', url: '/mlbb' }]).map((cat, index) => (
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
                    <li><a href="/legal/acceptable-use-conduct-policy" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Kullanım Politikası ve Davranış İlkeleri</a></li>
                    <li><a href="/legal/gizlilik-politikasi" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Gizlilik Politikası</a></li>
                    <li><a href="/legal/cookie-policy" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Çerez Politikası</a></li>
                    <li><a href="/legal/kvkk" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">KVKK Aydınlatma Metni</a></li>
                    <li><a href="/legal/iade-politikasi" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">İade Politikası</a></li>
                    <li><a href="/legal/kara-para" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Kara Paranın Aklanmasının Önlenmesi Politikası</a></li>
                    <li><a href="/legal/legal-disclaimer" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Yasal Bildirim ve Sorumluluk Reddi</a></li>
                    <li><a href="/legal/about-us" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">Hakkımızda</a></li>
                    <li><a href="/legal/contact" className="text-white/50 hover:text-white hover:underline text-sm transition-colors">İletişim</a></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/30 text-sm">
                © 2026 {siteSettings?.siteName || 'PINLY'}. Tüm hakları saklıdır.
              </p>
              
              {/* Payment Method Logos */}
              <div className="flex items-center gap-3">
                {/* Visa */}
                <div className="bg-white rounded px-2 py-1">
                  <svg className="h-6 w-auto" viewBox="0 0 780 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M293.2 348.73l33.359-195.76h53.358l-33.384 195.76H293.2zm246.11-191.54c-10.569-3.966-27.135-8.222-47.822-8.222-52.726 0-89.863 26.551-90.18 64.604-.634 28.141 26.485 43.861 46.754 53.208 20.771 9.557 27.769 15.71 27.769 24.283-.317 13.091-16.665 19.054-32.091 19.054-21.401 0-32.728-2.969-50.324-10.27l-6.939-3.138-7.527 44.019c12.507 5.429 35.617 10.143 59.616 10.397 56.07 0 92.502-26.246 92.966-66.859.222-22.254-14.012-39.21-44.808-53.158-18.646-9.047-30.092-15.086-30.092-24.269.159-8.288 9.717-16.888 30.709-16.888 17.474-.253 30.168 3.534 40.068 7.498l4.811 2.265 7.085-42.524zm137.92-4.223h-41.231c-12.773 0-22.332 3.486-27.94 16.235l-79.245 179.32h56.031s9.159-24.112 11.231-29.418c6.123 0 60.555.084 68.336.084 1.596 6.853 6.49 29.334 6.49 29.334h49.518l-43.19-195.55zm-65.417 126.41c4.414-11.279 21.259-54.724 21.259-54.724-.317.507 4.381-11.33 7.074-18.671l3.606 16.861s10.205 46.574 12.347 56.534h-44.286zM241.5 152.97l-52.239 133.49-5.565-27.129c-9.717-31.274-39.949-65.139-73.795-82.088l47.823 171.42 56.455-.063 84.004-195.64-56.683.009z" fill="#0E4595"/>
                    <path d="M131.92 152.97H46.459l-.682 4.074c66.939 16.204 111.23 55.293 129.62 102.24l-18.709-89.96c-3.229-12.396-12.597-16.095-24.768-16.349z" fill="#F2AE14"/>
                  </svg>
                </div>
                
                {/* MasterCard */}
                <div className="bg-white rounded px-2 py-1">
                  <svg className="h-6 w-auto" viewBox="0 0 152 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="40" fill="#EB001B"/>
                    <circle cx="102" cy="50" r="40" fill="#F79E1B"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M76 79.5C85.3888 71.7178 91 60.5228 91 50C91 39.4772 85.3888 28.2822 76 20.5C66.6112 28.2822 61 39.4772 61 50C61 60.5228 66.6112 71.7178 76 79.5Z" fill="#FF5F00"/>
                  </svg>
                </div>
                
                {/* American Express */}
                <div className="bg-[#016fd0] rounded px-2 py-1">
                  <svg className="h-6 w-auto" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <text x="10" y="50" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill="white">AMEX</text>
                  </svg>
                </div>
              </div>
              
              <p className="text-white/20 text-xs text-center md:text-right">
                PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.
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

      {/* Phone Number Modal for Google Users */}
      <Dialog open={phoneModalOpen} onOpenChange={setPhoneModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Telefon Numarası Gerekli</h2>
              <p className="text-sm text-gray-400">
                Siparişleriniz için telefon numaranıza ihtiyacımız var
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Telefon Numarası *</Label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="5551234567"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <Button
              onClick={handleSavePhone}
              disabled={phoneLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {phoneLoading ? 'Kaydediliyor...' : 'Onayla ve Devam Et'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Satış Koşulları Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1a1f2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Satış Koşulları ve Kullanım Şartları</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm text-white/70 leading-relaxed">
            <section>
              <h3 className="text-white font-semibold mb-2">1. Genel Hükümler</h3>
              <p>Bu satış koşulları, PINLY platformu üzerinden gerçekleştirilen tüm dijital ürün satışlarını kapsamaktadır. Satın alma işlemi gerçekleştirerek bu koşulları kabul etmiş sayılırsınız.</p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2">2. Ürün Tanımları ve Özel Koşullar</h3>
              <p>Platformumuzda satışa sunulan ürünler farklı kategorilerde olabilir:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li><strong className="text-white">Standart VP Paketleri:</strong> Belirtilen miktarda VP içerir.</li>
                <li><strong className="text-white">Şans/Yükleme Şansı Paketleri:</strong> Bu ürünler rastgele VP miktarı içermektedir. Ürün başlığında "şans", "yükleme şansı", "rastgele" veya benzeri ifadeler bulunan paketlerde, düşük veya yüksek miktarda VP çıkabilir. Bu tür ürünlerde çıkan VP miktarı garanti edilmemekte olup, tamamen şansa dayalıdır.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2">3. İade ve İptal Politikası</h3>
              <p>Dijital ürünlerin doğası gereği, teslimat gerçekleştikten sonra iade veya iptal talepleri kabul edilmemektedir. Şans paketlerinde çıkan VP miktarı ne olursa olsun, ürün teslim edilmiş sayılır ve iade talep edilemez.</p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2">4. Sorumluluk Reddi</h3>
              <p>Şans paketleri satın alan müşteriler, ürünün rastgele içerik barındırdığını ve sonucun önceden bilinemeyeceğini kabul eder. PINLY, şans paketlerinden çıkan VP miktarından dolayı herhangi bir sorumluluk kabul etmez.</p>
            </section>

            <section>
              <h3 className="text-white font-semibold mb-2">5. Onay ve Kabul</h3>
              <p>Bu koşulları onaylayarak, yukarıda belirtilen tüm maddeleri okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz. Şans paketleri dahil tüm ürünlerin özelliklerinden haberdar olduğunuzu teyit edersiniz.</p>
            </section>

            <div className="pt-4 border-t border-white/10 text-xs text-white/40">
              <p>Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
              <p>Bu koşullar PINLY tarafından önceden haber verilmeksizin güncellenebilir.</p>
            </div>

            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h4 className="text-red-400 font-semibold text-sm mb-2">⚠️ Yasal Uyarı</h4>
              <p className="text-white/60 text-xs leading-relaxed">
                İşbu satış koşullarını okuyarak ve onay kutusunu işaretleyerek, tüm maddeleri kabul ettiğinizi hukuken beyan etmiş bulunmaktasınız. Bu onay sonrasında, satış koşullarında belirtilen hususlara ilişkin şikayet, itiraz veya iade talep hakkınız bulunmamaktadır.
              </p>
              <p className="text-white/60 text-xs leading-relaxed mt-2">
                <strong className="text-white/70">PINLY LIMITED</strong> şirketimiz, sosyal medya platformları, tüketici şikayet siteleri veya diğer kamuya açık mecralarda şirketimizi, markamızı veya hizmetlerimizi karalayıcı, hakaret içeren, iftira niteliğinde veya ticari itibarımızı zedeleyici nitelikteki her türlü paylaşım, yorum ve içeriğe karşı yasal haklarını saklı tutmaktadır.
              </p>
              <p className="text-white/60 text-xs leading-relaxed mt-2">
                Bu tür eylemlerin tespiti halinde, <strong className="text-white/70">Türk Ceza Kanunu</strong> ve <strong className="text-white/70">Türk Borçlar Kanunu</strong> kapsamında hukuk müşavirlerimiz aracılığıyla maddi ve manevi tazminat davaları dahil olmak üzere gerekli tüm yasal işlemler başlatılacaktır.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              onClick={() => {
                setTermsAccepted(true);
                setTermsModalOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Okudum, Kabul Ediyorum
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
