'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password)
    };
    return checks;
  };

  const passwordChecks = validatePassword(passwords.newPassword);
  const allChecksPassed = Object.values(passwordChecks).every(v => v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (!allChecksPassed) {
      toast.error('Şifre gereksinimleri karşılanmıyor');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('/api/account/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwords)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Şifreniz başarıyla güncellendi!');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Şifre güncellenemedi');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Güvenlik Ayarları</h1>
        <p className="text-white/50 mt-1">Hesabınızın güvenliğini yönetin.</p>
      </div>

      {/* Password Change Card */}
      <div className="bg-[#1e2229] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Şifre Değiştir</h2>
              <p className="text-white/50 text-sm">Hesabınızın şifresini güncelleyin.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Password */}
          <div>
            <Label className="text-white/70 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Mevcut Şifre
            </Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                placeholder="Mevcut şifrenizi girin"
                className="bg-[#12151a] border-white/10 text-white placeholder:text-white/30 h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <Label className="text-white/70 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Yeni Şifre
            </Label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                placeholder="Yeni şifrenizi girin"
                className="bg-[#12151a] border-white/10 text-white placeholder:text-white/30 h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            {passwords.newPassword && (
              <div className="mt-3 space-y-2">
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.length ? 'text-green-400' : 'text-white/50'}`}>
                  {passwordChecks.length ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>En az 8 karakter</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasLetter ? 'text-green-400' : 'text-white/50'}`}>
                  {passwordChecks.hasLetter ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>En az bir harf</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${passwordChecks.hasNumber ? 'text-green-400' : 'text-white/50'}`}>
                  {passwordChecks.hasNumber ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>En az bir rakam</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label className="text-white/70 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Yeni Şifre Tekrar
            </Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                placeholder="Yeni şifrenizi tekrar girin"
                className="bg-[#12151a] border-white/10 text-white placeholder:text-white/30 h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
              <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Şifreler eşleşmiyor
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button
              type="submit"
              disabled={saving || !allChecksPassed || passwords.newPassword !== passwords.confirmPassword}
              className="bg-purple-600 hover:bg-purple-700 h-11 px-6 disabled:opacity-50"
            >
              <Shield className="w-4 h-4 mr-2" />
              {saving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </Button>
          </div>
        </form>
      </div>

      {/* Security Tips */}
      <div className="bg-[#1e2229] rounded-xl border border-white/10 p-6">
        <h3 className="text-white font-semibold mb-4">🔒 Güvenlik Önerileri</h3>
        <ul className="space-y-2 text-white/60 text-sm">
          <li>• Şifrenizi kimseyle paylaşmayın</li>
          <li>• Düzenli aralıklarla şifrenizi değiştirin</li>
          <li>• Kolay tahmin edilebilir şifreler kullanmayın</li>
          <li>• Farklı siteler için farklı şifreler kullanın</li>
        </ul>
      </div>
    </div>
  );
}
