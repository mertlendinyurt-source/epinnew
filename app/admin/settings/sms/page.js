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
  const [customMessage, setCustomMessage] = useState('')
  const [sendingCustom, setSendingCustom] = useState(false)
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

  // Özel SMS Gönder
  const handleSendCustomSms = async () => {
    if (!testPhone) {
      toast.error('Telefon numarası girin')
      return
    }
    if (!customMessage.trim()) {
      toast.error('Mesaj içeriği girin')
      return
    }
    
    setSendingCustom(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/settings/sms/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          phone: testPhone,
          message: customMessage 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('SMS gönderildi!')
        setCustomMessage('')
        fetchLogs()
      } else {
        toast.error(data.error || 'SMS gönderilemedi')
      }
    } catch (error) {
      console.error('Custom SMS error:', error)
      toast.error('SMS gönderilemedi')
    } finally {
      setSendingCustom(false)
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
        return <Badge className="bg-green-500/20 text-green-400 text-xs whitespace-nowrap"><CheckCircle className="w-3 h-3 mr-1" /> Gönderildi</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 text-xs whitespace-nowrap"><XCircle className="w-3 h-3 mr-1" /> Başarısız</Badge>
      case 'error':
        return <Badge className="bg-orange-500/20 text-orange-400 text-xs whitespace-nowrap"><XCircle className="w-3 h-3 mr-1" /> Hata</Badge>
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 text-xs whitespace-nowrap"><Clock className="w-3 h-3 mr-1" /> Bekliyor</Badge>
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'payment_success':
        return <Badge variant="outline" className="text-blue-400 border-blue-400/30 text-xs">Ödeme</Badge>
      case 'delivery':
        return <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">Teslimat</Badge>
      case 'account_delivery':
        return <Badge variant="outline" className="text-purple-400 border-purple-400/30 text-xs">Hesap</Badge>
      case 'test':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs">Test</Badge>
      case 'abandoned_order':
        return <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-xs">Terk</Badge>
      case 'custom':
        return <Badge variant="outline" className="text-cyan-400 border-cyan-400/30 text-xs">custom</Badge>
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-400/30 text-xs">{type}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
            SMS Ayarları (NetGSM)
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Müşterilere SMS bildirimi gönderme ayarları</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700 w-full sm:w-auto">
          <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 flex-1 sm:flex-none text-xs sm:text-sm">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Ayarlar
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-slate-700 flex-1 sm:flex-none text-xs sm:text-sm">
            <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            SMS Geçmişi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {/* Ana Ayarlar */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                NetGSM Bağlantısı
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs md:text-sm">
                NetGSM hesap bilgilerinizi girin. <a href="https://www.netgsm.com.tr" target="_blank" className="text-blue-400 hover:underline">netgsm.com.tr</a>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white font-medium text-sm">SMS Sistemi</Label>
                  <p className="text-xs md:text-sm text-slate-400">SMS bildirimlerini aktif et</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Kullanıcı Kodu</Label>
                  <Input
                    value={settings.usercode}
                    onChange={(e) => setSettings({ ...settings, usercode: e.target.value })}
                    placeholder="NetGSM kullanıcı kodunuz"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Şifre</Label>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="text-slate-300 text-sm">Gönderici Adı (Başlık)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHeaders}
                    disabled={headersLoading || !settings.usercode}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 w-full sm:w-auto text-xs"
                  >
                    {headersLoading ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3 mr-1" />
                    )}
                    Başlıkları Sorgula
                  </Button>
                </div>
                
                {headers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={settings.msgheader}
                      onChange={(e) => setSettings({ ...settings, msgheader: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Başlık Seçin...</option>
                      {headers.map((header, idx) => (
                        <option key={idx} value={header}>{header}</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {headers.map((header, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className={`cursor-pointer text-xs ${settings.msgheader === header ? 'bg-green-500/20 text-green-400 border-green-500' : 'text-slate-400 border-slate-600 hover:border-slate-500'}`}
                          onClick={() => setSettings({ ...settings, msgheader: header })}
                        >
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Input
                    value={settings.msgheader}
                    onChange={(e) => setSettings({ ...settings, msgheader: e.target.value })}
                    placeholder="PINLY veya abone numaranız"
                    maxLength={11}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                )}
                <p className="text-xs text-slate-500">
                  {headers.length > 0 
                    ? `${headers.length} adet başlık bulundu. Birini seçin.`
                    : 'Maks 11 karakter.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bildirim Ayarları */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                <Send className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                Bildirim Ayarları
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs md:text-sm">
                Hangi durumlarda SMS gönderilsin?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between p-3 md:p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <Label className="text-white font-medium text-sm">Ödeme Başarılı</Label>
                  <p className="text-xs md:text-sm text-slate-400">Ödeme alındığında SMS gönder</p>
                </div>
                <Switch
                  checked={settings.sendOnPayment}
                  onCheckedChange={(checked) => setSettings({ ...settings, sendOnPayment: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Özel SMS Gönder */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                <Send className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                Özel SMS Gönder
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs md:text-sm">
                İstediğiniz numaraya istediğiniz mesajı gönderin
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Telefon Numarası</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="05xxxxxxxxx"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Mesaj İçeriği</Label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="SMS mesajınızı buraya yazın..."
                  rows={3}
                  maxLength={160}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-xs text-slate-500">{customMessage.length}/160 karakter</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  onClick={handleSendCustomSms} 
                  disabled={sendingCustom || !settings.enabled || !testPhone || !customMessage.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-sm"
                >
                  {sendingCustom ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  SMS Gönder
                </Button>
                <Button 
                  onClick={handleTest} 
                  disabled={testing || !settings.enabled || !testPhone}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-sm"
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test
                </Button>
              </div>
              {!settings.enabled && (
                <p className="text-xs md:text-sm text-orange-400">⚠️ SMS sistemini aktif edin ve önce kaydedin</p>
              )}
            </CardContent>
          </Card>

          {/* Kaydet Butonu */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
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

        <TabsContent value="logs" className="mt-4 md:mt-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-white text-base md:text-lg">SMS Geçmişi</CardTitle>
                <CardDescription className="text-slate-400 text-xs md:text-sm">
                  Gönderilen SMS'lerin listesi
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchLogs(1)}
                disabled={logsLoading}
                className="border-slate-700 w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </CardHeader>
            <CardContent className="p-0 md:p-6 md:pt-0">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 px-4">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Henüz SMS gönderilmemiş</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 md:p-4 space-y-2">
                      {/* Mobile: Stack layout */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-white font-mono text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{log.phone}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {getTypeBadge(log.type)}
                          {getStatusBadge(log.status)}
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-slate-400 line-clamp-2">{log.message}</p>
                      {log.error && (
                        <p className="text-xs text-red-400">{log.error}</p>
                      )}
                      <div className="text-right text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {logsPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(logsPagination.page - 1)}
                    disabled={logsPagination.page === 1 || logsLoading}
                    className="border-slate-700 text-xs"
                  >
                    Önceki
                  </Button>
                  <span className="flex items-center px-3 text-slate-400 text-xs">
                    {logsPagination.page} / {logsPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(logsPagination.page + 1)}
                    disabled={logsPagination.page === logsPagination.totalPages || logsLoading}
                    className="border-slate-700 text-xs"
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
