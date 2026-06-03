'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle2, AlertTriangle, Info, Lock, Eye, EyeOff } from 'lucide-react';

export default function ShopierV2SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [baseUrl, setBaseUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showOsbKey, setShowOsbKey] = useState(false);

  const [formData, setFormData] = useState({
    apiKey: '',
    osbUsername: '',
    osbKey: '',
    referencePrefix: 'SV2',
    linkTtl: 900,
    closeDelay: 60
  });

  useEffect(() => {
    checkAuth();
    loadSettings();
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
      const response = await fetch('/api/admin/settings/shopierv2', {
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
    
    // Validate
    if (!formData.apiKey || !formData.osbUsername || !formData.osbKey) {
      toast('Tüm zorunlu alanları doldurun', 'error');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/shopierv2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        toast('Shopier V2 ayarları kaydedildi!', 'success');
        setFormData({
          apiKey: '',
          osbUsername: '',
          osbKey: '',
          referencePrefix: 'SV2',
          linkTtl: 900,
          closeDelay: 60
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast('Panoya kopyalandı!', 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    router.push('/');
  };

  const osbWebhookUrl = `${baseUrl}/api/payment/shopierv2/osb`;

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
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toastType === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {toastType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {toastMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Shopier V2 Ayarları</h1>
              <p className="text-sm text-gray-400 mt-1">Yeni nesil Shopier ödeme entegrasyonu</p>
            </div>
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
        {settings && settings.isConfigured && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <h2 className="text-lg font-semibold text-green-200">Shopier V2 Aktif</h2>
                <p className="text-sm text-green-300">Sistem ortam değişkenleri üzerinden yapılandırılmış</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Reference Prefix</p>
                <p className="font-mono text-green-400">{settings.referencePrefix}</p>
              </div>
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Link TTL</p>
                <p className="font-mono text-green-400">{settings.linkTtl}s ({Math.floor(settings.linkTtl / 60)} dk)</p>
              </div>
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Close Delay</p>
                <p className="font-mono text-green-400">{settings.closeDelay}s</p>
              </div>
              <div className="bg-gray-800/50 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">OSB Username</p>
                <p className="font-mono text-green-400">{settings.osbUsername?.substring(0, 8)}...</p>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-6">
          <div className="flex gap-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-200 mb-2">Shopier V2 Hakkında</p>
              <ul className="text-sm text-blue-200/80 space-y-2">
                <li>• <strong>Iframe Tabanlı Ödeme:</strong> Kullanıcı sitenizden ayrılmaz, ödeme iframe içinde yapılır</li>
                <li>• <strong>Gerçek Zamanlı Durum:</strong> Ödeme durumu her 4 saniyede bir otomatik kontrol edilir</li>
                <li>• <strong>OSB Webhook:</strong> Shopier, ödeme tamamlandığında anında bildirim gönderir</li>
                <li>• <strong>Güvenlik:</strong> HMAC-SHA256 imza doğrulama ile maksimum güvenlik</li>
              </ul>
            </div>
          </div>
        </div>

        {/* OSB Webhook URL */}
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-orange-200 mb-2">Önemli: Shopier V2 OSB Webhook Ayarı</p>
              <p className="text-sm text-orange-200/80 mb-3">
                Shopier V2 panelinde OSB Webhook URL'ini aşağıdaki adrese ayarlayın:
              </p>
              
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-900/50 px-4 py-3 rounded text-sm text-white font-mono break-all">
                  {osbWebhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(osbWebhookUrl)}
                  className="px-4 py-3 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Kopyala
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">
              Shopier V2 API Bilgileri
            </h2>
          </div>

          {/* Security Notice */}
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-200">
                <p className="font-semibold mb-1">Güvenlik ve Ortam Değişkenleri</p>
                <p>Bu form, <code className="bg-gray-800 px-2 py-0.5 rounded">/app/.env</code> dosyasındaki değişkenleri günceller. Değişiklikler kaydedildikten sonra sunucu otomatik yeniden başlar.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key (Bearer Token) *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm pr-12"
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Shopier V2 → Developer → API Keys → Bearer Token
              </p>
            </div>

            {/* OSB Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                OSB Username *
              </label>
              <input
                type="text"
                value={formData.osbUsername}
                onChange={(e) => setFormData({ ...formData, osbUsername: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                placeholder="232036e1107bf984cca1142d4f50a26b"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Shopier V2 → Developer → OSB Settings → Username
              </p>
            </div>

            {/* OSB Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                OSB Key (Secret Key) *
              </label>
              <div className="relative">
                <input
                  type={showOsbKey ? "text" : "password"}
                  value={formData.osbKey}
                  onChange={(e) => setFormData({ ...formData, osbKey: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm pr-12"
                  placeholder="b4bfe50c039d9a9935b0b77c565d0a2c"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOsbKey(!showOsbKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showOsbKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Shopier V2 → Developer → OSB Settings → Secret Key
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Gelişmiş Ayarlar</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Reference Prefix */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reference Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.referencePrefix}
                    onChange={(e) => setFormData({ ...formData, referencePrefix: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    placeholder="SV2"
                  />
                  <p className="text-xs text-gray-400 mt-1">Sipariş referans ön eki (örn: SV2-12345)</p>
                </div>

                {/* Link TTL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Link TTL (saniye)
                  </label>
                  <input
                    type="number"
                    value={formData.linkTtl}
                    onChange={(e) => setFormData({ ...formData, linkTtl: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    min="60"
                    max="3600"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ödeme linkinin geçerlilik süresi</p>
                </div>

                {/* Close Delay */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Close Delay (saniye)
                  </label>
                  <input
                    type="number"
                    value={formData.closeDelay}
                    onChange={(e) => setFormData({ ...formData, closeDelay: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors font-mono"
                    min="0"
                    max="300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Teslimat sonrası otomatik kapatma süresi</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? 'Kaydediliyor...' : '💾 Ayarları Kaydet ve Sunucuyu Yeniden Başlat'}
              </button>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              📚 Shopier V2 Kurulum Adımları
            </h3>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Shopier V2 hesabınıza giriş yapın</li>
              <li><strong>Developer → API Keys</strong> bölümünden Bearer Token'ı kopyalayın</li>
              <li><strong>Developer → OSB Settings</strong> bölümünden Username ve Secret Key'i kopyalayın</li>
              <li>Yukarıdaki forma bu bilgileri yapıştırın</li>
              <li><strong>OSB Webhook URL</strong>'yi Shopier panelinde ayarlayın (yukarıda belirtilen)</li>
              <li>Ayarları kaydedin - Sunucu otomatik yeniden başlayacak</li>
            </ol>
          </div>

          {/* Other Payment Systems */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1">
                  Diğer Ödeme Sistemleri
                </h3>
                <p className="text-sm text-gray-400">
                  Shopier V1 veya Shopinext ile de çalışabilirsiniz
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/admin/settings/payments"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Shopier V1
                </a>
                <a
                  href="/admin/settings/shopinext"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Shopinext
                </a>
              </div>
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
