'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId;
  
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
      router.push('/');
      return;
    }

    try {
      const response = await fetch(`/api/account/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        router.push('/');
        return;
      }

      if (response.status === 404) {
        router.push('/account/orders');
        return;
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setOrder(data.data.order || data.data);
        setPayment(data.data.payment || null);
      } else {
        router.push('/account/orders');
      }
    } catch (error) {
      console.error('Fetch order error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code, index) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCodeVisibility = (index) => {
    setShowCodes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const maskCode = (code) => {
    if (!code) return '***';
    if (code.length <= 4) return code;
    return code.substring(0, 4) + '•'.repeat(code.length - 4);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Yükleniyor...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Sipariş bulunamadı</div>
      </div>
    );
  }

  const getStatusText = (status) => {
    if (status === 'paid') return '✓ Ödendi';
    if (status === 'pending') return '⏳ Bekliyor';
    if (status === 'failed') return '✗ Başarısız';
    return status || 'Bilinmiyor';
  };

  const getStatusColor = (status) => {
    if (status === 'paid') return '#22c55e';
    if (status === 'pending') return '#eab308';
    if (status === 'failed') return '#ef4444';
    return '#6b7280';
  };

  const deliveryItems = order.delivery && Array.isArray(order.delivery.items) ? order.delivery.items : [];
  const hasDeliveredItems = order.delivery && order.delivery.status === 'delivered' && deliveryItems.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#12151a', color: 'white' }}>
      {/* Header */}
      <div style={{ background: 'rgba(30,34,41,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/account/orders" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ← Geri
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Sipariş Detayı</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>#{order.id ? order.id.substring(0, 12) : 'N/A'}...</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Order Status */}
          <div style={{ background: '#1e2229', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📦 Sipariş Durumu</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#12151a', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Ödeme Durumu</div>
                <span style={{ background: getStatusColor(order.status), padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>
                  {getStatusText(order.status)}
                </span>
              </div>
              
              <div style={{ background: '#12151a', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Teslimat Durumu</div>
                <span style={{ color: hasDeliveredItems ? '#22c55e' : '#eab308' }}>
                  {hasDeliveredItems ? '✅ Teslim Edildi' : '⏳ Bekliyor'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              Sipariş Tarihi: <span style={{ color: 'white' }}>{order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : 'N/A'}</span>
            </div>
          </div>

          {/* Product Info */}
          <div style={{ background: '#1e2229', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>🛒 Ürün Bilgileri</h2>
            
            <div style={{ background: '#12151a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {order.productSnapshot?.title || order.productTitle || 'Ürün'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Tutar</span>
              <span style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '20px' }}>₺{order.amount ? Number(order.amount).toFixed(2) : '0.00'}</span>
            </div>
          </div>

          {/* Player Info */}
          <div style={{ background: '#1e2229', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>🎮 Oyuncu Bilgileri</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Oyuncu ID</span>
              <span style={{ fontFamily: 'monospace' }}>{order.playerId || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Oyuncu Adı</span>
              <span style={{ fontWeight: '600' }}>{order.playerName || 'N/A'}</span>
            </div>
          </div>

          {/* Delivery Codes */}
          {hasDeliveredItems && (
            <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))', borderRadius: '16px', padding: '24px', border: '2px solid rgba(34,197,94,0.5)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✅ Teslimat Kodları
              </h2>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#86efac', fontSize: '14px', margin: 0 }}>
                  🎉 Kodunuz hazır! Aşağıdaki kodu kullanabilirsiniz.
                </p>
              </div>

              {deliveryItems.map((code, index) => (
                <div key={index} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Kod {index + 1}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '18px', color: '#22c55e', wordBreak: 'break-all' }}>
                      {showCodes[index] ? code : maskCode(code)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleCodeVisibility(index)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: 'white' }}
                    >
                      {showCodes[index] ? '🙈' : '👁️'}
                    </button>
                    
                    <button
                      onClick={() => handleCopyCode(code, index)}
                      style={{ background: copiedCode === index ? '#22c55e' : 'rgba(34,197,94,0.3)', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: 'white' }}
                    >
                      {copiedCode === index ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending Stock */}
          {order.delivery && order.delivery.status === 'pending' && (
            <div style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(234,179,8,0.1))', borderRadius: '16px', padding: '24px', border: '2px solid rgba(234,179,8,0.5)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⏳ Teslimat Bekliyor
              </h2>
              <p style={{ color: '#fde047', marginBottom: '8px' }}>{order.delivery.message || 'Stok bekleniyor'}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Ürün stoka girdiğinde kodunuz bu sayfada görünecektir.
              </p>
            </div>
          )}

          {/* Back Button */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link href="/account/orders" style={{ display: 'inline-block', background: 'linear-gradient(to right, #9333ea, #3b82f6)', color: 'white', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
              ← Siparişlerime Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
