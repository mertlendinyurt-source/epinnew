'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const reason = searchParams.get('reason');
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch('/api/site-settings');
      const data = await res.json();
      if (data.success) setSiteSettings(data.data);
    } catch (e) {}
  };

  const getErrorMessage = () => {
    switch (reason) {
      case 'order_not_found': return 'Sipariş bulunamadı.';
      case 'error': return 'Bir hata oluştu.';
      default: return 'Ödeme işlemi başarısız oldu.';
    }
  };

  return (
    <div className="min-h-screen bg-[#12151a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1e2229] rounded-2xl border border-white/10 p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarısız</h1>
          <p className="text-white/60 mb-6">{getErrorMessage()}</p>
          
          {orderId && (
            <div className="bg-white/5 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Sipariş No:</span>
                <span className="text-white font-mono">{orderId.slice(0, 8)}...</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
                <RefreshCw className="w-4 h-4 mr-2" /> Tekrar Dene
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                <Home className="w-4 h-4 mr-2" /> Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#12151a] flex items-center justify-center"><div className="text-white">Yükleniyor...</div></div>}>
      <PaymentFailedContent />
    </Suspense>
  );
}
