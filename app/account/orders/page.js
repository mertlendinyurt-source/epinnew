'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export default function AccountOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const token = localStorage.getItem('userToken');
    const user = localStorage.getItem('userData');

    if (!token) {
      toast.error('Lütfen giriş yapın');
      router.push('/');
      return;
    }

    if (user) {
      setUserData(JSON.parse(user));
    }

    await fetchOrders(token);
  };

  const fetchOrders = async (token) => {
    try {
      const response = await fetch('/api/account/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        toast.error('Oturumunuz sonlandı');
        router.push('/');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        toast.error('Siparişler yüklenemedi');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Bekliyor', variant: 'secondary', color: 'bg-yellow-500' },
      paid: { label: 'Ödendi', variant: 'default', color: 'bg-green-500' },
      failed: { label: 'Başarısız', variant: 'destructive', color: 'bg-red-500' }
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary', color: 'bg-gray-500' };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getDeliveryBadge = (order) => {
    const delivery = order.delivery;
    const verification = order.verification;

    if (!delivery) {
      return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-gray-500">Bilinmiyor</span>;
    }

    if (delivery.status === 'delivered') {
      return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-green-500">✅ Teslim Edildi</span>;
    }

    // Check verification status
    if (verification?.required) {
      if (verification.status === 'pending' && !verification.submittedAt) {
        return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-amber-500">🔐 Doğrulama Gerekli</span>;
      }
      if (verification.status === 'pending' && verification.submittedAt) {
        return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-blue-500">🔍 İnceleniyor</span>;
      }
      if (verification.status === 'rejected') {
        return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-red-500">❌ Reddedildi</span>;
      }
    }

    if (delivery.status === 'verification_pending' || delivery.status === 'verification_required') {
      return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-amber-500">🔐 Doğrulama Bekleniyor</span>;
    }

    if (delivery.status === 'pending') {
      return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-yellow-500">⏳ Stok Bekleniyor</span>;
    }

    return <span className="px-2 py-1 rounded text-xs font-semibold text-white bg-gray-500">{delivery.status}</span>;
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    toast.success('Çıkış yapıldı');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Siparişlerim</h1>
              {userData && (
                <p className="text-sm text-gray-400 mt-1">
                  {userData.firstName} {userData.lastName} ({userData.email})
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Ana Sayfa
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-700 text-red-500 hover:bg-red-900/20"
              >
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-white mb-2">Henüz sipariş yok</h2>
            <p className="text-gray-400 mb-6">İlk siparişinizi vermek için ana sayfaya dönün</p>
            <Button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              Alışverişe Başla
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => router.push(`/account/orders/${order.id}`)}
                className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.01]"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">
                        {order.productSnapshot?.title || order.productTitle || 'Ürün'}
                      </h3>
                      {getStatusBadge(order.status)}
                      {getDeliveryBadge(order)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-400">
                      <div>
                        <span className="text-gray-500">Sipariş No:</span>{' '}
                        <span className="font-mono text-gray-300">{order.id?.substring(0, 12) || 'N/A'}...</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Oyuncu ID:</span>{' '}
                        <span className="text-gray-300">{order.playerId || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Oyuncu:</span>{' '}
                        <span className="text-gray-300">{order.playerName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tarih:</span>{' '}
                        <span className="text-gray-300">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tutar:</span>{' '}
                        <span className="text-white font-semibold">₺{order.amount ? Number(order.amount).toFixed(2) : '0.00'}</span>
                      </div>
                    </div>

                    {order.delivery && order.delivery.status === 'pending' && order.delivery.message && (
                      <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>{order.delivery.message}</span>
                      </div>
                    )}

                    {/* Verification message for high-value orders - KIRMIZI UYARI */}
                    {order.verification?.required && order.verification?.status === 'pending' && !order.verification?.submittedAt && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-red-900/50 to-red-800/40 rounded-xl border-2 border-red-500 animate-pulse">
                        <div className="flex items-center gap-2 text-red-400 font-bold text-base mb-2">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>⚠️ DOĞRULAMA GEREKİYOR!</span>
                        </div>
                        <p className="text-red-300 text-sm font-medium">
                          👉 Siparişe tıklayın, aşağı kaydırın ve kimlik doğrulaması yapın.
                        </p>
                        <p className="text-red-200/70 text-xs mt-2">
                          Doğrulama yapılmadan siparişiniz tamamlanamaz.
                        </p>
                      </div>
                    )}

                    {order.verification?.required && order.verification?.status === 'pending' && order.verification?.submittedAt && (
                      <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>Belgeleriniz inceleniyor. En kısa sürede sonuçlandırılacak.</span>
                      </div>
                    )}

                    {order.verification?.status === 'rejected' && (
                      <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Doğrulama reddedildi. Detaylar için tıklayın.</span>
                      </div>
                    )}

                    {order.delivery && order.delivery.status === 'delivered' && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-900/40 to-green-800/30 rounded-xl border-2 border-green-500/50">
                        <div className="flex items-center gap-2 text-green-400 font-bold text-base mb-3">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>✅ KODUNUZ HAZIR!</span>
                        </div>
                        
                        {/* Show codes directly in the list */}
                        {order.delivery.items && Array.isArray(order.delivery.items) && order.delivery.items.length > 0 && (
                          <div className="space-y-2">
                            {order.delivery.items.map((code, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-gray-900/60 rounded-lg p-3 border border-green-600/30">
                                <span className="text-green-300 text-xs font-medium">KOD {idx + 1}:</span>
                                <code className="flex-1 text-white font-mono text-lg tracking-wider bg-black/30 px-3 py-1 rounded select-all">
                                  {code}
                                </code>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(code);
                                    toast.success('Kod kopyalandı!');
                                  }}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors"
                                >
                                  KOPYALA
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-green-200/70 text-xs mt-3">
                          💡 Kodu nasıl kullanacağınızı görmek için tıklayın
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
