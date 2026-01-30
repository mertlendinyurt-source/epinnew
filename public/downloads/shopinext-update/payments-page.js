'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [baseUrl, setBaseUrl] = useState('');

  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    mode: 'production'
  });

  useEffect(() => {
    checkAuth();
    loadSettings();
    // Get base URL for callback display
    setBaseUrl(window.location.origin);
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate fields
    if (!formData.apiKey || !formData.apiSecret) {
      toast('API Kullanıcı ve API Şifre alanlarını doldurun', 'error');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          mode: formData.mode
        })
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        toast('Shopier ayarları başarıyla kaydedildi!', 'success');
        setFormData({
          apiKey: '',
          apiSecret: '',
          mode: formData.mode
        });
        loadSettings();
      } else {
        toast(result.error || 'Kaydetme hatası', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast('Kaydetme hatası', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    router.push('/');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast('Panoya kopyalandı!', 'success');
  };

  const callbackUrl = `${baseUrl}/api/payments/shopier/callback`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-3 rounded-lg shadow-lg ${
            toastType === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">Ödeme Ayarları</h1>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Panel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Status Card */}
        {settings && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Mevcut Durum</h2>
            {settings.isConfigured ? (
              <div className="space-y-2 text-gray-300">
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Shopier entegrasyonu aktif
                </p>
                <p className="text-sm text-gray-400">
                  API Kullanıcı: <span className="font-mono">{settings.apiKey}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Mod: <span className="font-mono uppercase">{settings.mode}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Son güncelleme: {settings.updatedBy} - {new Date(settings.updatedAt).toLocaleString('tr-TR')}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                Shopier ayarları henüz yapılmadı. Ödeme sistemi pasif.
              </div>
            )}
          </div>
        )}

        {/* Callback URL Info - Important for Shopier Setup */}
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-orange-200 mb-2">Önemli: Shopier Ayarları</p>
              <p className="text-sm text-orange-200/80 mb-3">
                Shopier panelinde aşağıdaki ayarları yapmanız gerekiyor:
              </p>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-orange-300 mb-1">1. Kayıtlı Alan Adları:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900/50 px-3 py-2 rounded text-sm text-white font-mono break-all">
                      {baseUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(baseUrl)}
                      className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-orange-300 mb-1">2. Geri Dönüş URL (Callback):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900/50 px-3 py-2 rounded text-sm text-white font-mono break-all">
                      {callbackUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(callbackUrl)}
                      className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">
            Shopier API Ayarları
          </h2>

          {/* Security Notice */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">Güvenlik Notu:</p>
                <p>API bilgileriniz AES-256-GCM şifreleme ile korunmaktadır. Bu bilgiler veritabanında şifreli olarak saklanır ve asla düz metin olarak görüntülenmez.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* API Key (API Kullanıcı) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Kullanıcı (API Key) *
              </label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                placeholder="Örn: b3b942d4ab5177eadac91c92071faac1"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Shopier Ayarlar → API Erişimi → API KULLANICI
              </p>
            </div>

            {/* API Secret (API Şifre) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Şifre (API Secret) *
              </label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                placeholder="Örn: 2ac4af40496f84aa543f4f31e0124a02"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Shopier Ayarlar → API Erişimi → API ŞİFRE
              </p>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mod
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="production">Production (Canlı)</option>
                <option value="test">Test (Sandbox)</option>
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Shopier API Bilgilerini Nereden Alabilirim?
            </h3>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Shopier hesabınıza giriş yapın</li>
              <li><strong>Ayarlar → API Erişimi</strong> bölümüne gidin</li>
              <li>API KULLANICI ve API ŞİFRE bilgilerinizi kopyalayın</li>
              <li>Yukarıdaki formdaki ilgili alanlara yapıştırın</li>
              <li><strong>Önemli:</strong> Kayıtlı Alan Adları bölümüne sitenizin URL'sini ekleyin</li>
              <li><strong>Önemli:</strong> GERİ DÖNÜŞ URL alanına callback URL'yi ekleyin</li>
            </ol>
          </div>

          {/* Shopinext Link */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1">
                  Alternatif Ödeme Sistemi
                </h3>
                <p className="text-sm text-gray-400">
                  Shopinext ödeme sistemini de aktif edebilirsiniz
                </p>
              </div>
              <a
                href="/admin/settings/shopinext"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Shopinext Ayarları →
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
