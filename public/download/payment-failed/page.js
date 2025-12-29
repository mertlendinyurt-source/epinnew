'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const reason = searchParams.get('reason');

  const getMessage = () => {
    if (reason === 'order_not_found') return 'Sipariş bulunamadı.';
    if (reason === 'error') return 'Bir hata oluştu.';
    return 'Ödeme işlemi başarısız oldu.';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ background: '#1e2229', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', textAlign: 'center' }}>
          
          <div style={{ width: '80px', height: '80px', background: 'rgba(239,68,68,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Ödeme Başarısız</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>{getMessage()}</p>
          
          {orderId && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Sipariş No:</span>
                <span style={{ color: 'white', fontFamily: 'monospace' }}>{orderId.slice(0,8)}...</span>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/" style={{ display: 'block', background: 'linear-gradient(to right, #9333ea, #3b82f6)', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
              ↻ Tekrar Dene
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

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Yükleniyor...</div>}>
      <FailedContent />
    </Suspense>
  );
}
