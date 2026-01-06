'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  Save, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  Phone,
  Send,
  Settings,
  History,
  RefreshCw,
  Search,
  List
} from 'lucide-react'
import { toast } from 'sonner'

export default function SmsSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPagination, setLogsPagination] = useState({ page: 1, totalPages: 1 })
  const [headers, setHeaders] = useState([])
  const [headersLoading, setHeadersLoading] = useState(false)
  
  const [settings, setSettings] = useState({
    enabled: false,
    usercode: '',
    password: '',
    msgheader: 'PINLY',
    sendOnPayment: true,
    sendOnDelivery: true
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
      const response = await fetch('/api/admin/settings/sms', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success && data.data) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Settings fetch error:', error)
      toast.error('Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (page = 1) => {
    try {
      setLogsLoading(true)
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/settings/sms/logs?page=${page}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success) {
        setLogs(data.data || [])
        setLogsPagination(data.pagination || { page: 1, totalPages: 1 })
      }
    } catch (error) {
      console.error('Logs fetch error:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/settings/sms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('SMS ayarları kaydedildi')
        if (data.data) {
          setSettings(data.data)
        }
      } else {
        toast.error(data.error || 'Ayarlar kaydedilemedi')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testPhone) {
      toast.error('Test için telefon numarası girin')
      return
    }
    
    setTesting(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/settings/sms/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: testPhone })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Test SMS\'i gönderildi!')
        fetchLogs()
      } else {
        toast.error(data.error || 'Test SMS\'i gönderilemedi')
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error('Test SMS\'i gönderilemedi')
    } finally {
      setTesting(false)
    }
  }

  // NetGSM'den mevcut başlıkları sorgula
  const fetchHeaders = async () => {
    setHeadersLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/settings/sms/headers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success) {
        setHeaders(data.data || [])
        toast.success(data.message || 'Başlıklar yüklendi')
      } else {
        toast.error(data.error || 'Başlıklar yüklenemedi')
        setHeaders([])
      }
    } catch (error) {
      console.error('Headers fetch error:', error)
      toast.error('Başlıklar yüklenemedi')
    } finally {
      setHeadersLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Gönderildi</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" /> Başarısız</Badge>
      case 'error':
        return <Badge className="bg-orange-500/20 text-orange-400"><XCircle className="w-3 h-3 mr-1" /> Hata</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400"><Clock className="w-3 h-3 mr-1" /> Bekliyor</Badge>
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'payment_success':
        return <Badge variant="outline" className="text-blue-400 border-blue-400/30">Ödeme</Badge>
      case 'delivery':
        return <Badge variant="outline" className="text-green-400 border-green-400/30">Teslimat</Badge>
      case 'account_delivery':
        return <Badge variant="outline" className="text-purple-400 border-purple-400/30">Hesap</Badge>
      case 'test':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">Test</Badge>
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-400/30">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-green-500" />
            SMS Ayarları (NetGSM)
          </h1>
          <p className="text-slate-400 mt-1">Müşterilere SMS bildirimi gönderme ayarları</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
            <Settings className="w-4 h-4 mr-2" />
            Ayarlar
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700">
            <History className="w-4 h-4 mr-2" />
            SMS Geçmişi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Ana Ayarlar */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-500" />
                NetGSM Bağlantısı
              </CardTitle>
              <CardDescription className="text-slate-400">
                NetGSM hesap bilgilerinizi girin. <a href="https://www.netgsm.com.tr" target="_blank" className="text-blue-400 hover:underline">netgsm.com.tr</a> adresinden hesap oluşturabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white font-medium">SMS Sistemi</Label>
                  <p className="text-sm text-slate-400">SMS bildirimlerini aktif et</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Kullanıcı Kodu</Label>
                  <Input
                    value={settings.usercode}
                    onChange={(e) => setSettings({ ...settings, usercode: e.target.value })}
                    placeholder="NetGSM kullanıcı kodunuz"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Şifre</Label>
                  <Input
                    type="password"
                    value={settings.password}
                    onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                    placeholder="NetGSM şifreniz"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Gönderici Adı (Başlık)</Label>
                <Input
                  value={settings.msgheader}
                  onChange={(e) => setSettings({ ...settings, msgheader: e.target.value })}
                  placeholder="PINLY"
                  maxLength={11}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">Maks 11 karakter. NetGSM panelinizde tanımlı olmalıdır.</p>
              </div>
            </CardContent>
          </Card>

          {/* Bildirim Ayarları */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" />
                Bildirim Ayarları
              </CardTitle>
              <CardDescription className="text-slate-400">
                Hangi durumlarda SMS gönderilsin?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white font-medium">Ödeme Başarılı</Label>
                  <p className="text-sm text-slate-400">Ödeme alındığında SMS gönder</p>
                </div>
                <Switch
                  checked={settings.sendOnPayment}
                  onCheckedChange={(checked) => setSettings({ ...settings, sendOnPayment: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test ve Kaydet */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TestTube className="w-5 h-5 text-yellow-500" />
                Test SMS Gönder
              </CardTitle>
              <CardDescription className="text-slate-400">
                Ayarlarınızı test etmek için bir SMS gönderin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="05xxxxxxxxx"
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                />
                <Button 
                  onClick={handleTest} 
                  disabled={testing || !settings.enabled}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Test Gönder
                </Button>
              </div>
              {!settings.enabled && (
                <p className="text-sm text-orange-400 mt-2">⚠️ SMS sistemini aktif edin ve önce kaydedin</p>
              )}
            </CardContent>
          </Card>

          {/* Kaydet Butonu */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Ayarları Kaydet
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">SMS Geçmişi</CardTitle>
                <CardDescription className="text-slate-400">
                  Gönderilen SMS'lerin listesi
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchLogs(1)}
                disabled={logsLoading}
                className="border-slate-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Henüz SMS gönderilmemiş</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-mono">{log.phone}</span>
                          {getTypeBadge(log.type)}
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-1">{log.message}</p>
                        {log.error && (
                          <p className="text-xs text-red-400 mt-1">{log.error}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {logsPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(logsPagination.page - 1)}
                    disabled={logsPagination.page === 1 || logsLoading}
                    className="border-slate-700"
                  >
                    Önceki
                  </Button>
                  <span className="flex items-center px-3 text-slate-400">
                    {logsPagination.page} / {logsPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(logsPagination.page + 1)}
                    disabled={logsPagination.page === logsPagination.totalPages || logsLoading}
                    className="border-slate-700"
                  >
                    Sonraki
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
