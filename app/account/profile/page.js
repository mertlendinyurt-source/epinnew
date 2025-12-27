'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Phone, Save, Info } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('/api/account/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('userToken');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setProfile({
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          email: data.data.email || '',
          phone: data.data.phone || ''
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Profil bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/account/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Profil bilgileriniz güncellendi!');
        // Update local storage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        localStorage.setItem('userData', JSON.stringify({
          ...userData,
          firstName: profile.firstName,
          lastName: profile.lastName
        }));
      } else {
        toast.error(data.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-white/60">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Bilgileri</h1>
        <p className="text-white/50 mt-1">Kişisel bilgilerinizi görüntüleyin ve güncelleyin.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#1e2229] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
              {(profile.firstName?.[0] || profile.email?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {profile.firstName && profile.lastName 
                  ? `${profile.firstName} ${profile.lastName}` 
                  : profile.email?.split('@')[0] || 'Kullanıcı'}
              </h2>
              <p className="text-white/50">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Ad
              </Label>
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                placeholder="Adınız"
                className="bg-[#12151a] border-white/10 text-white placeholder:text-white/30 h-12"
              />
            </div>
            <div>
              <Label className="text-white/70 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Soyad
              </Label>
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                placeholder="Soyadınız"
                className="bg-[#12151a] border-white/10 text-white placeholder:text-white/30 h-12"
              />
            </div>
          </div>

          {/* Email (readonly) */}
          <div>
            <Label className="text-white/70 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              E-posta
            </Label>
            <Input
              value={profile.email}
              disabled
              className="bg-[#12151a] border-white/10 text-white/50 h-12 cursor-not-allowed"
            />
            <p className="text-xs text-white/30 mt-1">E-posta adresi değiştirilemez.</p>
          </div>

          {/* Phone */}
          <div>
            <Label className="text-white/70 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Telefon
            </Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="05XX XXX XX XX"
              className="bg-[#12151a] border-white/10 text-white placeholder:text-white/30 h-12"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium text-sm">Shopier için Zorunlu Bilgiler</p>
                <p className="text-blue-300/70 text-sm mt-1">
                  Ödeme işlemleri için ad, soyad ve telefon bilgilerinizi eksiksiz doldurun. Bu bilgiler sipariş tamamlama sırasında otomatik kullanılacaktır.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 h-11 px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
