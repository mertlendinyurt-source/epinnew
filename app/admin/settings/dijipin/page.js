'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Save, 
  RefreshCw, 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Zap,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  ExternalLink
} from 'lucide-react'

export default function DijipinSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState({
    isEnabled: false,
    supportedProducts: ['60 UC', '325 UC']
  })
  const [balance, setBalance] = useState(null)
  const [balanceError, setBalanceError] = useState(null)
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    successfulOrders: 0,
    failedOrders: 0,
    pendingOrders: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchSettings()
    fetchBalance()
    fetchDijipinOrders()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/dijipin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Settings fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalance = async () => {
    setRefreshing(true)
    setBalanceError(null)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/dijipin/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      console.log('Balance API response:', data)
      
      if (data.success && data.data) {
        // data.data contains: { balance, currencyCode, customerName, email }
        setBalance(data.data)
      } else {
        setBalanceError(data.error || 'Bakiye alınamadı')
      }
    } catch (error) {
      console.error('Balance fetch error:', error)
      setBalanceError('Bağlantı hatası: ' + error.message)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchDijipinOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/dijipin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setOrders(data.data.orders || [])
        setStats(data.data.stats || stats)
      }
    } catch (error) {
      console.error('DijiPin orders fetch error:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/dijipin/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      const data = await res.json()
      if (data.success) {
        alert('Ayarlar kaydedildi!')
      } else {
        alert('Hata: ' + data.error)
      }
    } catch (error) {
      alert('Kaydetme hatası: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getBalanceStatus = () => {
    if (!balance) return 'unknown'
    if (balance.balance < 50) return 'critical'
    if (balance.balance < 150) return 'warning'
    return 'good'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-400" />
            DijiPin Entegrasyonu
          </h1>
          <p className="text-slate-400 mt-1">
            60 UC ve 325 UC için otomatik UC gönderimi
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Kaydet
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Bakiye Kartı */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className={`w-5 h-5 ${
                  getBalanceStatus() === 'good' ? 'text-green-400' :
                  getBalanceStatus() === 'warning' ? 'text-yellow-400' :
                  getBalanceStatus() === 'critical' ? 'text-red-400' : 'text-slate-400'
                }`} />
                <span className="text-sm text-slate-400">DijiPin Bakiye</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchBalance}
                disabled={refreshing}
                className="h-7 px-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {balanceError ? (
              <p className="text-red-400 text-sm">{balanceError}</p>
            ) : balance ? (
              <div>
                <p className={`text-2xl font-bold ${
                  getBalanceStatus() === 'good' ? 'text-green-400' :
                  getBalanceStatus() === 'warning' ? 'text-yellow-400' :
                  getBalanceStatus() === 'critical' ? 'text-red-400' : 'text-white'
                }`}>
                  {balance.balance?.toFixed(2)} {balance.currencyCode}
                </p>
                {getBalanceStatus() === 'critical' && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Bakiye kritik seviyede!
                  </p>
                )}
                {getBalanceStatus() === 'warning' && (
                  <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Bakiye azalıyor
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-500">Yükleniyor...</p>
            )}
          </CardContent>
        </Card>

        {/* Toplam Sipariş */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-slate-400">Toplam Sipariş</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
          </CardContent>
        </Card>

        {/* Başarılı */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-400">Başarılı</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.successfulOrders}</p>
          </CardContent>
        </Card>

        {/* Başarısız */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-slate-400">Başarısız</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.failedOrders}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ana Ayarlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genel Ayarlar */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Genel Ayarlar
            </CardTitle>
            <CardDescription>DijiPin entegrasyonunu yönetin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Aktif/Pasif Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
              <div>
                <p className="text-white font-medium">DijiPin Otomatik Gönderim</p>
                <p className="text-sm text-slate-400">
                  Stok yoksa DijiPin API ile UC gönder
                </p>
              </div>
              <Switch
                checked={settings.isEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, isEnabled: checked })}
              />
            </div>

            {/* Durum */}
            <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${settings.isEnabled ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-white">
                {settings.isEnabled ? 'Aktif' : 'Pasif'}
              </span>
              {settings.isEnabled && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Çalışıyor
                </Badge>
              )}
            </div>

            {/* Desteklenen Ürünler */}
            <div className="p-4 bg-slate-900 rounded-lg">
              <p className="text-white font-medium mb-3">Desteklenen Ürünler</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                  60 UC
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                  325 UC
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Diğer ürünler için manuel stok kullanılır
              </p>
            </div>

            {/* API Durumu */}
            <div className="p-4 bg-slate-900 rounded-lg">
              <p className="text-white font-medium mb-3">API Durumu</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">API URL</span>
                  <span className="text-white text-sm">dijipinapi.dijipin.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Token</span>
                  <Badge className={balance ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {balance ? 'Geçerli' : 'Kontrol Et'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nasıl Çalışır */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Nasıl Çalışır?
            </CardTitle>
            <CardDescription>Otomatik UC gönderim akışı</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Ödeme Onaylanır</p>
                  <p className="text-sm text-slate-400">Müşteri ödemeyi tamamlar</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Stok Kontrolü</p>
                  <p className="text-sm text-slate-400">Önce manuel stok kontrol edilir</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">DijiPin Devreye Girer</p>
                  <p className="text-sm text-slate-400">
                    Stok yoksa ve ürün 60/325 UC ise DijiPin API çağrılır
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold shrink-0">
                  4
                </div>
                <div>
                  <p className="text-white font-medium">UC Gönderilir</p>
                  <p className="text-sm text-slate-400">
                    Oyuncu ID'ye otomatik UC yüklenir
                  </p>
                </div>
              </div>
            </div>

            {/* Uyarı */}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium">Önemli</p>
                  <p className="text-sm text-yellow-400/80">
                    DijiPin bakiyenizin yeterli olduğundan emin olun. 
                    Yetersiz bakiyede sipariş "beklemede" kalır.
                  </p>
                </div>
              </div>
            </div>

            {/* DijiPin Link */}
            <a 
              href="https://dijipin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 p-3 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              DijiPin Paneline Git
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Son DijiPin Siparişleri */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Son DijiPin Siparişleri
          </CardTitle>
          <CardDescription>DijiPin üzerinden gönderilen UC'ler</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Henüz DijiPin siparişi yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Sipariş ID</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Ürün</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">PUBG ID</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">DijiPin Order</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Durum</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <span className="text-white font-mono text-sm">
                          {order.id?.slice(-8)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">{order.productTitle}</td>
                      <td className="py-3 px-4">
                        <span className="text-cyan-400 font-mono">{order.playerId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-yellow-400 font-mono text-sm">
                          {order.delivery?.dijipinOrderId || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {order.delivery?.status === 'delivered' ? (
                          <Badge className="bg-green-500/20 text-green-400">Teslim Edildi</Badge>
                        ) : order.delivery?.status === 'pending' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Beklemede</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400">Hata</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {order.delivery?.deliveredAt 
                          ? new Date(order.delivery.deliveredAt).toLocaleString('tr-TR')
                          : new Date(order.createdAt).toLocaleString('tr-TR')
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
