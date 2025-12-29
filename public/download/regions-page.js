'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Upload, Trash2, Plus, GripVertical, Globe, ArrowLeft } from 'lucide-react';

export default function RegionsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState([]);
  const [uploadingRegionId, setUploadingRegionId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/regions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setRegions(result.data);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Region verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e, regionId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1048576) {
      toast.error('Maksimum dosya boyutu 1MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir');
      return;
    }

    setUploadingRegionId(regionId);

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'flags');

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        toast.error(uploadData.error || 'Yükleme hatası');
        return;
      }

      // Update region with new flag URL
      setRegions(prev => prev.map(r => 
        r.id === regionId 
          ? { ...r, flagImageUrl: uploadData.data.url }
          : r
      ));
      
      toast.success('Bayrak yüklendi! Kaydetmeyi unutmayın.');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Yükleme hatası');
    } finally {
      setUploadingRegionId(null);
    }
  };

  const handleRegionChange = (regionId, field, value) => {
    setRegions(prev => prev.map(r => 
      r.id === regionId 
        ? { ...r, [field]: value }
        : r
    ));
  };

  const handleRemoveFlag = (regionId) => {
    setRegions(prev => prev.map(r => 
      r.id === regionId 
        ? { ...r, flagImageUrl: null }
        : r
    ));
  };

  const handleAddRegion = () => {
    const newRegion = {
      id: `new-${Date.now()}`,
      code: '',
      name: '',
      enabled: true,
      flagImageUrl: null,
      sortOrder: regions.length + 1,
      isNew: true
    };
    setRegions([...regions, newRegion]);
  };

  const handleRemoveRegion = (regionId) => {
    setRegions(prev => prev.filter(r => r.id !== regionId));
  };

  const handleSave = async () => {
    // Validate
    for (const region of regions) {
      if (!region.code || !region.name) {
        toast.error('Tüm region\'lar için kod ve isim zorunludur');
        return;
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/regions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ regions })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Region ayarları kaydedildi!');
        // Reload to get fresh data with proper IDs
        setTimeout(() => loadRegions(), 500);
      } else {
        toast.error(result.error || 'Kaydetme hatası');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  // Fallback badge for regions without flag
  const FlagBadge = ({ code }) => {
    const colors = {
      'TR': 'bg-red-600',
      'GLOBAL': 'bg-blue-600',
      'DE': 'bg-yellow-500 text-black',
      'FR': 'bg-blue-500',
      'JP': 'bg-red-500',
    };
    return (
      <div className={`w-10 h-7 rounded flex items-center justify-center text-xs font-bold text-white ${colors[code] || 'bg-gray-600'}`}>
        {code === 'GLOBAL' ? <Globe className="w-4 h-4" /> : code?.substring(0, 2) || '?'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 py-4 px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/admin/dashboard')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Panel
            </Button>
            <h1 className="text-2xl font-bold text-white">Bölge Ayarları</h1>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50 border-b border-slate-700 text-sm font-semibold text-slate-400">
            <div className="col-span-1"></div>
            <div className="col-span-2">Bayrak</div>
            <div className="col-span-2">Kod</div>
            <div className="col-span-3">İsim</div>
            <div className="col-span-2">Durum</div>
            <div className="col-span-2">İşlemler</div>
          </div>

          {/* Regions List */}
          <div className="divide-y divide-slate-800">
            {regions.map((region, index) => (
              <div 
                key={region.id} 
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/30 transition-colors"
              >
                {/* Sort Handle */}
                <div className="col-span-1 flex items-center">
                  <GripVertical className="w-4 h-4 text-slate-600" />
                  <span className="ml-2 text-slate-500 text-sm">{index + 1}</span>
                </div>

                {/* Flag Preview & Upload */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    {region.flagImageUrl ? (
                      <div className="relative group">
                        <img 
                          src={region.flagImageUrl}
                          alt={region.name}
                          className="w-10 h-7 object-cover rounded border border-slate-700"
                        />
                        <button
                          onClick={() => handleRemoveFlag(region.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <FlagBadge code={region.code} />
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, region.id)}
                      className="hidden"
                      id={`flag-${region.id}`}
                    />
                    <label
                      htmlFor={`flag-${region.id}`}
                      className={`cursor-pointer p-1.5 rounded hover:bg-slate-700 transition-colors ${uploadingRegionId === region.id ? 'opacity-50' : ''}`}
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                    </label>
                  </div>
                </div>

                {/* Code */}
                <div className="col-span-2">
                  <Input
                    value={region.code}
                    onChange={(e) => handleRegionChange(region.id, 'code', e.target.value.toUpperCase())}
                    placeholder="TR"
                    className="bg-slate-800 border-slate-700 text-white h-9"
                    maxLength={10}
                  />
                </div>

                {/* Name */}
                <div className="col-span-3">
                  <Input
                    value={region.name}
                    onChange={(e) => handleRegionChange(region.id, 'name', e.target.value)}
                    placeholder="Türkiye"
                    className="bg-slate-800 border-slate-700 text-white h-9"
                  />
                </div>

                {/* Enabled Toggle */}
                <div className="col-span-2">
                  <button
                    onClick={() => handleRegionChange(region.id, 'enabled', !region.enabled)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      region.enabled 
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                        : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                    }`}
                  >
                    {region.enabled ? 'Aktif' : 'Pasif'}
                  </button>
                </div>

                {/* Actions */}
                <div className="col-span-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRegion(region.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Region */}
          <div className="px-6 py-4 border-t border-slate-800">
            <Button
              onClick={handleAddRegion}
              variant="outline"
              className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Bölge Ekle
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
          <h3 className="text-blue-400 font-semibold mb-2">💡 Bilgi</h3>
          <ul className="text-sm text-blue-300/80 space-y-1">
            <li>• Bayrak görselleri 1MB'dan küçük olmalıdır (önerilen: 40x28px veya 60x42px)</li>
            <li>• Bayrak yüklemezseniz, kod bazlı fallback badge gösterilir</li>
            <li>• Değişiklikleri kaydetmek için "Tümünü Kaydet" butonuna basın</li>
            <li>• Pasif region'lar müşteri filtresinde görünmez</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
