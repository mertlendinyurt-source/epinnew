'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    fetchSiteSettings();
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch('/api/site-settings');
      const data = await res.json();
      if (data.success) setSiteSettings(data.data);
    } catch (e) {}
  };

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`/api/account/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Kod kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#12151a] flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-md w-full">
        <div className="bg-[#1e2229] rounded-2xl border border-white/10 p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarılı!</h1>
          <p className="text-white/60 mb-6">Siparişiniz başarıyla tamamlandı.</p>
          
          {loading ? (
            <div className="animate-pulse bg-white/10 h-24 rounded-lg mb-6"></div>
          ) : order?.delivery?.items?.length > 0 ? (
            <div className="bg-[#12151a] rounded-xl p-4 mb-6">
              <p className="text-sm text-white/60 mb-3">Kodunuz:</p>
              {order.delivery.items.map((code, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3 mb-2">
                  <code className="text-green-400 font-mono text-lg">{code}</code>
                  <button onClick={() => copyCode(code)} className="p-2 hover:bg-white/10 rounded-lg">
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-white/60" />}
                  </button>
                </div>
              ))}
            </div>
          ) : order?.delivery?.status === 'pending' ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
              <Package className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-yellow-500 text-sm">Kodunuz hazırlanıyor.</p>
            </div>
          ) : null}
          
          {order && (
            <div className="text-left bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Sipariş No:</span>
                <span className="text-white font-mono">{order.id?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Ürün:</span>
                <span className="text-white">{order.productSnapshot?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Tutar:</span>
                <span className="text-green-400 font-bold">{order.amount} ₺</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <Link href="/account/orders">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
                Siparişlerime Git <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#12151a] flex items-center justify-center"><div className="text-white">Yükleniyor...</div></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
