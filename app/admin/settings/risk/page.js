'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner'
import { 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  Save, 
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  LogOut,
  Phone,
  Mail,
  User,
  Globe,
  DollarSign,
  Ban,
  RefreshCw,
  FileText,
  ChevronRight,
  Home
} from 'lucide-react'

export default function RiskSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    isEnabled: true,
    isTestMode: false,
    thresholds: {
      cleanMax: 29,
      suspiciousMax: 59,
      riskyMin: 60
    },
    weights: {
      phoneEmpty: 40,
      phoneTRNotStartsWith5: 30,
      phoneInvalidLength: 20,
      phoneMultipleAccounts: 50,
      disposableEmail: 40,
      emailNotVerified: 20,
      accountAgeLess10Min: 30,
      accountAgeLess1Hour: 20,
      firstOrder: 10,
      fastCheckout: 20,
      emptyUserAgent: 20,
      multipleAccountsSameIP: 30,
      multipleOrdersSameIP1Hour: 40,
      amountOver300: 10,
      amountOver750: 20,
      amountOver1500: 35,
      firstOrderHighAmount: 25,
      blacklistHit: 100
    },
    hardBlocks: {
      invalidPhone: true,
      blacklistHit: true
    },
    suspiciousAutoApprove: false
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
      const response = await fetch('/api/admin/risk/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching risk settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/risk/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Risk ayarları kaydedildi')
      } else {
        toast.error(data.error || 'Ayarlar kaydedilemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleWeightChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: parseInt(value) || 0
      }
    }))
  }

  const handleThresholdChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: parseInt(value) || 0
      }
    }))
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            PINLY Admin
          </h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ShoppingCart className="w-4 h-4" />
            Siparişler
          </Link>
          <Link href="/admin/products" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Package className="w-4 h-4" />
            Ürünler
          </Link>
          <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Users className="w-4 h-4" />
            Kullanıcılar
          </Link>
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Güvenlik</p>
          </div>
          <Link href="/admin/settings/risk" className="flex items-center gap-2 px-4 py-2 text-white bg-slate-800 rounded-lg transition-colors">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            Risk Ayarları
          </Link>
          <Link href="/admin/blacklist" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Ban className="w-4 h-4" />
            Kara Liste
          </Link>
          <Link href="/admin/risk-logs" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <FileText className="w-4 h-4" />
            Risk Logları
          </Link>
          
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ayarlar</p>
          </div>
          <Link href="/admin/settings" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            Site Ayarları
          </Link>
        </nav>
        
        <Button variant="ghost" className="justify-start text-slate-400 hover:text-white mt-auto" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Link href="/admin" className="hover:text-white">Dashboard</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">Risk Ayarları</span>
            </div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-orange-500" />
              Risk Yönetimi
            </h1>
            <p className="text-slate-400 mt-1">Chargeback oranını düşürmek için risk kurallarını yapılandırın</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </>
            )}
          </Button>
        </div>

        {/* System Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Risk Sistemi</p>
                  <p className={`text-2xl font-bold ${settings.isEnabled ? 'text-green-500' : 'text-red-500'}`}>
                    {settings.isEnabled ? 'AKTİF' : 'PASİF'}
                  </p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Test Modu</p>
                  <p className={`text-2xl font-bold ${settings.isTestMode ? 'text-yellow-500' : 'text-slate-500'}`}>
                    {settings.isTestMode ? 'AKTİF' : 'PASİF'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {settings.isTestMode ? 'Skor üretir, teslimatı durdurmaz' : 'Riskli siparişler otomatik teslim edilmez'}
                  </p>
                </div>
                <Switch
                  checked={settings.isTestMode}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isTestMode: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Şüpheli Oto-Onay</p>
                  <p className={`text-2xl font-bold ${settings.suspiciousAutoApprove ? 'text-yellow-500' : 'text-green-500'}`}>
                    {settings.suspiciousAutoApprove ? 'AKTİF' : 'PASİF'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {settings.suspiciousAutoApprove ? 'Şüpheli siparişler otomatik teslim' : 'Şüpheli siparişler manuel onay'}
                  </p>
                </div>
                <Switch
                  checked={settings.suspiciousAutoApprove}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, suspiciousAutoApprove: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="thresholds" className="space-y-6">
          <TabsList className="bg-slate-800 p-1">
            <TabsTrigger value="thresholds" className="data-[state=active]:bg-slate-700">
              Risk Eşikleri
            </TabsTrigger>
            <TabsTrigger value="phone" className="data-[state=active]:bg-slate-700">
              📞 Telefon
            </TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-slate-700">
              📧 E-posta
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-slate-700">
              👤 Hesap
            </TabsTrigger>
            <TabsTrigger value="ip" className="data-[state=active]:bg-slate-700">
              🌍 IP & Cihaz
            </TabsTrigger>
            <TabsTrigger value="amount" className="data-[state=active]:bg-slate-700">
              💰 Tutar
            </TabsTrigger>
            <TabsTrigger value="hardblocks" className="data-[state=active]:bg-slate-700">
              🚫 Hard Block
            </TabsTrigger>
          </TabsList>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Risk Skor Eşikleri
                </CardTitle>
                <CardDescription>
                  Siparişlerin hangi skor aralığında hangi kategoriye gireceğini belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Clean */}
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-semibold text-green-400">TEMİZ</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Maksimum Skor</Label>
                      <Input
                        type="number"
                        value={settings.thresholds.cleanMax}
                        onChange={(e) => handleThresholdChange('cleanMax', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500">0 - {settings.thresholds.cleanMax} arası temiz</p>
                    </div>
                  </div>

                  {/* Suspicious */}
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="font-semibold text-yellow-400">ŞÜPHELİ</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Maksimum Skor</Label>
                      <Input
                        type="number"
                        value={settings.thresholds.suspiciousMax}
                        onChange={(e) => handleThresholdChange('suspiciousMax', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500">{settings.thresholds.cleanMax + 1} - {settings.thresholds.suspiciousMax} arası şüpheli</p>
                    </div>
                  </div>

                  {/* Risky */}
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-semibold text-red-400">RİSKLİ</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Minimum Skor</Label>
                      <Input
                        type="number"
                        value={settings.thresholds.riskyMin}
                        onChange={(e) => handleThresholdChange('riskyMin', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-500">{settings.thresholds.riskyMin}+ riskli</p>
                    </div>
                  </div>
                </div>

                {/* Visual Indicator */}
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-400 mb-3">Skor Skalası</p>
                  <div className="h-4 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ width: `${settings.thresholds.cleanMax}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-full" 
                      style={{ width: `${settings.thresholds.suspiciousMax - settings.thresholds.cleanMax}%` }}
                    ></div>
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ width: `${100 - settings.thresholds.suspiciousMax}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>0</span>
                    <span>{settings.thresholds.cleanMax}</span>
                    <span>{settings.thresholds.suspiciousMax}</span>
                    <span>100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phone Rules Tab */}
          <TabsContent value="phone">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-500" />
                  Telefon Kuralları
                </CardTitle>
                <CardDescription>
                  Telefon numarası ile ilgili risk kuralları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Telefon Boş</Label>
                    <Input
                      type="number"
                      value={settings.weights.phoneEmpty}
                      onChange={(e) => handleWeightChange('phoneEmpty', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Telefon numarası girilmemişse</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">TR Sipariş - 5 ile başlamıyor</Label>
                    <Input
                      type="number"
                      value={settings.weights.phoneTRNotStartsWith5}
                      onChange={(e) => handleWeightChange('phoneTRNotStartsWith5', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">TR siparişinde numara 5 ile başlamıyorsa</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Geçersiz Uzunluk</Label>
                    <Input
                      type="number"
                      value={settings.weights.phoneInvalidLength}
                      onChange={(e) => handleWeightChange('phoneInvalidLength', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Telefon uzunluğu 10-11 hane değilse</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Aynı Telefon - Çoklu Hesap</Label>
                    <Input
                      type="number"
                      value={settings.weights.phoneMultipleAccounts}
                      onChange={(e) => handleWeightChange('phoneMultipleAccounts', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Aynı telefonla 2+ hesap varsa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Rules Tab */}
          <TabsContent value="email">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-500" />
                  E-posta Kuralları
                </CardTitle>
                <CardDescription>
                  E-posta adresi ile ilgili risk kuralları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Geçici E-posta</Label>
                    <Input
                      type="number"
                      value={settings.weights.disposableEmail}
                      onChange={(e) => handleWeightChange('disposableEmail', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">10minutemail, tempmail vb. kullanılırsa</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">E-posta Doğrulanmamış</Label>
                    <Input
                      type="number"
                      value={settings.weights.emailNotVerified}
                      onChange={(e) => handleWeightChange('emailNotVerified', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">E-posta adresi doğrulanmamışsa</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Geçici E-posta Listesi</p>
                      <p>Sistem yerleşik olarak 35+ geçici e-posta domain'i tanır. Kara Liste sayfasından özel domain'ler ekleyebilirsiniz.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Rules Tab */}
          <TabsContent value="account">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-green-500" />
                  Hesap & Davranış Kuralları
                </CardTitle>
                <CardDescription>
                  Hesap yaşı ve kullanıcı davranışı ile ilgili risk kuralları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Hesap Yaşı {"<"} 10 Dakika</Label>
                    <Input
                      type="number"
                      value={settings.weights.accountAgeLess10Min}
                      onChange={(e) => handleWeightChange('accountAgeLess10Min', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Çok yeni hesap</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Hesap Yaşı {"<"} 1 Saat</Label>
                    <Input
                      type="number"
                      value={settings.weights.accountAgeLess1Hour}
                      onChange={(e) => handleWeightChange('accountAgeLess1Hour', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Yeni hesap</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">İlk Sipariş</Label>
                    <Input
                      type="number"
                      value={settings.weights.firstOrder}
                      onChange={(e) => handleWeightChange('firstOrder', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Kullanıcının ilk siparişi</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Hızlı Checkout ({"<"} 30 sn)</Label>
                    <Input
                      type="number"
                      value={settings.weights.fastCheckout}
                      onChange={(e) => handleWeightChange('fastCheckout', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Girişten 30 saniye içinde ödeme</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IP & Device Rules Tab */}
          <TabsContent value="ip">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-500" />
                  IP & Cihaz Kuralları
                </CardTitle>
                <CardDescription>
                  IP adresi ve cihaz bilgisi ile ilgili risk kuralları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Şüpheli User-Agent</Label>
                    <Input
                      type="number"
                      value={settings.weights.emptyUserAgent}
                      onChange={(e) => handleWeightChange('emptyUserAgent', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">User-agent boş veya çok kısa</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Aynı IP - Çoklu Hesap</Label>
                    <Input
                      type="number"
                      value={settings.weights.multipleAccountsSameIP}
                      onChange={(e) => handleWeightChange('multipleAccountsSameIP', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Aynı IP'den 2+ hesap</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">Aynı IP - Çoklu Sipariş (1 saat)</Label>
                    <Input
                      type="number"
                      value={settings.weights.multipleOrdersSameIP1Hour}
                      onChange={(e) => handleWeightChange('multipleOrdersSameIP1Hour', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">Aynı IP'den 3+ sipariş (son 1 saat)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Amount Rules Tab */}
          <TabsContent value="amount">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  Tutar Bazlı Kurallar
                </CardTitle>
                <CardDescription>
                  Sipariş tutarı ile ilgili risk kuralları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">₺300+ Sipariş</Label>
                    <Input
                      type="number"
                      value={settings.weights.amountOver300}
                      onChange={(e) => handleWeightChange('amountOver300', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">300 TL ve üzeri siparişler</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">₺750+ Sipariş</Label>
                    <Input
                      type="number"
                      value={settings.weights.amountOver750}
                      onChange={(e) => handleWeightChange('amountOver750', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">750 TL ve üzeri siparişler</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">₺1500+ Sipariş</Label>
                    <Input
                      type="number"
                      value={settings.weights.amountOver1500}
                      onChange={(e) => handleWeightChange('amountOver1500', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">1500 TL ve üzeri siparişler</p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                    <Label className="text-slate-300">İlk Sipariş + Yüksek Tutar</Label>
                    <Input
                      type="number"
                      value={settings.weights.firstOrderHighAmount}
                      onChange={(e) => handleWeightChange('firstOrderHighAmount', e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white"
                    />
                    <p className="text-xs text-slate-500">İlk siparişte 750 TL+ tutar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hard Blocks Tab */}
          <TabsContent value="hardblocks">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Ban className="w-5 h-5 text-red-500" />
                  Hard Block Kuralları
                </CardTitle>
                <CardDescription>
                  Bu kurallar aktif olduğunda sipariş tamamen engellenir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-200">
                      <p className="font-semibold mb-1">Dikkat!</p>
                      <p>Hard block kuralları aktif olduğunda, bu kurallara takılan kullanıcılar ödeme sayfasına geçemez ve sipariş oluşturamaz.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <Label className="text-white font-medium">Geçersiz Telefon</Label>
                      <p className="text-xs text-slate-500 mt-1">Format geçersiz telefon numaraları engellenir</p>
                    </div>
                    <Switch
                      checked={settings.hardBlocks?.invalidPhone || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        hardBlocks: { ...prev.hardBlocks, invalidPhone: checked }
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div>
                      <Label className="text-white font-medium">Kara Liste Eşleşmesi</Label>
                      <p className="text-xs text-slate-500 mt-1">Kara listedeki e-posta, telefon, IP, oyuncu ID</p>
                    </div>
                    <Switch
                      checked={settings.hardBlocks?.blacklistHit || false}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        hardBlocks: { ...prev.hardBlocks, blacklistHit: checked }
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-slate-800 rounded-lg">
                  <Label className="text-slate-300">Kara Liste Puan Eklentisi</Label>
                  <Input
                    type="number"
                    value={settings.weights.blacklistHit}
                    onChange={(e) => handleWeightChange('blacklistHit', e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">
                    Hard block kapalıysa, kara liste eşleşmesinde eklenecek puan
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
