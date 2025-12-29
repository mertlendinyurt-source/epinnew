'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const [orderId, setOrderId] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get orderId from URL on client side only
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('orderId');
      setOrderId(id);
      if (id) {
        fetchOrder(id);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchOrder = async (id) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
      if (!token) { setLoading(false); return; }
      
      const res = await fetch('/api/account/orders/' + id, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data?.order || data.data || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    if (!code || typeof window === 'undefined') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't render anything on server
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Yükleniyor...
      </div>
    );
  }

  const deliveryItems = order?.delivery?.items && Array.isArray(order.delivery.items) ? order.delivery.items : [];

  return (
    <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ background: '#1e2229', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', textAlign: 'center' }}>
          
          <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <span style={{ fontSize: '40px', color: '#22c55e' }}>✓</span>
          </div>
          
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Ödeme Başarılı!</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>Siparişiniz tamamlandı.</p>
          
          {loading ? (
            <div style={{ background: 'rgba(255,255,255,0.1)', height: '80px', borderRadius: '8px', marginBottom: '24px', animation: 'pulse 2s infinite' }}></div>
          ) : deliveryItems.length > 0 ? (
            <div style={{ background: '#12151a', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '12px' }}>Kodunuz:</p>
              {deliveryItems.map((code, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <code style={{ color: '#22c55e', fontFamily: 'monospace', fontSize: '16px' }}>{code || 'N/A'}</code>
                  <button onClick={() => copyCode(code)} style={{ background: copied ? '#22c55e' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: '6px', color: 'white' }}>
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              ))}
            </div>
          ) : order?.delivery?.status === 'pending' ? (
            <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📦</span>
              <p style={{ color: '#eab308', fontSize: '14px', margin: 0 }}>Kodunuz hazırlanıyor.</p>
            </div>
          ) : null}
          
          {order && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Sipariş No:</span>
                <span style={{ color: 'white', fontFamily: 'monospace' }}>{order.id ? order.id.substring(0,8) : 'N/A'}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Ürün:</span>
                <span style={{ color: 'white' }}>{order.productSnapshot?.title || order.productTitle || 'Ürün'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tutar:</span>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{order.amount ? Number(order.amount).toFixed(2) : '0.00'} ₺</span>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/account/orders" style={{ display: 'block', background: 'linear-gradient(to right, #9333ea, #3b82f6)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500', textAlign: 'center' }}>
              Siparişlerime Git →
            </Link>
            <Link href="/" style={{ display: 'block', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500', textAlign: 'center' }}>
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
