'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Headphones, Mail, Save, Send, Loader2, Eye, EyeOff, Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

const statusConfig = {
  sent: { label: 'Gönderildi', color: 'text-green-400', icon: Check },
  failed: { label: 'Başarısız', color: 'text-red-400', icon: X },
  test: { label: 'Test', color: 'text-blue-400', icon: Send }
};

export default function EmailSettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  
  const [settings, setSettings] = useState({
    enableEmail: false,
    fromName: '',
    fromEmail: '',
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    testRecipientEmail: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchSettings()
    fetchLogs()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/email/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Ayarlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/email/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/email/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('E-posta ayarları kaydedildi')
      } else {
        toast.error(data.error || 'Kaydetme başarısız')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings.testRecipientEmail) {
      toast.error('Test alıcı e-posta adresi giriniz')
      return
    }

    setTesting(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.message || 'Test e-postası gönderildi')
        fetchLogs() // Refresh logs
      } else {
        toast.error(data.error || 'Test e-postası gönderilemedi')
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setTesting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-center" richColors />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-bold text-white">
            UC
          </div>
          <div>
            <div className="text-white font-bold">PUBG UC</div>
            <div className="text-slate-400 text-xs">Admin Panel</div>
          </div>
        </div>

        <nav className="space-y-2">
          <Button
            onClick={() => router.push('/admin/dashboard')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            onClick={() => router.push('/admin/orders')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Siparişler
          </Button>
          <Button
            onClick={() => router.push('/admin/products')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Package className="w-4 h-4 mr-2" />
            Ürünler
          </Button>
          <Button
            onClick={() => router.push('/admin/support')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Headphones className="w-4 h-4 mr-2" />
            Destek
          </Button>
          <Button
            onClick={() => router.push('/admin/settings/email')}
            className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            E-posta Ayarları
          </Button>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">E-posta Ayarları</h1>
          <p className="text-slate-400">SMTP yapılandırması ve e-posta bildirim ayarları</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <Label className="text-white font-medium">E-posta Gönderimini Aktifleştir</Label>
                <p className="text-slate-400 text-sm mt-1">Kapalı olduğunda hiçbir e-posta gönderilmez</p>
              </div>
              <Switch
                checked={settings.enableEmail}
                onCheckedChange={(checked) => setSettings({ ...settings, enableEmail: checked })}
              />
            </div>

            {/* From Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Gönderen Adı</Label>
                <Input
                  value={settings.fromName}
                  onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                  placeholder="PUBG UC Store"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Gönderen E-posta</Label>
                <Input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                  placeholder="noreply@example.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* SMTP Settings */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-white font-medium mb-4">SMTP Ayarları</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">SMTP Host</Label>
                    <Input
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">SMTP Port</Label>
                    <Input
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                      placeholder="587"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <Switch
                    checked={settings.smtpSecure}
                    onCheckedChange={(checked) => setSettings({ ...settings, smtpSecure: checked })}
                  />
                  <div>
                    <Label className="text-white">SSL/TLS Kullan</Label>
                    <p className="text-slate-400 text-xs">Port 465 için aktif edin</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">SMTP Kullanıcı Adı</Label>
                  <Input
                    value={settings.smtpUser}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">SMTP Şifre</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={settings.smtpPass}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      placeholder="••••••••"
                      className="bg-slate-800 border-slate-700 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs">Gmail için App Password kullanın</p>
                </div>
              </div>
            </div>

            {/* Test Email */}
            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-white font-medium mb-4">Test E-postası</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Test Alıcı E-posta</Label>
                  <Input
                    type="email"
                    value={settings.testRecipientEmail}
                    onChange={(e) => setSettings({ ...settings, testRecipientEmail: e.target.value })}
                    placeholder="test@example.com"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <Button
                  onClick={handleTestEmail}
                  disabled={testing || !settings.enableEmail}
                  variant="outline"
                  className="w-full border-slate-700 text-slate-300 hover:text-white"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Test E-postası Gönder
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Ayarları Kaydet
                </>
              )}
            </Button>
          </div>

          {/* Email Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-medium">E-posta Logları</h3>
              <Button
                onClick={fetchLogs}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                Yenile
              </Button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Henüz e-posta logu yok</p>
                </div>
              ) : (
                logs.map((log) => {
                  const config = statusConfig[log.status] || statusConfig.sent;
                  const StatusIcon = config.icon;
                  
                  return (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusIcon className={`w-4 h-4 ${config.color}`} />
                            <span className={`text-sm font-medium ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-slate-500 text-xs">•</span>
                            <span className="text-slate-400 text-xs uppercase">
                              {log.type?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-white text-sm truncate">{log.to}</p>
                          {log.error && (
                            <p className="text-red-400 text-xs mt-1 truncate">{log.error}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="text-white font-medium mb-2">📧 Gönderilen E-postalar</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Hoş geldin (kayıt sonrası)</li>
              <li>• Sipariş oluşturuldu</li>
              <li>• Ödeme başarılı</li>
              <li>• Teslimat tamamlandı</li>
              <li>• Stok bekleniyor</li>
              <li>• Destek yanıtı</li>
              <li>• Şifre değiştirildi</li>
            </ul>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="text-white font-medium mb-2">🔒 Güvenlik</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• SMTP şifresi şifreli saklanır</li>
              <li>• Duplicate e-postalar engellenir</li>
              <li>• E-posta logları tutulur</li>
              <li>• Hata durumları kaydedilir</li>
            </ul>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h4 className="text-white font-medium mb-2">💡 İpuçları</h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• Gmail: App Password kullanın</li>
              <li>• Port 587: TLS (önerilen)</li>
              <li>• Port 465: SSL</li>
              <li>• Test ile doğrulayın</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
