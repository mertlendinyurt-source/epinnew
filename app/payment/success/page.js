'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Shield, User, Mail, Receipt, Hash, Package, Copy, Check, Phone, Home } from 'lucide-react'
import { Button } from '@/components/ui/button' 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState, useRef, Suspense } from 'react'

const VERIFICATION_THRESHOLD = 3000;

// Skeleton (Tırnak hatası düzeltildi)
const Skeleton = ({ width = 'w-32' }) => (
  <span className={`animate-pulse bg-slate-600 rounded h-5 ${width} inline-block`}></span>
)

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const purchaseTracked = useRef(false)
  const apiCalled = useRef(false)

  useEffect(() => {
    if (!orderId) {
        if (!loading) setLoading(false);
        return;
    }
    
    if (apiCalled.current) return;
    apiCalled.current = true;

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token')
        let orderData = null;
        
        // 1. Token ile Üye API'sini dene
        if (token) {
          try {
            const authResponse = await fetch(`/api/account/orders/${orderId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (authResponse.ok) {
              const authData = await authResponse.json()
              if (authData.success && authData.data) {
                orderData = authData.data.order || authData.data
              }
            }
          } catch (e) {
            // Sessizce geç, public API denenecek
          }
        }
        
        // 2. Veri yoksa Public API'yi dene
        if (!orderData) {
          try {
            const publicResponse = await fetch(`/api/orders/${orderId}/summary`)
            if (publicResponse.ok) {
              const publicData = await publicResponse.json()
              if (publicData.success && publicData.data) {
                orderData = publicData.data
              }
            }
          } catch (e) {
            console.error("Sipariş verisi alınamadı:", e);
          }
        }
        
        // 3. Veri geldiyse işlemleri yap
        if (orderData) {
          setOrder(orderData)
          
          // --- GTM / Google Ads Tetikleme ---
          if (!purchaseTracked.current) {
            purchaseTracked.current = true
            
            // Veriyi güvenli şekilde GTM'e gönder
            if (typeof window !== 'undefined') {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ ecommerce: null }); // Eski veriyi temizle
                
                const amountValue = Number(orderData.amount || orderData.totalAmount || 0);
                
                window.dataLayer.push({
                  event: 'purchase',
                  // Google Ads (Düz Yapı)
                  ads_value: amountValue,
                  ads_id: orderId,
                  ads_currency: 'TRY',
                  // GA4 (Standart Yapı)
                  ecommerce: {
                    transaction_id: orderId,
                    value: amountValue,
                    currency: 'TRY',
                    items: [{
                      item_id: orderData.productId || orderId,
                      item_name: orderData.productTitle || 'Ürün',
                      price: amountValue,
                      quantity: 1
                    }]
                  }
                });
            }
          }
          
          // Yüksek Tutar Doğrulama Kontrolü
          const orderAmount = orderData.amount || orderData.totalAmount || 0;
          const isHighValue = orderAmount >= VERIFICATION_THRESHOLD;
          const isNotDelivered = orderData.delivery?.status !== 'delivered';
          const verificationNotSubmitted = !orderData.verification?.submittedAt;

          if (isHighValue && isNotDelivered && verificationNotSubmitted) {
            setTimeout(() => {
              router.push(`/account/orders/${orderId}/verification`)
            }, 2000)
          }
        }
      } catch (error) {
        console.error('İşlem hatası:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router])

  // UI Helperları
  const customerName = order?.customer 
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    : null
  const customerEmail = order?.customer?.email || null
  const customerPhone = order?.customer?.phone || null
  const productTitle = order?.productTitle || null
  const amount = order?.amount || order?.totalAmount || 0

  const isHighValue = amount >= VERIFICATION_THRESHOLD;
  const isNotDelivered = order?.delivery?.status !== 'delivered';
  const verificationNotSubmitted = !order?.verification?.submittedAt;
  const isVerificationRequired = isHighValue && isNotDelivered && verificationNotSubmitted;

  const copyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '₺0,00'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(val)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="bg-slate-900/50 border-slate-800 max-w-lg w-full shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
          <CardTitle className="text-white text-3xl font-bold">Ödeme Başarılı!</CardTitle>
          <CardDescription className="text-slate-400 text-lg">
            Siparişiniz başarıyla oluşturuldu
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-4">
                {/* Sipariş Numarası */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Hash className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Sipariş Numarası</div>
                      <div className="text-white font-mono text-sm font-semibold break-all">
                        {orderId || <Skeleton width="w-48" />}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={copyOrderId}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                    title="Kopyala"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>

                {/* Müşteri Adı */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Müşteri Adı</div>
                    <div className="text-white font-semibold">
                      {customerName || <span className="text-white/50">-</span>}
                    </div>
                  </div>
                </div>

                {/* E-posta */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">E-posta Adresi</div>
                    <div className="text-white font-medium break-all">
                      {customerEmail || <span className="text-white/50">-</span>}
                    </div>
                  </div>
                </div>

                {/* Telefon */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Telefon Numarası</div>
                    <div className="text-white font-medium">
                      {customerPhone || <span className="text-white/50">-</span>}
                    </div>
                  </div>
                </div>

                {/* Ürün */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Ürün</div>
                    <div className="text-white font-semibold">
                      {productTitle || <span className="text-white/50">-</span>}
                    </div>
                  </div>
                </div>

                {/* Tutar */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Sipariş Tutarı</div>
                    <div className="text-green-400 font-bold text-xl">
                      {formatCurrency(amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Doğrulama Uyarısı */}
              {isVerificationRequired && (
                <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-700/50 text-sm text-amber-400">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">🔐 Doğrulama Gerekli</p>
                      <p className="text-xs text-amber-300/80">Yüksek tutarlı siparişiniz için güvenlik doğrulaması yapılması gerekmektedir. Yönlendiriliyorsunuz...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Butonlar */}
              <div className="space-y-3 pt-2">
                {isVerificationRequired ? (
                  <Button
                    onClick={() => router.push(`/account/orders/${orderId}/verification`)}
                    className="w-full h-12 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold text-base shadow-lg shadow-amber-600/20"
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Doğrulama Sayfasına Git
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => router.push('/account/orders')}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-base shadow-lg shadow-blue-600/20"
                    >
                      <Package className="w-5 h-5 mr-2" />
                      Siparişlerime Git
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/'}
                      variant="outline"
                      className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-800 font-medium"
                    >
                      <Home className="w-5 h-5 mr-2" />
                      Ana Sayfaya Dön
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <div className="text-white">Yükleniyor...</div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
