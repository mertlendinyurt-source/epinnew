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

export default function LoLPage() {
  // 🎮 LEAGUE OF LEGENDS PAGE CONFIGURATION
  const GAME_TYPE = 'lol'
  const GAME_NAME = 'League of Legends'
  const CURRENCY_NAME = 'RP'
  const THEME_COLOR = 'yellow' // LoL altın/turkuaz teması
  
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)

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
      
      // TEK API ÇAĞRISI - Tüm veriler (sadece LoL ürünleri)
      const response = await fetch('/api/homepage?game=lol')
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
      // Find product by slug (e.g., "650rp", "1380rp")
      const slug = productParam.toLowerCase().replace('-', '');
      
      // Try to match by RP amount in title
      const rpAmount = parseInt(slug.replace('rp', '').replace('vp', '').replace('uc', ''));
      
      let matchedProduct = null;
      
      if (!isNaN(rpAmount)) {
        // Find product that contains the RP amount in title or rpAmount field
        matchedProduct = products.find(p => {
          // Check rpAmount field first
          if (p.rpAmount && parseInt(p.rpAmount) === rpAmount) {
            return true;
          }
          // Check title
          const title = p.title.toLowerCase();
          const matches = title.match(/(\d+)\s*rp/i);
          if (matches) {
            return parseInt(matches[1]) === rpAmount;
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
    
    // Update URL with product parameter for Google Ads tracking (RP için)
    const rpAmount = product.title.match(/(\d+)\s*RP/i) || product.rpAmount;
    if (rpAmount) {
      const amount = typeof rpAmount === 'object' ? rpAmount[1] : (product.rpAmount || product.ucAmount);
      const productSlug = amount + 'rp';
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
    // LoL için Oyuncu ID kontrolü yok - direkt kod teslimi

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
          playerId: 'lol-direct', // LoL için oyuncu ID gerekmiyor
          playerName: 'League of Legends RP',
          paymentMethod: paymentMethod, // 'card' or 'balance'
          game: GAME_TYPE, // 'lol'
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
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">League of Legends</span>
          </label>
        </div>
      </div>
      
      <div className="bg-[#1e2229] rounded-lg p-4 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Bölge</h3>
        <div className="space-y-2">
          {/* LoL için sadece Türkiye bölgesi */}
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
          <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
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

            {/* Trust Badges - Desktop Only */}
            <div className="hidden md:flex items-center gap-6 text-[11px] lg:text-xs">
              <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>SSL Güvenli</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span>Anında Teslimat</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span>7/24 Destek</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80 whitespace-nowrap">
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>10.000+ Mutlu Müşteri</span>
              </div>
            </div>

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

      {/* Mobile Trust Badges */}
      <div className="md:hidden bg-[#12151a] border-b border-white/5">
        <div className="flex items-center justify-center gap-3 px-4 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 text-white/70 whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px]">SSL</span>
          </div>
          <div className="flex items-center gap-1 text-white/70 whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px]">Anında</span>
          </div>
          <div className="flex items-center gap-1 text-white/70 whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px]">7/24</span>
          </div>
          <div className="flex items-center gap-1 text-white/70 whitespace-nowrap">
            <svg className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-[10px]">10K+</span>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="bg-[#0d1117] border-b border-white/5">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center gap-2 px-4 md:px-6 py-3 overflow-x-auto scrollbar-hide" style={{ overflow: categoryDropdownOpen ? 'visible' : 'auto' }}>
            {/* Kategoriler Dropdown */}
            <div className="relative flex-shrink-0" style={{ zIndex: 100 }}>
              <button 
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-xs md:text-sm font-medium text-white">Kategoriler</span>
                <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {categoryDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setCategoryDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-64 bg-[#1a1f2e] rounded-xl shadow-2xl border border-white/10 z-50">
                    {/* User Actions */}
                    <div className="p-2 border-b border-white/10">
                      <a href="/account/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <span className="text-lg">📦</span>
                        <span className="text-sm text-white/90">Siparişlerim</span>
                      </a>
                      <a href="/account/support/new" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <span className="text-lg">💬</span>
                        <span className="text-sm text-white/90">Destek Talebi Oluştur</span>
                      </a>
                    </div>
                    
                    {/* Game Categories */}
                    <div className="p-2">
                      <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">Oyun Kategorileri</p>
                      <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                          <img src="/pubg-logo.png" alt="PUBG" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-sm text-white/90">Pubg Mobile</span>
                      </a>
                      <a href="/valorant" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                          <img src="/valorant-logo.png" alt="Valorant" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-sm text-white/90">Valorant</span>
                      </a>
                      <a href="/mlbb" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                          <img src="/mlbb-logo.png" alt="Mobile Legends" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-sm text-white/90">Mobile Legends</span>
                      </a>
                      <a href="/lol" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors bg-white/5">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                          <img src="/lol-logo.png" alt="League of Legends" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="text-sm text-yellow-400">League of Legends</span>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Game Categories - Horizontal */}
            <a 
              href="/" 
              className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-[#1a1f2e] hover:bg-[#232a3d] rounded-lg transition-all border border-yellow-500/20 flex-shrink-0 group"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                <img src="/pubg-logo.png" alt="PUBG" className="w-6 h-6 md:w-7 md:h-7 object-contain" />
              </div>
              <span className="text-xs md:text-sm font-medium text-white/90 group-hover:text-yellow-400 transition-colors whitespace-nowrap">Pubg Mobile</span>
            </a>

            <a 
              href="/valorant" 
              className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-[#1a1f2e] hover:bg-[#232a3d] rounded-lg transition-all border border-red-500/20 flex-shrink-0 group"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                <img src="/valorant-logo.png" alt="Valorant" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
              </div>
              <span className="text-xs md:text-sm font-medium text-white/90 group-hover:text-red-400 transition-colors whitespace-nowrap">Valorant</span>
            </a>

            <a 
              href="/mlbb" 
              className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-[#1a1f2e] hover:bg-[#232a3d] rounded-lg transition-all border border-blue-500/20 flex-shrink-0 group"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                <img src="/mlbb-logo.png" alt="Mobile Legends" className="w-6 h-6 md:w-7 md:h-7 object-contain" />
              </div>
              <span className="text-xs md:text-sm font-medium text-white/90 group-hover:text-blue-400 transition-colors whitespace-nowrap">Mobile Legends</span>
            </a>

            {/* League of Legends - Active */}
            <a 
              href="/lol" 
              className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-[#1a1f2e] hover:bg-[#232a3d] rounded-lg transition-all border border-yellow-500/30 ring-1 ring-yellow-500/30 flex-shrink-0 group"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                <img src="/lol-logo.png" alt="League of Legends" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
              </div>
              <span className="text-xs md:text-sm font-medium text-yellow-400 whitespace-nowrap">League of Legends</span>
            </a>
          </div>
        </div>
      </div>

      <div className="relative h-[200px] md:h-[300px] flex items-start overflow-hidden bg-[#1a1a1a]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: siteSettings?.lolHeroImage 
              ? `url(${siteSettings.lolHeroImage})`
              : siteSettings?.heroImage 
                ? `url(${siteSettings.heroImage})`
                : 'url(https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltf8be62f1eb58b34c/5ef1134fa8a14a6c8c81b71e/LOL_PROMOART_14.jpg)'
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
              <h1 className="text-xl md:text-[28px] font-bold text-white">League of Legends</h1>
              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                <span className="text-yellow-400 text-xs md:text-sm">★★★★★ 5/5</span>
                <span className="text-white/70 text-xs md:text-sm">(2008) yorum</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Banner */}
      {siteSettings?.dailyBannerEnabled !== false && (
        <div 
          className="relative overflow-hidden mx-4 md:mx-6 mt-4 rounded-2xl animate-fadeInUp"
          role="banner"
          aria-label="Günlük kampanya banner"
          style={{ minHeight: '80px' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f35] via-[#252d4a] to-[#1a1f35]" />
          <div className="absolute top-0 left-1/4 w-64 h-32 bg-yellow-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-cyan-500/15 rounded-full blur-3xl" />
          
          {siteSettings?.dailyCountdownEnabled !== false && countdown.hours === 0 && countdown.minutes < 10 && (
            <div className="absolute top-1/2 right-1/4 w-48 h-24 bg-orange-500/30 rounded-full blur-3xl animate-pulse" />
          )}
          
          <div className="absolute inset-0 rounded-2xl border border-white/10" />
          
          <div className="relative z-10 px-5 md:px-8 py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-4">
            <div className="flex items-center gap-4 text-center md:text-left">
              <BannerIcon icon={siteSettings?.dailyBannerIcon || 'fire'} size="desktop" />
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
            
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
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
                    <div className="relative">
                      <div className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-black/40 border ${
                        countdown.hours === 0 && countdown.minutes < 10
                          ? countdown.minutes < 5
                            ? 'border-red-500/40'
                            : 'border-orange-500/40'
                          : 'border-cyan-500/30'
                      }`}>
                        <span>{String(countdown.hours).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <span className="animate-pulse">:</span>
                    <div className="relative">
                      <div className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-black/40 border ${
                        countdown.hours === 0 && countdown.minutes < 10
                          ? countdown.minutes < 5
                            ? 'border-red-500/40'
                            : 'border-orange-500/40'
                          : 'border-cyan-500/30'
                      }`}>
                        <span>{String(countdown.minutes).padStart(2, '0')}</span>
                      </div>
                    </div>
                    <span className="animate-pulse">:</span>
                    <div className="relative">
                      <div className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-md bg-black/40 border ${
                        countdown.hours === 0 && countdown.minutes < 10
                          ? countdown.minutes < 5
                            ? 'border-red-500/40'
                            : 'border-orange-500/40'
                          : 'border-cyan-500/30'
                      }`}>
                        <span>{String(countdown.seconds).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {siteSettings?.dailyCountdownEnabled !== false && (
                <div className="hidden md:block w-px h-10 bg-white/10" />
              )}
              
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

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex gap-4 md:gap-5">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block w-48 lg:w-56 shrink-0">
            <FilterSidebar />
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-yellow-400">⚔️</span>
                RP Paketleri
              </h2>
              <span className="text-sm text-white/50">{products.length} ürün</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-[#1e2229] rounded-xl p-4 animate-pulse">
                    <div className="w-full h-24 bg-white/5 rounded-lg mb-3"></div>
                    <div className="h-4 bg-white/5 rounded mb-2 w-3/4"></div>
                    <div className="h-6 bg-white/5 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-3xl">⚔️</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ürünler Yakında</h3>
                <p className="text-white/60 text-sm">League of Legends RP paketleri çok yakında eklenecek!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {products.map(product => (
                  <div 
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="group bg-gradient-to-b from-[#1e2229] to-[#1a1d22] rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-yellow-500/50 transition-all duration-200 border border-white/5 hover:border-yellow-500/30"
                  >
                    {/* Product Image */}
                    <div className="relative h-24 md:h-28 bg-gradient-to-br from-yellow-600/20 to-cyan-600/20 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-4xl">⚔️</div>
                      )}
                      {product.discountPercent > 0 && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                          %{product.discountPercent} İNDİRİM
                        </div>
                      )}
                      {product.featured && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                          <Star className="w-3 h-3" fill="currentColor" />
                          ÖNE ÇIKAN
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-3 md:p-4">
                      <h3 className="text-sm md:text-base font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                        {product.title}
                      </h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          {product.discountPercent > 0 && (
                            <span className="text-xs text-white/40 line-through mr-2">
                              {product.price.toFixed(2)} ₺
                            </span>
                          )}
                          <span className="text-base md:text-lg font-bold text-yellow-400">
                            {product.discountPrice.toFixed(2)} ₺
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="bg-[#1e2229] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-yellow-400">⚔️</span>
              {selectedProduct?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Product Info */}
            <div className="bg-[#12151a] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60">Ürün</span>
                <span className="font-semibold">{selectedProduct?.title}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60">Teslimat</span>
                <span className="text-green-400 text-sm">Anında Kod Teslimi</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="text-white/60">Toplam</span>
                <span className="text-xl font-bold text-yellow-400">{selectedProduct?.discountPrice.toFixed(2)} ₺</span>
              </div>
            </div>

            {/* LoL için bilgi */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Riot Points kodunuz ödeme sonrası anında teslim edilecektir.
              </p>
            </div>

            {/* Payment Method */}
            {isAuthenticated && userBalance > 0 && (
              <div className="space-y-2">
                <Label className="text-white/80">Ödeme Yöntemi</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-lg border transition-all ${
                      paymentMethod === 'card' 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-medium">💳 Kredi Kartı</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('balance')}
                    disabled={userBalance < (selectedProduct?.discountPrice || 0)}
                    className={`p-3 rounded-lg border transition-all ${
                      paymentMethod === 'balance' 
                        ? 'border-green-500 bg-green-500/10' 
                        : 'border-white/10 hover:border-white/20'
                    } ${userBalance < (selectedProduct?.discountPrice || 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-sm font-medium">💰 Bakiye ({userBalance.toFixed(2)} ₺)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 rounded bg-[#12151a] border-white/20"
              />
              <label htmlFor="terms" className="text-sm text-white/60">
                <button onClick={() => setTermsModalOpen(true)} className="text-yellow-400 hover:underline">
                  Satış koşullarını
                </button>
                {' '}okudum ve kabul ediyorum.
              </label>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={!termsAccepted || orderProcessing}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold py-3"
            >
              {orderProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {paymentMethod === 'balance' ? 'Bakiye ile Öde' : 'Ödemeye Geç'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms Modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="bg-[#1e2229] border-white/10 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Satış Koşulları</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-white/80">
            <p>1. League of Legends RP kodları Riot Games tarafından sağlanmaktadır.</p>
            <p>2. Satın alınan kodlar iade edilemez.</p>
            <p>3. Kodlar yalnızca belirtilen bölge için geçerlidir.</p>
            <p>4. Teslimat ödeme onayından sonra anında yapılır.</p>
            <p>5. Herhangi bir sorun yaşamanız durumunda destek ekibimizle iletişime geçebilirsiniz.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
        onSuccess={handleAuthSuccess}
      />

      {/* Phone Modal for Google Users */}
      <Dialog open={phoneModalOpen} onOpenChange={setPhoneModalOpen}>
        <DialogContent className="bg-[#1e2229] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Telefon Numaranızı Girin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-white/60">Siparişleriniz hakkında sizi bilgilendirmemiz için telefon numaranıza ihtiyacımız var.</p>
            <Input
              type="tel"
              placeholder="05XX XXX XX XX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-[#12151a] border-white/10 text-white"
            />
            <Button
              onClick={handleSavePhone}
              disabled={phoneLoading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kaydet'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-[#0d1117] border-t border-white/5 mt-12">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {siteSettings?.logo ? (
                <img src={siteSettings.logo} alt="Logo" className="h-6" />
              ) : (
                <span className="text-lg font-bold text-white">{siteSettings?.siteName || 'PINLY'}</span>
              )}
            </div>
            <p className="text-sm text-white/40">© 2025 {siteSettings?.siteName || 'PINLY'}. Tüm hakları saklıdır.</p>
          </div>
          
          {/* Payment Logos */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex justify-center">
              <img 
                src="/payment-logos.png" 
                alt="iyzico ile güvenli ödeme - Visa, Mastercard, Troy" 
                className="h-8 md:h-10 object-contain opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
