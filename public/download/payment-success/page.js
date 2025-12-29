'use client';

import dynamic from 'next/dynamic';

// Disable SSR completely to avoid hydration issues
const SuccessPageContent = dynamic(() => import('./SuccessContent'), { 
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', background: '#12151a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Yükleniyor...
    </div>
  )
});

export default function PaymentSuccessPage() {
  return <SuccessPageContent />;
}
