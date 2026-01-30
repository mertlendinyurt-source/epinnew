'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ShopinextSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [settings, setSettings] = useState({
    clientId: '',
    clientSecret: '',
    domain: '',
    ipAddress: '',
    mode: 'production'
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkAuth();
    fetchSettings();
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
      const res = await fetch('/api/admin/settings/shopinext', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setIsConfigured(data.data.isConfigured);
        setIsEnabled(data.data.isEnabled || false);
        if (data.data.isConfigured) {
          setSettings({
            clientId: data.data.clientId || '',
            clientSecret: '',  // Never sent from backend
            domain: data.data.domain || '',
            ipAddress: data.data.ipAddress || '',
            mode: data.data.mode || 'production'
          });
        }
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    setToggling(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/settings/shopinext/toggle', {
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
        setMessage({ 
          type: 'success', 
          text: !isEnabled ? 'Shopinext ödeme seçeneği aktifleştirildi!' : 'Shopinext ödeme seçeneği gizlendi!' 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'İşlem başarısız' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bağlantı hatası' });
    } finally {
      setToggling(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/settings/shopinext', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Shopinext ayarları başarıyla kaydedildi!' });
        setIsConfigured(true);
        // Clear secret fields after save
        setSettings(prev => ({ ...prev, clientSecret: '' }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Ayarlar kaydedilemedi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bağlantı hatası' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold">Shopinext Ödeme Ayarları</h1>
            </div>
            <div className="flex items-center space-x-2">
              {isConfigured ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  ✓ Yapılandırıldı
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  ⚠ Yapılandırılmadı
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Aktif/Pasif Toggle - EN ÜSTTE */}
        {isConfigured && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Ödeme Seçeneği Durumu</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {isEnabled 
                    ? 'Shopinext ödeme seçeneği checkout sayfasında görünüyor' 
                    : 'Shopinext ödeme seçeneği checkout sayfasında gizli'}
                </p>
              </div>
              <button
                onClick={handleToggleEnabled}
                disabled={toggling}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  isEnabled ? 'bg-purple-600' : 'bg-gray-600'
                } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
              isEnabled 
                ? 'bg-green-900/30 border border-green-700 text-green-400' 
                : 'bg-yellow-900/30 border border-yellow-700 text-yellow-400'
            }`}>
              {isEnabled 
                ? '✓ Aktif - Müşteriler Shopinext ile ödeme yapabilir' 
                : '⚠ Pasif - Shopinext ödeme seçeneği müşterilere gösterilmiyor'}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-blue-400 font-medium">Shopinext Entegrasyonu</h3>
              <p className="text-gray-300 text-sm mt-1">
                Shopinext API bilgilerinizi girin. Bu bilgileri <a href="https://api.shopinext.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Shopinext Paneli</a>'nden alabilirsiniz.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                Not: Dijital ürün satışı için is_digital parametresi otomatik olarak 1 gönderilir.
              </p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 border border-green-700 text-green-400' : 'bg-red-900/30 border border-red-700 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-700 pb-2">API Bilgileri</h2>
            
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                İstemci Kimliği (Client ID) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={settings.clientId}
                onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="7PezCfBH3xMKucCNZdr6V0J2IjmsggDy"
                required
              />
              <p className="text-gray-500 text-xs mt-1">Shopinext panelinden alınan client_id değeri</p>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                İstemci Gizli Anahtarı (Client Secret) <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={settings.clientSecret}
                onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder={isConfigured ? "••••••••••••••••" : "Gizli anahtarı girin"}
                required={!isConfigured}
              />
              <p className="text-gray-500 text-xs mt-1">
                {isConfigured ? "Değiştirmek için yeni değer girin" : "Shopinext panelinden alınan client_secret değeri"}
              </p>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Alan Adı (Domain) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={settings.domain}
                onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="pinly.com.tr"
                required
              />
              <p className="text-gray-500 text-xs mt-1">Shopinext'te tanımlı alan adı</p>
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                IP Adresi
              </label>
              <input
                type="text"
                value={settings.ipAddress}
                onChange={(e) => setSettings({ ...settings, ipAddress: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="31.186.11.43"
              />
              <p className="text-gray-500 text-xs mt-1">API isteklerinin yapılacağı sunucu IP adresi (opsiyonel)</p>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Çalışma Modu
              </label>
              <select
                value={settings.mode}
                onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="production">Production (Canlı)</option>
                <option value="test">Test (Geliştirme)</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                Test modu için apidev.shopinext.com, Production için api.shopinext.com kullanılır
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/settings/payments"
              className="text-gray-400 hover:text-white text-sm"
            >
              ← Shopier Ayarlarına Git
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <span>Ayarları Kaydet</span>
              )}
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Callback URL</h3>
          <p className="text-gray-400 text-sm mb-2">
            Shopinext panelinde aşağıdaki callback URL'yi tanımlayın:
          </p>
          <code className="block bg-gray-900 px-4 py-2 rounded text-green-400 text-sm">
            https://pinly.com.tr/api/payments/shopinext/callback
          </code>
          <p className="text-gray-500 text-xs mt-2">
            Bu URL, Shopinext'ten ödeme bildirimlerini alır ve siparişleri otomatik günceller.
          </p>
        </div>
      </div>
    </div>
  );
}
