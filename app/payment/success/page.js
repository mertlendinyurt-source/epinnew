'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Shield, User, Mail, Receipt, Hash, Package, Copy, Check, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState, Suspense } from 'react'

// 3000 TL ve üzeri siparişler için doğrulama gerekli
const VERIFICATION_THRESHOLD = 3000;

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const orderId = searchParams.get('orderId')
  
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token')
        
        let orderData = null;
        
        if (token) {
          const authResponse = await fetch(`/api/account/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (authResponse.ok) {
            const authData = await authResponse.json()
            if (authData.success && authData.data) {
              // API returns { order, payment } or just order object
              orderData = authData.data.order || authData.data
            }
          }
        }
        
        // Public endpoint'i dene
        if (!orderData) {
          const publicResponse = await fetch(`/api/orders/${orderId}/summary`)
          if (publicResponse.ok) {
            const publicData = await publicResponse.json()
            if (publicData.success && publicData.data) {
              orderData = publicData.data
            }
          }
        }
        
        if (orderData) {
          setOrder(orderData)
          
          // GTM DataLayer Push - Google Ads ROAS için
          if (typeof window !== 'undefined') {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ ecommerce: null });
            
            const amountValue = Number(orderData.amount || orderData.totalAmount || 0);
            
            window.dataLayer.push({
              event: 'purchase',
              
              // Google Ads için GARANTİ (Düz) Değişkenler:
              ads_value: amountValue,
              ads_id: orderId,
              ads_currency: 'TRY',

              // GA4 için Standart (Nested) Yapı:
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
            
            console.log('GTM DataLayer Push - Purchase Event:', { orderId, amountValue });
          }
          
          // TUTAR KONTROLÜ - 3000 TL ve üzeri ise doğrulama sayfasına yönlendir
          const orderAmount = orderData.amount || orderData.totalAmount || 0;
          const isHighValue = orderAmount >= VERIFICATION_THRESHOLD;
          const isNotDelivered = orderData.delivery?.status !== 'delivered';
          const verificationNotSubmitted = !orderData.verification?.submittedAt;
          
          console.log('=== FRONTEND VERIFICATION CHECK ===');
          console.log('Order Amount:', orderAmount);
          console.log('Is High Value (>= 3000):', isHighValue);
          console.log('Is Not Delivered:', isNotDelivered);
          console.log('Verification Not Submitted:', verificationNotSubmitted);
          
          // 3000 TL üzeri + teslim edilmemiş + doğrulama gönderilmemiş = doğrulama gerekli
          if (isHighValue && isNotDelivered && verificationNotSubmitted) {
            console.log('>>> REDIRECTING TO VERIFICATION PAGE <<<');
            setTimeout(() => {
              router.push(`/account/orders/${orderId}/verification`)
            }, 2000)
          }
        }
      } catch (error) {
        console.error('Failed to fetch order:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, router])

  // Doğrulama gerekli mi kontrolü - TUTAR BAZLI
  const orderAmount = order?.amount || order?.totalAmount || 0;
  const isHighValue = orderAmount >= VERIFICATION_THRESHOLD;
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

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₺0,00'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const customerName = order?.customer 
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    : null
  
  const customerEmail = order?.customer?.email || null
  const customerPhone = order?.customer?.phone || null
  const productTitle = order?.productTitle || null
  const amount = order?.amount || order?.totalAmount || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="bg-slate-900/50 border-slate-800 max-w-lg w-full shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30 animate-pulse">
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
                      <div className="text-white font-mono text-sm font-semibold break-all">{orderId}</div>
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
                {customerName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Müşteri Adı</div>
                      <div className="text-white font-semibold">{customerName}</div>
                    </div>
                  </div>
                )}

                {/* E-posta */}
                {customerEmail && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">E-posta Adresi</div>
                      <div className="text-white font-medium break-all">{customerEmail}</div>
                    </div>
                  </div>
                )}

                {/* Telefon */}
                {customerPhone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Telefon Numarası</div>
                      <div className="text-white font-medium">{customerPhone}</div>
                    </div>
                  </div>
                )}

                {/* Ürün */}
                {productTitle && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Ürün</div>
                      <div className="text-white font-semibold">{productTitle}</div>
                    </div>
                  </div>
                )}

                {/* Tutar */}
                {amount && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Sipariş Tutarı</div>
                      <div className="text-green-400 font-bold text-xl">{formatCurrency(amount)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Doğrulama Uyarısı - 3000 TL ve üzeri için */}
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

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
