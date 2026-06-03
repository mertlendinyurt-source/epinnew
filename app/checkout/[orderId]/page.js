'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ShopierV2CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [sessionStatus, setSessionStatus] = useState('pending');
  const [pollCount, setPolCount] = useState(0);
  const [expiresAt, setExpiresAt] = useState(null);

  // Fetch initial payment URL
  useEffect(() => {
    if (!orderId) return;

    const fetchOrderData = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Sipariş bulunamadı');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          const order = result.data;
          
          // Check if order has payment data
          if (order.meta?.shopierV2PaymentUrl) {
            setPaymentUrl(order.meta.shopierV2PaymentUrl);
            setOrderStatus(order.status);
            setLoading(false);
          } else {
            setError('Ödeme URL\'si bulunamadı');
            setLoading(false);
          }
        } else {
          setError('Sipariş verisi alınamadı');
          setLoading(false);
        }
      } catch (err) {
        console.error('Order fetch error:', err);
        setError(err.message || 'Sipariş yüklenirken hata oluştu');
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [orderId]);

  // Poll payment status every 4 seconds
  useEffect(() => {
    if (!orderId || loading || error) return;
    if (orderStatus === 'paid' || orderStatus === 'failed' || orderStatus === 'cancelled') return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/payment/shopierv2/status?orderId=${orderId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            setOrderStatus(result.data.orderStatus);
            setSessionStatus(result.data.sessionStatus);
            setExpiresAt(result.data.expiresAt);

            // If payment is complete, redirect
            if (result.data.orderStatus === 'paid') {
              setTimeout(() => {
                router.push(`/payment/success?orderId=${orderId}`);
              }, 2000);
            } else if (result.data.orderStatus === 'failed') {
              setTimeout(() => {
                router.push(`/payment/failed?orderId=${orderId}`);
              }, 2000);
            } else if (result.data.sessionStatus === 'expired') {
              setError('Ödeme oturumu süresi doldu');
            }
          }
        }
        
        setPolCount(prev => prev + 1);
      } catch (err) {
        console.error('Status poll error:', err);
      }
    };

    // Initial poll immediately
    pollStatus();

    // Poll every 4 seconds
    const interval = setInterval(pollStatus, 4000);

    // Stop polling after 15 minutes (900 seconds / 4 = 225 polls)
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setError('Ödeme oturumu zaman aşımına uğradı');
    }, 900000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [orderId, loading, error, orderStatus, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ödeme Hazırlanıyor</h2>
          <p className="text-gray-600">Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Hata</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  if (orderStatus === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Ödeme Başarılı! 🎉</h2>
          <p className="text-gray-600 mb-8">Siparişiniz onaylandı, yönlendiriliyorsunuz...</p>
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Güvenli Ödeme</h1>
            <p className="text-sm text-gray-600">Sipariş No: {orderId}</p>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div className="text-right">
              <p className="text-xs text-gray-500">Durum Kontrolü</p>
              <p className="text-sm font-semibold text-gray-800">
                {sessionStatus === 'pending' && '⏳ Beklemede'}
                {sessionStatus === 'active' && '🔄 Ödeme Bekleniyor'}
                {sessionStatus === 'paid' && '✅ Ödendi'}
                {sessionStatus === 'expired' && '⏱️ Süresi Doldu'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Iframe Container */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-purple-100">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="font-semibold">Shopier Güvenli Ödeme</span>
              </div>
              <div className="text-sm opacity-90">
                {pollCount > 0 && `Kontrol: ${pollCount}`}
              </div>
            </div>
          </div>
          
          {paymentUrl ? (
            <div className="relative" style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
              <iframe
                src={paymentUrl}
                className="w-full h-full border-0"
                title="Shopier Ödeme"
                allow="payment"
                sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation allow-popups"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Ödeme Bilgilendirmesi
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Ödeme işleminiz Shopier güvenli ödeme sistemi üzerinden gerçekleştirilmektedir.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Ödeme durumunuz otomatik olarak kontrol edilmekte ve güncellenm ektedir.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Ödeme başarılı olduktan sonra otomatik olarak yönlendirileceksiniz.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-0.5">⚠</span>
              <span>Bu sayfayı kapatmayın, ödeme işlemi tamamlanana kadar bekleyin.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Emergency Back Button */}
      <div className="max-w-7xl mx-auto mt-6 text-center">
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Sipariş Detayına Git
        </button>
      </div>
    </div>
  );
}
