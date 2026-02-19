'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PayyeenSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [settings, setSettings] = useState({
    apiKey: '',
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    checkAuth();
    fetchSettings();
    setBaseUrl(window.location.origin);
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/settings/payyeen', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setIsConfigured(data.data.isConfigured);
        setIsEnabled(data.data.isEnabled || false);
        if (data.data.isConfigured) {
          setSettings({
            apiKey: data.data.apiKey || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Payyeen settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.apiKey) {
      setMessage({ type: 'error', text: 'API Key zorunludur.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/settings/payyeen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          apiKey: settings.apiKey,
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Payyeen ayarları başarıyla kaydedildi!' });
        setIsConfigured(true);
        setIsEnabled(true);
        // Refresh settings
        fetchSettings();
      } else {
        setMessage({ type: 'error', text: data.error || 'Kayıt sırasında bir hata oluştu.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bağlantı hatası. Lütfen tekrar deneyin.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!isConfigured) {
      setMessage({ type: 'error', text: 'Önce Payyeen ayarlarını kaydedin.' });
      return;
    }

    setToggling(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/settings/payyeen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isEnabled: !isEnabled })
      });

      const data = await res.json();
      if (data.success) {
        setIsEnabled(!isEnabled);
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || 'İşlem başarısız.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bağlantı hatası.' });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-48"></div>
            <div className="h-64 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/dashboard" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
              ← Dashboard'a Dön
            </Link>
            <h1 className="text-2xl font-bold text-white">Payyeen Ödeme Ayarları</h1>
            <p className="text-slate-400 mt-1">Payyeen ödeme entegrasyonu yapılandırması</p>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            isConfigured && isEnabled
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : isConfigured
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {isConfigured && isEnabled ? 'Aktif' : isConfigured ? 'Pasif' : 'Yapılandırılmamış'}
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Toggle */}
        {isConfigured && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Ödeme Seçeneği Durumu</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Payyeen'i checkout sayfasında göster/gizle
                </p>
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  isEnabled ? 'bg-green-500' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white transform transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">API Ayarları</h2>
          
          <div className="space-y-5">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Payyeen API anahtarınızı girin"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-slate-500 text-xs mt-1.5">
                Payyeen panelinden Profil → API Ayarları bölümünden alabilirsiniz.
              </p>
            </div>

            {/* Callback URL Info */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-600 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Webhook URL (Bilgilendirme)</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Webhook Callback URL</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-800 rounded text-sm text-cyan-400 font-mono break-all">
                      {baseUrl}/api/payment/payyeen/callback
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${baseUrl}/api/payment/payyeen/callback`);
                        setMessage({ type: 'success', text: 'URL kopyalandı!' });
                        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
                      }}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm transition-colors whitespace-nowrap"
                    >
                      Kopyala
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-1.5">
                    Bu URL'yi Payyeen panelinde Profil → API Ayarları → Webhook URL kısmına yapıştırın.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Success URL (Otomatik)</label>
                  <code className="block px-3 py-2 bg-slate-800 rounded text-sm text-green-400 font-mono break-all">
                    {baseUrl}/payment/success?orderId=...
                  </code>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Cancel URL (Otomatik)</label>
                  <code className="block px-3 py-2 bg-slate-800 rounded text-sm text-red-400 font-mono break-all">
                    {baseUrl}/payment/failed?orderId=...
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
          <h3 className="text-blue-400 font-medium mb-2">Entegrasyon Bilgileri</h3>
          <ul className="text-blue-300/80 text-sm space-y-2">
            <li>• Payyeen Quick Checkout yöntemi kullanılmaktadır</li>
            <li>• Ödeme başarılı olduğunda müşteri otomatik olarak başarılı sayfasına yönlendirilir</li>
            <li>• Webhook callback ile sipariş durumu otomatik güncellenir</li>
            <li>• API anahtarı AES-256-GCM şifreleme ile güvenli olarak saklanır</li>
            <li>• Desteklenen kartlar: VISA, Mastercard, Troy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
