'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState, Suspense } from 'react'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return

    // Fetch order details to check if verification is required
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch(`/api/account/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          setOrder(data.data)
          
          // Redirect to verification page if required
          if (data.data.verification?.required && data.data.verification?.status === 'pending' && !data.data.verification?.submittedAt) {
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

  const isVerificationRequired = order?.verification?.required && !order?.verification?.submittedAt

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="bg-slate-900/50 border-slate-800 max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-white text-3xl">Ödeme Başarılı!</CardTitle>
          <CardDescription className="text-slate-400 text-lg">
            Siparişiniz başarıyla oluşturuldu
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Sipariş Numarası</div>
            <div className="text-white font-mono font-bold">{orderId}</div>
          </div>

          {isVerificationRequired ? (
            <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-700 text-sm text-amber-400">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">🔐 Doğrulama Gerekli</p>
                  <p className="text-xs">Yüksek tutarlı siparişiniz için güvenlik doğrulaması yapılması gerekmektedir. Yönlendiriliyorsunuz...</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-green-900/20 border border-green-800 text-sm text-green-400">
              <p className="font-semibold mb-1">✓ UC'leriniz yüklenecek</p>
              <p className="text-xs">5-10 dakika içinde hesabınıza UC yüklemesi yapılacaktır.</p>
            </div>
          )}

          <div className="space-y-2">
            {isVerificationRequired ? (
              <Button
                onClick={() => router.push(`/account/orders/${orderId}/verification`)}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white"
              >
                Doğrulama Sayfasına Git
              </Button>
            ) : (
              <Button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                Ana Sayfaya Dön
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}