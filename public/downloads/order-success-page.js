'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react'

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [siteSettings, setSiteSettings] = useState(null)
  const purchaseTracked = useRef(false) // Prevent duplicate purchase events

  useEffect(() => {
    loadSiteSettings()
    loadSEOAndTrack()
    if (orderId) {
      loadOrder(orderId)
    } else {
      setLoading(false)
    }
  }, [orderId])

  const loadSiteSettings = async () => {
    try {
      const res = await fetch('/api/site/settings')
      const data = await res.json()
      if (data.success) {
        setSiteSettings(data.data)
      }
    } catch (err) {
      console.error('Failed to load site settings:', err)
    }
  }

  // Load SEO settings and track purchase event
  const loadSEOAndTrack = async () => {
    try {
      const res = await fetch('/api/seo/settings')
      const data = await res.json()
      
      if (data.success && data.data?.ga4MeasurementId) {
        // Inject GA4 if not already loaded
        if (!document.querySelector(`script[src*="${data.data.ga4MeasurementId}"]`)) {
          const script = document.createElement('script')
          script.async = true
          script.src = `https://www.googletagmanager.com/gtag/js?id=${data.data.ga4MeasurementId}`
          document.head.appendChild(script)
          
          const initScript = document.createElement('script')
          initScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${data.data.ga4MeasurementId}');
          `
          document.head.appendChild(initScript)
        }
      }
    } catch (err) {
      console.error('Failed to load SEO settings:', err)
    }
  }

  const loadOrder = async (id) => {
    try {
      const token = localStorage.getItem('userToken')
      const res = await fetch(`/api/orders/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success) {
        setOrder(data.data)
        
        // Track purchase event only once
        if (!purchaseTracked.current && typeof window !== 'undefined' && window.gtag) {
          purchaseTracked.current = true
          window.gtag('event', 'purchase', {
            transaction_id: data.data.id,
            value: data.data.amount,
            currency: 'TRY',
            items: [{
              item_id: data.data.productId,
              item_name: data.data.productTitle,
              price: data.data.amount,
              quantity: 1
            }]
          })
        }
      }
    } catch (err) {
      console.error('Failed to load order:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-green-950/30 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-green-500/10">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarılı!</h1>
          <p className="text-slate-400 mb-6">
            {siteSettings?.siteName || 'PINLY'} üzerinden siparişiniz alındı.
          </p>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : order ? (
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Sipariş Detayları</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sipariş No:</span>
                  <span className="text-white font-mono">{order.id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ürün:</span>
                  <span className="text-white">{order.productTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tutar:</span>
                  <span className="text-green-400 font-bold">₺{order.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Durum:</span>
                  <span className="text-green-400">
                    {order.status === 'completed' ? 'Tamamlandı' : 
                     order.status === 'pending' ? 'İşleniyor' : order.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 mb-6">Sipariş bilgileri yükleniyor...</p>
          )}

          <div className="space-y-3">
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              <Home className="w-5 h-5" />
              Ana Sayfaya Dön
            </a>
            <a
              href="/orders"
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-all"
            >
              Siparişlerim
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          {siteSettings?.siteName || 'PINLY'} – Dijital Ürün ve Kod Satış Platformu
        </p>
      </div>
    </div>
  )
}
