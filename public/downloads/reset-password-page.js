'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast, Toaster } from 'sonner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setValidatingToken(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
      const data = await response.json();
      setTokenValid(data.valid);
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (data.success) {
        setResetComplete(true);
        toast.success('Şifreniz başarıyla güncellendi!');
      } else {
        toast.error(data.error || 'Şifre sıfırlama başarısız');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validatingToken) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  // No token or invalid token
  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="w-full max-w-md bg-[#1e2229] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Geçersiz Link</h1>
          <p className="text-gray-400 mb-6">
            Bu şifre sıfırlama linki geçersiz veya süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebi oluşturun.
          </p>
          <a
            href="/?login=true"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
          >
            Giriş Sayfasına Git
          </a>
        </div>
      </div>
    );
  }

  // Reset complete
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="w-full max-w-md bg-[#1e2229] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Şifre Güncellendi!</h1>
          <p className="text-gray-400 mb-6">
            Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.
          </p>
          <a
            href="/?login=true"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
          >
            Giriş Yap
          </a>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-[#12151a] flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      <div className="w-full max-w-md bg-[#1e2229] rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Yeni Şifre Oluştur</h1>
          <p className="text-sm text-gray-400 mt-1">
            Hesabınız için yeni bir şifre belirleyin
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <Label className="text-gray-300">Yeni Şifre</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="En az 6 karakter"
              required
            />
          </div>

          <div>
            <Label className="text-gray-300">Şifre Tekrar</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Şifrenizi tekrar girin"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {loading ? 'Güncelleniyor...' : 'Şifremi Güncelle'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Yükleniyor...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
