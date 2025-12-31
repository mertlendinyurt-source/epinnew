'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import { toast } from 'sonner'
import { 
  ArrowLeft,
  Zap,
  RefreshCw,
  Wallet,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'

export default function DijipinSettings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshingBalance, setRefreshingBalance] = useState(false)
  const [settings, setSettings] = useState({
    isEnabled: false,
    isConfigured: false,
    balance: null
  })

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/dijipin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('DijiPin ayarları yüklenemedi:', error)
      toast.error('DijiPin ayarları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const refreshBalance = async () => {
    setRefreshingBalance(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/dijipin/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(prev => ({ ...prev, balance: data.data.balance }))
        toast.success('Bakiye güncellendi')
      }
    } catch (error) {
      toast.error('Bakiye alınamadı')
    } finally {
      setRefreshingBalance(false)
    }
  }

  const toggleEnabled = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const newValue = !settings.isEnabled
      
      const response = await fetch('/api/admin/dijipin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: newValue })
      })
      
      const data = await response.json()
      if (data.success) {
        setSettings(prev => ({ ...prev, isEnabled: newValue }))
        toast.success(newValue ? 'DijiPin aktif edildi' : 'DijiPin devre dışı bırakıldı')
      } else {
        toast.error(data.error || 'Ayar güncellenemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/admin/dashboard')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="w-7 h-7 text-yellow-500" />
            DijiPin Entegrasyonu
          </h1>
          <p className="text-slate-400 mt-1">PUBG UC otomatik gönderim ayarları</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* API Durumu */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              API Durumu
            </CardTitle>
            <CardDescription>DijiPin API bağlantı durumu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                {settings.isConfigured ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="text-white">API Yapılandırması</span>
              </div>
              <Badge variant={settings.isConfigured ? "default" : "destructive"}>
                {settings.isConfigured ? 'Yapılandırıldı' : 'Yapılandırılmadı'}
              </Badge>
            </div>

            {/* Bakiye */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-green-500" />
                <span className="text-white">DijiPin Bakiyesi</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-green-400">
                  {settings.balance !== null ? `${settings.balance.toFixed(2)} ₺` : '---'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={refreshBalance}
                  disabled={refreshingBalance}
                  className="text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingBalance ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Otomatik Gönderim Ayarı */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Otomatik Gönderim
            </CardTitle>
            <CardDescription>
              Stok yoksa DijiPin üzerinden otomatik UC gönderimi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <div className="text-white font-medium">Otomatik Gönderim</div>
                <div className="text-slate-400 text-sm mt-1">
                  Stok yoksa DijiPin'den otomatik UC yükle
                </div>
              </div>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={toggleEnabled}
                disabled={saving || !settings.isConfigured}
              />
            </div>

            {!settings.isConfigured && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>DijiPin API yapılandırılmamış. .env dosyasına API bilgilerini ekleyin.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desteklenen Ürünler */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Desteklenen Ürünler
            </CardTitle>
            <CardDescription>
              Bu ürünler için stok yoksa otomatik DijiPin gönderimi yapılır
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">60</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">60 UC + 6 Bonus</div>
                    <div className="text-slate-400 text-xs">DijiPin ID: 1</div>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400">Aktif</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-sm">325</span>
                  </div>
                  <div>
                    <div className="text-white font-medium">325 UC + 33 Bonus</div>
                    <div className="text-slate-400 text-xs">DijiPin ID: 2</div>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400">Aktif</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nasıl Çalışır */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Nasıl Çalışır?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
                <p>Müşteri sipariş verir ve PUBG ID'sini girer</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
                <p>Ödeme onaylandığında sistem önce stokta kod var mı bakar</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
                <p><strong>Stok varsa:</strong> Kod müşteriye gönderilir</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">4</div>
                <p><strong>Stok yoksa:</strong> DijiPin'e sipariş gönderilir, UC otomatik yüklenir</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">5</div>
                <p>Sipariş "Teslim Edildi" olarak güncellenir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
