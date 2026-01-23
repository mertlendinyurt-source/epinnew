'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Upload, Image as ImageIcon, Globe, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export default function SiteSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    logo: null,
    favicon: null,
    heroImage: null,
    valorantHeroImage: null,
    categoryIcon: null,
    siteName: '',
    metaTitle: '',
    metaDescription: '',
    contactEmail: '',
    contactPhone: '',
    dailyBannerEnabled: true,
    dailyBannerTitle: 'Bugüne Özel Fiyatlar',
    dailyBannerSubtitle: '',
    dailyBannerIcon: 'fire',
    dailyCountdownEnabled: true,
    dailyCountdownLabel: 'Kampanya bitimine'
  });
  const [uploads, setUploads] = useState({ logo: null, favicon: null, heroImage: null, valorantHeroImage: null, categoryIcon: null });
  const [previews, setPreviews] = useState({ logo: null, favicon: null, heroImage: null, valorantHeroImage: null, categoryIcon: null });

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/site', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
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
      console.error('Load error:', error);
      toast.error('Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2097152) {
      toast.error('Maksimum dosya boyutu 2MB');
      return;
    }

    setUploads({ ...uploads, [type]: file });
    const reader = new FileReader();
    reader.onloadend = () => setPreviews({ ...previews, [type]: reader.result });
    reader.readAsDataURL(file);
  };

  const handleUploadAndSave = async (type) => {
    if (!uploads[type]) return;
    setSaving(true);

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const fd = new FormData();
      fd.append('file', uploads[type]);
      fd.append('category', type);

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        toast.error(uploadData.error || 'Yükleme hatası');
        return;
      }

      const newSettings = { ...settings, [type]: uploadData.data.url };
      const settingsRes = await fetch('/api/admin/settings/site', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(newSettings);
        setUploads({ ...uploads, [type]: null });
        toast.success('Görsel güncellendi!');
      } else {
        toast.error(settingsData.error || 'Kaydetme hatası');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings.siteName || settings.siteName.trim().length === 0) {
      toast.error('Site adı boş olamaz');
      return;
    }

    if (settings.metaTitle && settings.metaTitle.length > 70) {
      toast.error('META başlık en fazla 70 karakter olabilir');
      return;
    }

    if (settings.metaDescription && settings.metaDescription.length > 160) {
      toast.error('META açıklama en fazla 160 karakter olabilir');
      return;
    }

    if (settings.contactEmail && settings.contactEmail.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.contactEmail)) {
        toast.error('Geçersiz e-posta adresi');
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/site', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Site ayarları kaydedildi!');
      } else {
        toast.error(data.error || 'Kaydetme hatası');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Globe className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
          Site Ayarları
        </h1>
        <p className="text-slate-400 text-sm md:text-base">Site adı, SEO bilgileri ve iletişim ayarları</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Column - Text Settings */}
        <div className="space-y-6">
          {/* Site Name & SEO */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm md:text-base">
              <Globe className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              Site Bilgileri
            </h3>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Site Adı *</Label>
              <Input
                value={settings.siteName || ''}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                placeholder="PreSatis"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-slate-500 text-xs">Eğer logo yüklüyse header'da logo görünür, yoksa bu isim gösterilir</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center justify-between text-sm">
                <span>META Başlık (Title)</span>
                <span className={`text-xs ${(settings.metaTitle?.length || 0) > 70 ? 'text-red-400' : 'text-slate-500'}`}>
                  {settings.metaTitle?.length || 0}/70
                </span>
              </Label>
              <Input
                value={settings.metaTitle || ''}
                onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })}
                placeholder="Dijital Platform Hizmetleri | PreSatis"
                className="bg-slate-800 border-slate-700 text-white"
                maxLength={70}
              />
              <p className="text-slate-500 text-xs">Tarayıcı sekmesinde ve arama sonuçlarında görünür</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center justify-between text-sm">
                <span>META Açıklama</span>
                <span className={`text-xs ${(settings.metaDescription?.length || 0) > 160 ? 'text-red-400' : 'text-slate-500'}`}>
                  {settings.metaDescription?.length || 0}/160
                </span>
              </Label>
              <textarea
                value={settings.metaDescription || ''}
                onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
                placeholder="PreSatis, dijital platformlara yönelik online hizmetler sunar..."
                className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none resize-none text-sm"
                rows={3}
                maxLength={160}
              />
              <p className="text-slate-500 text-xs">Google arama sonuçlarında site açıklaması olarak görünür</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm md:text-base">
              <Phone className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              İletişim Bilgileri
            </h3>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Telefon Numarası</Label>
              <Input
                value={settings.contactPhone || ''}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                placeholder="555 555 55 55"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">E-posta Adresi</Label>
              <Input
                type="email"
                value={settings.contactEmail || ''}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                placeholder="iletisim@presatis.com"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Daily Banner Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm md:text-base">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              Günlük Banner
            </h3>

            <div className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium text-sm">Banner Aktif</Label>
                <p className="text-slate-400 text-xs mt-1">Hero altında "Bugüne Özel Fiyatlar" banner'ı</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, dailyBannerEnabled: !settings.dailyBannerEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.dailyBannerEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.dailyBannerEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Banner Başlığı</Label>
              <Input
                value={settings.dailyBannerTitle || ''}
                onChange={(e) => setSettings({ ...settings, dailyBannerTitle: e.target.value })}
                placeholder="Bugüne Özel Fiyatlar"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={!settings.dailyBannerEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Alt Metin (Opsiyonel)</Label>
              <Input
                value={settings.dailyBannerSubtitle || ''}
                onChange={(e) => setSettings({ ...settings, dailyBannerSubtitle: e.target.value })}
                placeholder="Boş bırakılırsa bugünün tarihi gösterilir"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={!settings.dailyBannerEnabled}
              />
            </div>

            {/* Icon Selection - Mobile: 4 columns, scrollable */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Banner İkonu</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'fire', name: 'Ateş', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 23c-3.866 0-7-3.134-7-7 0-2.276 1.15-4.326 2.919-5.581C8.687 9.89 9.12 9.094 9.12 8.2c0-.894-.433-1.69-1.201-2.219C7.15 5.326 6 3.276 6 1c0-.55.45-1 1-1s1 .45 1 1c0 1.378.688 2.604 1.756 3.281C10.543 4.831 11 5.55 11 6.4c0 .85-.457 1.569-1.244 2.119C8.688 9.196 8 10.422 8 11.8c0 2.21 1.79 4 4 4s4-1.79 4-4c0-1.378-.688-2.604-1.756-3.281C13.457 7.969 13 7.25 13 6.4c0-.85.457-1.569 1.244-2.119C15.312 3.604 16 2.378 16 1c0-.55.45-1 1-1s1 .45 1 1c0 2.276-1.15 4.326-2.919 5.581-.768.55-1.201 1.346-1.201 2.219 0 .894.433 1.69 1.201 2.219C16.85 11.674 18 13.724 18 16c0 3.866-3.134 7-7 7h1z"/></svg> },
                  { id: 'bolt', name: 'Yıldırım', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
                  { id: 'star', name: 'Yıldız', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
                  { id: 'gift', name: 'Hediye', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg> },
                  { id: 'sparkles', name: 'Parıltı', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg> },
                  { id: 'tag', name: 'Etiket', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg> },
                  { id: 'percent', name: 'İndirim', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg> },
                  { id: 'clock', name: 'Saat', icon: <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, dailyBannerIcon: item.id })}
                    disabled={!settings.dailyBannerEnabled}
                    className={`p-2 md:p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      settings.dailyBannerIcon === item.id
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                    } ${!settings.dailyBannerEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {item.icon}
                    <span className="text-[10px] md:text-xs hidden sm:block">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Countdown Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm md:text-base">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Geri Sayım
            </h3>

            <div className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium text-sm">Geri Sayım Aktif</Label>
                <p className="text-slate-400 text-xs mt-1">Günün sonuna kadar sayaç gösterir</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, dailyCountdownEnabled: !settings.dailyCountdownEnabled })}
                disabled={!settings.dailyBannerEnabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.dailyCountdownEnabled && settings.dailyBannerEnabled ? 'bg-cyan-600' : 'bg-slate-700'} ${!settings.dailyBannerEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.dailyCountdownEnabled && settings.dailyBannerEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Sayaç Etiketi</Label>
              <Input
                value={settings.dailyCountdownLabel || ''}
                onChange={(e) => setSettings({ ...settings, dailyCountdownLabel: e.target.value })}
                placeholder="Kampanya bitimine"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={!settings.dailyBannerEnabled || !settings.dailyCountdownEnabled}
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 md:py-6"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Kaydet ve Uygula
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Image Uploads */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm md:text-base">
              <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              Site Görselleri
            </h3>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <UploadBox
                type="logo"
                title="Logo"
                description="Header'da görünür"
                uploads={uploads}
                previews={previews}
                handleFileSelect={handleFileSelect}
                handleUploadAndSave={handleUploadAndSave}
                saving={saving}
              />
              <UploadBox
                type="favicon"
                title="Favicon"
                description="Sekme ikonu"
                uploads={uploads}
                previews={previews}
                handleFileSelect={handleFileSelect}
                handleUploadAndSave={handleUploadAndSave}
                saving={saving}
              />
              <UploadBox
                type="categoryIcon"
                title="Kategori İkonu"
                description="Ürün ikonu"
                uploads={uploads}
                previews={previews}
                handleFileSelect={handleFileSelect}
                handleUploadAndSave={handleUploadAndSave}
                saving={saving}
              />
            </div>

            <div className="pt-4 border-t border-slate-800">
              <UploadBox
                type="heroImage"
                title="Hero Banner"
                description="Ana sayfa üst görseli"
                uploads={uploads}
                previews={previews}
                handleFileSelect={handleFileSelect}
                handleUploadAndSave={handleUploadAndSave}
                saving={saving}
                large
              />
            </div>
          </div>

          {/* SEO Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm md:text-base">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Google Önizleme
            </h3>
            <div className="bg-white rounded-lg p-3 md:p-4">
              <div className="text-blue-600 text-sm md:text-lg font-medium truncate">
                {settings.metaTitle || 'Site Başlığı'}
              </div>
              <div className="text-green-700 text-xs md:text-sm truncate">
                https://siteadresi.com
              </div>
              <div className="text-gray-600 text-xs md:text-sm mt-1 line-clamp-2">
                {settings.metaDescription || 'Site açıklaması buraya gelecek...'}
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-3">
              Bu önizleme, sitenizin Google arama sonuçlarında nasıl görüneceğini gösterir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadBox({ type, title, description, uploads, previews, handleFileSelect, handleUploadAndSave, saving, large }) {
  return (
    <div className={`${large ? '' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <Label className="text-white text-sm">{title}</Label>
          {description && <p className="text-slate-500 text-xs">{description}</p>}
        </div>
      </div>
      
      <div className={`bg-slate-800/50 rounded-lg p-2 md:p-3 ${large ? 'min-h-[80px] md:min-h-[120px]' : 'min-h-[60px] md:min-h-[80px]'} flex items-center justify-center mb-2`}>
        {previews[type] ? (
          <img 
            src={previews[type]} 
            alt={title}
            className={`${large ? 'max-h-[60px] md:max-h-[100px]' : 'max-h-[40px] md:max-h-[60px]'} max-w-full object-contain`}
          />
        ) : (
          <div className="text-slate-600 text-center">
            <ImageIcon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1" />
            <span className="text-xs">Görsel yok</span>
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, type)}
        className="hidden"
        id={`upload-${type}`}
      />
      
      <div className="flex gap-2">
        <label
          htmlFor={`upload-${type}`}
          className="flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-blue-500 text-slate-400 hover:text-blue-400 text-xs md:text-sm transition-colors"
        >
          <Upload className="w-3 h-3 md:w-4 md:h-4" />
          {uploads[type] ? 'Seçildi' : 'Seç'}
        </label>
        {uploads[type] && (
          <Button
            onClick={() => handleUploadAndSave(type)}
            disabled={saving}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
          >
            {saving ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : 'Yükle'}
          </Button>
        )}
      </div>
    </div>
  );
}
