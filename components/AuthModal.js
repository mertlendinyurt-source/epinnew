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
  
  // Reset tab when modal opens with a new defaultTab
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
    }
  }, [open, defaultTab]);
  
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
        
        // Clear form
        setLoginForm({ email: '', password: '' });

        // Call success callback
        if (onSuccess) onSuccess(data.data);
        
        // Close modal
        onClose();
      } else {
        toast.error(data.error || 'Giriş başarısız');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

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
          )}

          {/* Login Form */}
          {tab === 'login' && (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
