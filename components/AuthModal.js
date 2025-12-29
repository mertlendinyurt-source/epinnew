'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AuthModal({ open, onClose, onSuccess, defaultTab = 'register' }) {
  const [tab, setTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  
  // Reset tab when modal opens with a new defaultTab
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      checkGoogleOAuth();
    }
  }, [open, defaultTab]);

  // Check if Google OAuth is enabled
  const checkGoogleOAuth = async () => {
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      if (data.success) {
        setGoogleEnabled(data.data.enabled);
      }
    } catch (error) {
      console.error('Error checking Google OAuth status:', error);
    }
  };
  
  // Register form
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // Login form
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleGoogleLogin = () => {
    if (!googleEnabled) {
      toast.error('Google ile giriş şu an aktif değil. Admin panelden PINLY OAuth ayarlarını etkinleştirin.');
      return;
    }
    setGoogleLoading(true);
    // Redirect to Google OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!registerForm.firstName || !registerForm.lastName || !registerForm.email || 
        !registerForm.phone || !registerForm.password) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: registerForm.firstName,
          lastName: registerForm.lastName,
          email: registerForm.email,
          phone: registerForm.phone,
          password: registerForm.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save token
        localStorage.setItem('userToken', data.data.token);
        localStorage.setItem('userData', JSON.stringify(data.data.user));
        
        toast.success('Hesap oluşturuldu! Ödemeye devam edebilirsiniz.');
        
        // GA4 sign_up event
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'sign_up', { method: 'email' });
        }
        
        // Clear form
        setRegisterForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: ''
        });

        // Call success callback
        if (onSuccess) onSuccess(data.data);
        
        // Close modal
        onClose();
      } else {
        // Check if email exists
        if (data.code === 'EMAIL_EXISTS') {
          toast.error(data.error);
          setTab('login'); // Switch to login tab
        } else {
          toast.error(data.error || 'Kayıt başarısız');
        }
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginForm.email || !loginForm.password) {
      toast.error('E-posta ve şifre gereklidir');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save token
        localStorage.setItem('userToken', data.data.token);
        localStorage.setItem('userData', JSON.stringify(data.data.user));
        
        toast.success('Giriş başarılı!');
        
        // GA4 login event
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'login', { method: 'email' });
        }
        
        // Clear form
        setLoginForm({ email: '', password: '' });

        // Check if user is admin and redirect accordingly
        if (data.data.user.role === 'admin') {
          toast.success('Admin paneline yönlendiriliyorsunuz...');
          // Close modal first
          onClose();
          // Redirect to admin dashboard
          setTimeout(() => {
            window.location.href = '/admin/dashboard';
          }, 500);
          return;
        }

        // Call success callback for regular users
        if (onSuccess) onSuccess(data.data);
        
        // Close modal
        onClose();
      } else {
        // Check if this is a Google-only account
        if (data.code === 'GOOGLE_ONLY') {
          toast.error(data.error);
        } else if (data.code === 'ACCOUNT_SUSPENDED') {
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Giriş başarısız');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // Google Login Button Component
  const GoogleLoginButton = () => (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={googleLoading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-all duration-200 border border-gray-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {googleLoading ? (
        <svg className="animate-spin h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Google ile PINLY'ye giriş yap</span>
        </>
      )}
    </button>
  );

  // Divider Component
  const OrDivider = () => (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-700" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="px-3 bg-gray-900 text-gray-500">veya</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Sipariş Bilgileri</h2>
            <p className="text-sm text-gray-400">
              Ödeme işlemi için bu bilgiler zorunludur
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-700">
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === 'register'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Kayıt Ol
            </button>
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === 'login'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Giriş Yap
            </button>
          </div>

          {/* Register Form */}
          {tab === 'register' && (
            <div className="space-y-4">
              {/* Google Login Button - Always visible */}
              <GoogleLoginButton />
              <OrDivider />

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">Ad *</Label>
                    <Input
                      type="text"
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Adınız"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Soyad *</Label>
                    <Input
                      type="text"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Soyadınız"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">E-posta *</Label>
                  <Input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="ornek@email.com"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Telefon *</Label>
                  <Input
                    type="tel"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="5551234567"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Şifre *</Label>
                  <Input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="En az 6 karakter"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Şifre Tekrar *</Label>
                  <Input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
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
                  {loading ? 'İşleniyor...' : 'Hesap Oluştur ve Ödemeye Devam Et'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Hesabınız otomatik oluşturulacaktır
                </p>
              </form>
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <div className="space-y-4">
              {/* Google Login Button - Always visible */}
              <GoogleLoginButton />
              <OrDivider />

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-gray-300">E-posta</Label>
                  <Input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="ornek@email.com"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Şifre</Label>
                  <Input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Şifreniz"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap ve Devam Et'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Hesabınız yok mu? <button type="button" onClick={() => setTab('register')} className="text-blue-500">Kayıt Ol</button>
                </p>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
