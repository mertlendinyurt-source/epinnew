'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Upload, Image as ImageIcon, X, Check } from 'lucide-react';

export default function SiteSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  
  const [uploads, setUploads] = useState({
    logo: null,
    favicon: null,
    heroImage: null,
    categoryIcon: null
  });

  const [previews, setPreviews] = useState({
    logo: null,
    favicon: null,
    heroImage: null,
    categoryIcon: null
  });
    favicon: null,
    heroImage: null
  });

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/site', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setSettings(result.data);
        setPreviews({
          logo: result.data.logo,
          favicon: result.data.favicon,
          heroImage: result.data.heroImage,
          categoryIcon: result.data.categoryIcon
        });
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'dan büyük olamaz');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Geçersiz dosya tipi. JPG, PNG, SVG veya ICO kullanın');
      return;
    }

    setUploads({ ...uploads, [type]: file });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews({ ...previews, [type]: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndSave = async (type) => {
    const file = uploads[type];
    if (!file) {
      toast.error('Lütfen dosya seçin');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', type);

      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      // Debug: Log raw response
      console.log('Upload response status:', uploadResponse.status);
      console.log('Upload response headers:', uploadResponse.headers.get('content-type'));
      
      // Handle non-JSON responses
      const contentType = uploadResponse.headers.get('content-type');
      let uploadResult;
      
      if (contentType && contentType.includes('application/json')) {
        uploadResult = await uploadResponse.json();
      } else {
        const textResponse = await uploadResponse.text();
        console.error('Non-JSON response:', textResponse);
        toast.error('Sunucu beklenmeyen yanıt döndü');
        return;
      }

      console.log('Upload result:', uploadResult);

      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Upload başarısız');
        return;
      }

      // Update site settings
      const newSettings = {
        ...settings,
        [type]: uploadResult.data.url
      };

      const settingsResponse = await fetch('/api/admin/settings/site', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      const settingsResult = await settingsResponse.json();
      console.log('Settings result:', settingsResult);

      if (settingsResult.success) {
        setSettings(newSettings);
        setUploads({ ...uploads, [type]: null });
        toast.success(`${typeLabels[type]} başarıyla güncellendi!`);
        
        // Reload page to update favicon/logo
        if (type === 'favicon' || type === 'logo') {
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        toast.error('Ayarlar kaydedilemedi');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Yükleme hatası: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  const typeLabels = {
    logo: 'Logo',
    favicon: 'Favicon',
    heroImage: 'Hero Görseli'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-white">Site Ayarları</h1>
            <div className="flex gap-4">
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="outline"
                className="border-slate-700 text-white"
              >
                ← Panel
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-700 text-red-500"
              >
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Logo Upload */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <ImageIcon className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Logo (Header)</h2>
            </div>

            {previews.logo && (
              <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Mevcut / Önizleme:</p>
                <img 
                  src={previews.logo} 
                  alt="Logo" 
                  className="max-h-24 object-contain bg-white/5 p-2 rounded"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Yeni Logo Seç (PNG, SVG)</Label>
                <input
                  type="file"
                  accept="image/png,image/svg+xml"
                  onChange={(e) => handleFileSelect(e, 'logo')}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-800/70 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">
                    {uploads.logo ? uploads.logo.name : 'Dosya Seç veya Sürükle'}
                  </span>
                </label>
              </div>

              {uploads.logo && (
                <Button
                  onClick={() => handleUploadAndSave('logo')}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? 'Yükleniyor...' : 'Kaydet ve Uygula'}
                </Button>
              )}
            </div>
          </div>

          {/* Favicon Upload */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <ImageIcon className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Favicon</h2>
            </div>

            {previews.favicon && (
              <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Mevcut / Önizleme:</p>
                <img 
                  src={previews.favicon} 
                  alt="Favicon" 
                  className="w-16 h-16 object-contain bg-white/5 p-2 rounded"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Yeni Favicon Seç (PNG, ICO)</Label>
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                  onChange={(e) => handleFileSelect(e, 'favicon')}
                  className="hidden"
                  id="favicon-upload"
                />
                <label
                  htmlFor="favicon-upload"
                  className="mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-green-500 hover:bg-slate-800/70 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">
                    {uploads.favicon ? uploads.favicon.name : 'Dosya Seç veya Sürükle'}
                  </span>
                </label>
              </div>

              {uploads.favicon && (
                <Button
                  onClick={() => handleUploadAndSave('favicon')}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'Yükleniyor...' : 'Kaydet ve Uygula'}
                </Button>
              )}
            </div>
          </div>

          {/* Hero Image Upload */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <ImageIcon className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Hero / Banner Görseli</h2>
            </div>

            {previews.heroImage && (
              <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Mevcut / Önizleme:</p>
                <img 
                  src={previews.heroImage} 
                  alt="Hero" 
                  className="w-full max-h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Yeni Hero Görseli Seç (JPG, PNG)</Label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={(e) => handleFileSelect(e, 'heroImage')}
                  className="hidden"
                  id="hero-upload"
                />
                <label
                  htmlFor="hero-upload"
                  className="mt-2 flex items-center justify-center gap-2 px-4 py-8 bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-slate-800/70 transition-colors"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-slate-300">
                    {uploads.heroImage ? uploads.heroImage.name : 'Dosya Seç veya Sürükle (Önerilen: 1920x400px)'}
                  </span>
                </label>
              </div>

              {uploads.heroImage && (
                <Button
                  onClick={() => handleUploadAndSave('heroImage')}
                  disabled={saving}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? 'Yükleniyor...' : 'Kaydet ve Uygula'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-2">Medya Yönetimi Bilgileri:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Maksimum dosya boyutu: 2MB</li>
                <li>Logo: PNG veya SVG formatında yükleyin (şeffaf arka plan önerilir)</li>
                <li>Favicon: 32x32 veya 64x64 piksel ICO veya PNG</li>
                <li>Hero: 1920x400 piksel JPG veya PNG (desktop için optimize)</li>
                <li>Değişiklikler anında frontend'e yansır</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
