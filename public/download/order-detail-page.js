'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Copy, Check, Eye, EyeOff, ArrowLeft, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId;
  
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showCodes, setShowCodes] = useState({});

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const fetchOrderDetail = async () => {
    const token = localStorage.getItem('userToken');
    
    if (!token) {
      toast.error('Lütfen giriş yapın');
      router.push('/');
      return;
    }

    try {
      const response = await fetch(`/api/account/orders/${orderId}`, {
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

      if (response.status === 404) {
        toast.error('Sipariş bulunamadı');
        router.push('/account/orders');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setOrder(data.data.order);
        setPayment(data.data.payment);
      } else {
        toast.error('Sipariş yüklenemedi');
        router.push('/account/orders');
      }
    } catch (error) {
      console.error('Fetch order error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    toast.success('Kod kopyalandı!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCodeVisibility = (index) => {
    setShowCodes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const maskCode = (code) => {
    if (code.length <= 4) return code;
    return code.substring(0, 4) + '•'.repeat(code.length - 4);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeliveryStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'pending': return <Clock className="w-6 h-6 text-yellow-400" />;
      default: return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-md border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/account/orders')}
              variant="ghost"
              className="text-white hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Sipariş Detayı</h1>
              <p className="text-sm text-gray-400">#{order.id?.substring(0, 12) || 'N/A'}...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Order Status Card */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Sipariş Durumu</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Ödeme Durumu</div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white ${getStatusColor(order.status)}`}>
                      {order.status === 'paid' ? '✓ Ödendi' : order.status === 'pending' ? '⏳ Bekliyor' : '✗ Başarısız'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Teslimat Durumu</div>
                  <div className="flex items-center gap-2">
                    {order.delivery ? (
                      <>
                        {getDeliveryStatusIcon(order.delivery.status)}
                        <span className="text-white font-medium">
                          {order.delivery.status === 'delivered' ? 'Teslim Edildi' : 'Stok Bekleniyor'}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">Bekleniyor</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Sipariş Tarihi: <span className="text-white">{order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Player Info Card */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Oyuncu Bilgileri</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Oyuncu ID</span>
                  <span className="text-white font-mono">{order.playerId || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-700">
                  <span className="text-gray-400">Oyuncu Adı</span>
                  <span className="text-white font-semibold">{order.playerName || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Delivery Items - CODES */}
            {order.delivery && order.delivery.status === 'delivered' && order.delivery.items && order.delivery.items.length > 0 && (
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-green-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold text-white">Teslimat Kodları</h2>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4 mb-4 border border-green-700/30">
                  <p className="text-sm text-green-200">
                    🎉 UC kodunuz hazır! Aşağıdaki kodu PUBG Mobile içinde kullanabilirsiniz.
                  </p>
                </div>

                <div className="space-y-3">
                  {order.delivery.items.map((code, index) => (
                    <div key={index} className="bg-gray-900/70 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-400 mb-1">Kod {index + 1}</div>
                          <div className="font-mono text-lg text-white break-all">
                            {showCodes[index] ? code : maskCode(code)}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => toggleCodeVisibility(index)}
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                            title={showCodes[index] ? 'Gizle' : 'Göster'}
                          >
                            {showCodes[index] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </Button>
                          
                          <Button
                            onClick={() => handleCopyCode(code, index)}
                            variant="ghost"
                            size="icon"
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                            title="Kopyala"
                          >
                            {copiedCode === index ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-400">
                  Teslim tarihi: {order.delivery?.assignedAt ? new Date(order.delivery.assignedAt).toLocaleString('tr-TR') : 'N/A'}
                </div>
              </div>
            )}

            {/* Pending Stock Warning */}
            {order.delivery && order.delivery.status === 'pending' && (
              <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-xl font-bold text-white">Teslimat Bekliyor</h2>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4 border border-yellow-700/30">
                  <p className="text-yellow-200 mb-2">
                    {order.delivery.message || 'Stok bekleniyor'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Ürün stoka girdiğinde kodunuz otomatik olarak bu sayfada görünecektir. E-posta ile de bilgilendirileceksiniz.
                  </p>
                </div>
              </div>
            )}

            {/* Customer Info */}
            {order.customer && (
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">Müşteri Bilgileri</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">Ad Soyad</span>
                    <span className="text-white">{order.customer.firstName} {order.customer.lastName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-700">
                    <span className="text-gray-400">E-posta</span>
                    <span className="text-white">{order.customer.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-700">
                    <span className="text-gray-400">Telefon</span>
                    <span className="text-white">{order.customer.phone}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Product Summary */}
          <div className="space-y-6">
            
            {/* Product Card */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-4">Ürün Özeti</h2>
              
              <div className="bg-gray-900/50 rounded-xl p-4 mb-4 border border-gray-700">
                <div className="text-2xl font-bold text-white mb-1">
                  {order.productSnapshot?.title || order.productTitle || 'Ürün'}
                </div>
                <div className="text-sm text-gray-400">
                  PUBG Mobile UC Paketi
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Ürün Fiyatı</span>
                  <span className="text-white font-mono">₺{order.amount ? Number(order.amount).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-700">
                  <span className="text-gray-400">Para Birimi</span>
                  <span className="text-white">{order.currency || 'TRY'}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 text-lg">Toplam</span>
                  <span className="text-3xl font-bold text-white">₺{order.amount ? Number(order.amount).toFixed(2) : '0.00'}</span>
                </div>
              </div>

              {payment && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">Ödeme Bilgileri</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sağlayıcı</span>
                      <span className="text-white capitalize">{payment.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">İşlem No</span>
                      <span className="text-white font-mono text-xs">{payment.providerTxnId?.substring(0, 12) || 'N/A'}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Doğrulama</span>
                      <span className="text-green-400">✓ Onaylı</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
