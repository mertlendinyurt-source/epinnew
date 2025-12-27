'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Upload, Image as ImageIcon } from 'lucide-react';

export default function SiteSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [uploads, setUploads] = useState({ logo: null, favicon: null, heroImage: null, categoryIcon: null });
  const [previews, setPreviews] = useState({ logo: null, favicon: null, heroImage: null, categoryIcon: null });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) router.push('/admin/login');
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/site', {
        headers: { 'Authorization': `Bearer ${token}` }
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
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2097152) {
      toast.error('Max 2MB');
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
      const token = localStorage.getItem('adminToken');
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
        toast.error(uploadData.error);
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
        toast.success('Guncellendi!');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      toast.error('Hata');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-white">Yuklem</div></div>;

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster />
      <div className="bg-slate-900 border-b border-slate-800 py-4 px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Site Ayarlari</h1>
          <Button onClick={() => router.push('/admin/dashboard')}>Panel</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-2 gap-6">
        <UploadBox type="logo" title="Logo" uploads={uploads} previews={previews} handleFileSelect={handleFileSelect} handleUploadAndSave={handleUploadAndSave} saving={saving} />
        <UploadBox type="favicon" title="Favicon" uploads={uploads} previews={previews} handleFileSelect={handleFileSelect} handleUploadAndSave={handleUploadAndSave} saving={saving} />
        <UploadBox type="categoryIcon" title="Kategori Ikonu (P)" uploads={uploads} previews={previews} handleFileSelect={handleFileSelect} handleUploadAndSave={handleUploadAndSave} saving={saving} />
        <div className="col-span-2">
          <UploadBox type="heroImage" title="Hero Banner" uploads={uploads} previews={previews} handleFileSelect={handleFileSelect} handleUploadAndSave={handleUploadAndSave} saving={saving} large />
        </div>
      </div>
    </div>
  );
}

function UploadBox({ type, title, uploads, previews, handleFileSelect, handleUploadAndSave, saving, large }) {
  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <h3 className="text-white font-bold mb-4">{title}</h3>
      {previews[type] && <img src={previews[type]} className={`mb-4 ${large ? 'h-40' : 'h-24'} object-contain bg-slate-800 p-2 rounded`} />}
      <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, type)} className="hidden" id={`up-${type}`} />
      <label htmlFor={`up-${type}`} className="block p-4 border-2 border-dashed border-slate-700 rounded cursor-pointer hover:border-blue-500 text-center text-slate-400">
        {uploads[type] ? uploads[type].name : 'Sec'}
      </label>
      {uploads[type] && <Button onClick={() => handleUploadAndSave(type)} disabled={saving} className="w-full mt-4 bg-blue-600">{saving ? 'Yukleniyor' : 'Kaydet'}</Button>}
    </div>
  );
}
