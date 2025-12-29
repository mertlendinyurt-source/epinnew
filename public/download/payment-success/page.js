'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orderId) fetchOrder();
    else setLoading(false);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) { setLoading(false); return; }
      const res = await fetch(`/api/account/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOrder(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ background: '#1e2229', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', textAlign: 'center' }}>
          
          <div style={{ width: '80px', height: '80px', background: 'rgba(34,197,94,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Ödeme Başarılı!</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>Siparişiniz tamamlandı.</p>
          
          {loading ? (
            <div style={{ background: 'rgba(255,255,255,0.1)', height: '80px', borderRadius: '8px', marginBottom: '24px' }}></div>
          ) : order?.delivery?.items?.length > 0 ? (
            <div style={{ background: '#12151a', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '12px' }}>Kodunuz:</p>
              {order.delivery.items.map((code, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <code style={{ color: '#22c55e', fontFamily: 'monospace', fontSize: '16px' }}>{code}</code>
                  <button onClick={() => copyCode(code)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                    {copied ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : order?.delivery?.status === 'pending' ? (
            <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              <p style={{ color: '#eab308', fontSize: '14px' }}>Kodunuz hazırlanıyor.</p>
            </div>
          ) : null}
          
          {order && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Sipariş No:</span>
                <span style={{ color: 'white', fontFamily: 'monospace' }}>{order.id?.slice(0,8)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Ürün:</span>
                <span style={{ color: 'white' }}>{order.productSnapshot?.title || 'Ürün'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tutar:</span>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{order.amount} ₺</span>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/account/orders" style={{ display: 'block', background: 'linear-gradient(to right, #9333ea, #3b82f6)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
              Siparişlerime Git →
            </Link>
            <Link href="/" style={{ display: 'block', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Yükleniyor...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
