'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function PubgContentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState({
    title: 'PUBG Mobile',
    description: '',
    defaultRating: 5.0,
    defaultReviewCount: 2008
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/content/pubg', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setContent(result.data);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('İçerik yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/content/pubg', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(content)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('İçerik kaydedildi!');
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
            <h1 className="text-2xl font-bold text-white">PUBG Mobile İçerik Yönetimi</h1>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Title & Rating Settings */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Genel Ayarlar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 block">Başlık</Label>
              <Input
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Varsayılan Puan (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={content.defaultRating}
                onChange={(e) => setContent({ ...content, defaultRating: parseFloat(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">Varsayılan Değerlendirme Sayısı</Label>
              <Input
                type="number"
                min="0"
                value={content.defaultReviewCount}
                onChange={(e) => setContent({ ...content, defaultReviewCount: parseInt(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mt-2">* Yorum yoksa varsayılan değerler gösterilir</p>
        </div>

        {/* Description */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Açıklama İçeriği (Markdown)</h2>
          
          <textarea
            value={content.description}
            onChange={(e) => setContent({ ...content, description: e.target.value })}
            className="w-full h-96 bg-slate-800 border border-slate-700 rounded-lg p-4 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="# Başlık\n\nParagraf metni...\n\n- Liste öğesi 1\n- Liste öğesi 2"
          />
          
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Markdown Kılavuzu</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
              <div>
                <code className="text-blue-400"># Başlık</code>
                <p>Ana başlık</p>
              </div>
              <div>
                <code className="text-blue-400">## Alt Başlık</code>
                <p>Alt başlık</p>
              </div>
              <div>
                <code className="text-blue-400">**kalın**</code>
                <p>Kalın metin</p>
              </div>
              <div>
                <code className="text-blue-400">- madde</code>
                <p>Liste öğesi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
