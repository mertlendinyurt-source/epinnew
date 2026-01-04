'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Trash2, Star, Eye, EyeOff, Loader2, Search, ShoppingCart, Upload, Infinity, Package, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    discountPrice: '',
    imageUrl: '',
    legendaryMin: '',
    legendaryMax: '',
    level: '',
    rank: '',
    features: '',
    credentials: '',
    unlimited: true,
    order: ''
  })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  
  // Stock Dialog States
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [selectedAccountForStock, setSelectedAccountForStock] = useState(null)
  const [stockData, setStockData] = useState({ items: '', summary: null })
  const [stockLoading, setStockLoading] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/admin/accounts', {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setAccounts(data.data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Hesaplar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        title: account.title || '',
        description: account.description || '',
        price: account.price?.toString() || '',
        discountPrice: account.discountPrice?.toString() || '',
        imageUrl: account.imageUrl || '',
        legendaryMin: account.legendaryMin?.toString() || '',
        legendaryMax: account.legendaryMax?.toString() || '',
        level: account.level?.toString() || '',
        rank: account.rank || '',
        features: account.features?.join('\n') || '',
        credentials: account.credentials || '',
        unlimited: account.unlimited !== false,
        order: account.order?.toString() || ''
      })
    } else {
      setEditingAccount(null)
      setFormData({
        title: '',
        description: '',
        price: '',
        discountPrice: '',
        imageUrl: '',
        legendaryMin: '',
        legendaryMax: '',
        level: '',
        rank: '',
        features: '',
        credentials: '',
        unlimited: true,
        order: ''
      })
    }
    setModalOpen(true)
  }

  // Resim yükleme fonksiyonu
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı')
      return
    }

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('category', 'accounts')

      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      })

      const data = await response.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, imageUrl: data.data.url }))
        toast.success('Resim yüklendi')
      } else {
        toast.error(data.error || 'Resim yüklenemedi')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Resim yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title || !formData.price) {
      toast.error('Başlık ve fiyat zorunludur')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : parseFloat(formData.price),
        imageUrl: formData.imageUrl,
        legendaryMin: parseInt(formData.legendaryMin) || 0,
        legendaryMax: parseInt(formData.legendaryMax) || 0,
        level: parseInt(formData.level) || 0,
        rank: formData.rank,
        features: formData.features.split('\n').filter(f => f.trim()),
        credentials: formData.credentials,
        unlimited: formData.unlimited
      }

      const url = editingAccount 
        ? `/api/admin/accounts/${editingAccount.id}`
        : '/api/admin/accounts'
      
      const method = editingAccount ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingAccount ? 'Hesap güncellendi' : 'Hesap oluşturuldu')
        setModalOpen(false)
        fetchAccounts()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Error saving account:', error)
      toast.error('Kayıt sırasında hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (account) => {
    if (!confirm(`"${account.title}" hesabını silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Hesap silindi')
        fetchAccounts()
      } else {
        toast.error(data.error || 'Silme işlemi başarısız')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Silme sırasında hata oluştu')
    }
  }

  const handleToggleActive = async (account) => {
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ active: !account.active })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(account.active ? 'Hesap gizlendi' : 'Hesap yayınlandı')
        fetchAccounts()
      }
    } catch (error) {
      console.error('Error toggling account:', error)
    }
  }

  // ========== STOK YÖNETİMİ ==========
  const handleOpenStockDialog = async (account) => {
    setSelectedAccountForStock(account)
    setStockDialogOpen(true)
    setStockData({ items: '', summary: null })
    await fetchStock(account.id)
  }

  const fetchStock = async (accountId) => {
    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/stock`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      if (data.success) {
        setStockData(prev => ({ ...prev, summary: data.data.summary }))
      }
    } catch (error) {
      console.error('Error fetching stock:', error)
    }
  }

  const handleAddStock = async () => {
    if (!stockData.items.trim()) {
      toast.error('Lütfen en az bir hesap bilgisi girin')
      return
    }

    const items = stockData.items.split('\n').filter(line => line.trim())
    
    if (items.length === 0) {
      toast.error('Geçerli hesap bilgisi bulunamadı')
      return
    }

    setStockLoading(true)
    try {
      const response = await fetch(`/api/admin/accounts/${selectedAccountForStock.id}/stock`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || `${items.length} adet hesap bilgisi eklendi`)
        setStockData({ items: '', summary: null })
        await fetchStock(selectedAccountForStock.id)
        fetchAccounts() // Refresh accounts to update stock count
      } else {
        toast.error(data.error || 'Stok eklenemedi')
      }
    } catch (error) {
      console.error('Error adding stock:', error)
      toast.error('Stok eklenirken hata oluştu')
    } finally {
      setStockLoading(false)
    }
  }

  const filteredAccounts = accounts.filter(acc => 
    acc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusColors = {
    available: 'bg-green-500/20 text-green-400',
    reserved: 'bg-yellow-500/20 text-yellow-400',
    sold: 'bg-red-500/20 text-red-400'
  }

  const statusLabels = {
    available: 'Satışta',
    reserved: 'Rezerve',
    sold: 'Satıldı'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-purple-400" />
            Hesap Listesi
          </h1>
          <p className="text-slate-400 mt-1">PUBG Mobile hesaplarını yönetin</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-500">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Hesap Ekle
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Hesap ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Toplam Hesap</div>
          <div className="text-2xl font-bold text-white mt-1">{accounts.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Satışta</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {accounts.filter(a => a.active && a.status !== 'sold').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Toplam Stok</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {accounts.reduce((sum, a) => sum + (a.stockCount || 0), 0)}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Satılan</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {accounts.reduce((sum, a) => sum + (a.salesCount || 0), 0)}
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
          <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Henüz hesap eklenmemiş</p>
          <Button onClick={() => handleOpenModal()} className="mt-4 bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4 mr-2" />
            İlk Hesabı Ekle
          </Button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-4 text-slate-400 font-medium">Hesap</th>
                <th className="text-left p-4 text-slate-400 font-medium">Destansı</th>
                <th className="text-left p-4 text-slate-400 font-medium">Fiyat</th>
                <th className="text-left p-4 text-slate-400 font-medium">Stok</th>
                <th className="text-left p-4 text-slate-400 font-medium">Durum</th>
                <th className="text-right p-4 text-slate-400 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {account.imageUrl ? (
                        <img src={account.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                          <Star className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{account.title}</div>
                        <div className="text-slate-500 text-sm">{account.rank || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {account.legendaryMax > 0 ? (
                      <span className="text-yellow-400 font-medium">
                        {account.legendaryMin}-{account.legendaryMax}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-white font-medium">₺{account.discountPrice?.toFixed(2)}</div>
                    {account.discountPrice < account.price && (
                      <div className="text-slate-500 text-sm line-through">₺{account.price?.toFixed(2)}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {account.unlimited ? (
                        <span className="flex items-center gap-1 text-purple-400 font-medium">
                          <Infinity className="w-4 h-4" />
                          {account.stockCount || 0}
                        </span>
                      ) : (
                        <span className={`font-medium ${(account.stockCount || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {account.stockCount || 0}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenStockDialog(account)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2"
                      >
                        <Database className="w-3 h-3 mr-1" />
                        Stok
                      </Button>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[account.status] || statusColors.available}`}>
                      {statusLabels[account.status] || 'Satışta'}
                    </span>
                    {!account.active && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-slate-600/50 text-slate-400">
                        Gizli
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(account)}
                        className="text-slate-400 hover:text-white"
                        title={account.active ? 'Gizle' : 'Yayınla'}
                      >
                        {account.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(account)}
                        className="text-slate-400 hover:text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Management Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Stok Yönetimi</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedAccountForStock?.title} - Hesap bilgilerini yönetin
            </DialogDescription>
          </DialogHeader>

          {/* Stock Summary */}
          {stockData.summary && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-white mb-1">
                  {stockData.summary.total}
                </div>
                <div className="text-sm text-slate-400">Toplam</div>
              </div>
              <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {stockData.summary.available}
                </div>
                <div className="text-sm text-green-300">Mevcut</div>
              </div>
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {stockData.summary.assigned}
                </div>
                <div className="text-sm text-blue-300">Satılan</div>
              </div>
            </div>
          )}

          {/* Add Stock Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-2 block">
                Hesap Bilgisi Ekle (Her satıra bir hesap bilgisi)
              </Label>
              <textarea
                value={stockData.items}
                onChange={(e) => setStockData({ ...stockData, items: e.target.value })}
                placeholder="Örnek:&#10;Email: hesap1@mail.com | Şifre: sifre123&#10;Email: hesap2@mail.com | Şifre: sifre456&#10;Email: hesap3@mail.com | Şifre: sifre789"
                className="w-full h-40 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm resize-none"
              />
              <div className="text-xs text-slate-400 mt-2">
                {stockData.items.split('\n').filter(l => l.trim()).length} satır girildi
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setStockDialogOpen(false)}
                variant="outline"
                className="border-slate-700 text-white"
              >
                İptal
              </Button>
              <Button
                onClick={handleAddStock}
                disabled={stockLoading || !stockData.items.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {stockLoading ? 'Ekleniyor...' : 'Toplu Ekle'}
              </Button>
            </DialogFooter>
          </div>

          {/* Stock Information */}
          <div className="mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-200">
                <p className="font-semibold mb-1">Otomatik Teslimat:</p>
                <p>Eklenen hesap bilgileri, ödeme onaylandığında otomatik olarak müşteriye atanır. Her satır bir hesap bilgisi olarak kabul edilir.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Hesap Düzenle' : 'Yeni Hesap Ekle'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <Label className="text-slate-300">Başlık *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Örn: 50+ Destansı Skinli Premium Hesap"
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label className="text-slate-300">Hesap Görseli</Label>
              <div className="mt-2 space-y-3">
                {formData.imageUrl && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-slate-800">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Resim Yükle (PNG/JPG)
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">veya URL girin:</span>
                </div>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Price Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Fiyat (₺) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="1500"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">İndirimli Fiyat (₺)</Label>
                <Input
                  type="number"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountPrice: e.target.value }))}
                  placeholder="1200"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Order / Sıralama */}
            <div>
              <Label className="text-slate-300">Sıralama (Düşük numara üstte görünür)</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: e.target.value }))}
                placeholder="0"
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-1">Örn: 1, 2, 3... (Boş bırakılırsa otomatik sıralanır)</p>
            </div>

            {/* Unlimited Toggle */}
            <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Infinity className="w-5 h-5 text-purple-400" />
                <div>
                  <Label className="text-white font-medium">Sınırsız Satış</Label>
                  <p className="text-slate-400 text-sm">Stok bitene kadar satılabilir</p>
                </div>
              </div>
              <Switch
                checked={formData.unlimited}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, unlimited: checked }))}
              />
            </div>

            {/* Legendary Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Min Destansı Sayısı</Label>
                <Input
                  type="number"
                  value={formData.legendaryMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, legendaryMin: e.target.value }))}
                  placeholder="50"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Max Destansı Sayısı</Label>
                <Input
                  type="number"
                  value={formData.legendaryMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, legendaryMax: e.target.value }))}
                  placeholder="60"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Level & Rank */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Level</Label>
                <Input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                  placeholder="75"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Rank</Label>
                <Input
                  value={formData.rank}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                  placeholder="Crown"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="text-slate-300">Özellikler (her satıra bir tane)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Glacier M416&#10;Pharaoh X-Suit&#10;Maxed RP"
                rows={3}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-slate-300">Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Hesap hakkında detaylı açıklama..."
                rows={4}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Default Credentials (for non-stock sales) */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <Label className="text-amber-400 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Varsayılan Hesap Bilgisi (Stok yoksa kullanılır)
              </Label>
              <Textarea
                value={formData.credentials}
                onChange={(e) => setFormData(prev => ({ ...prev, credentials: e.target.value }))}
                placeholder="E-posta: xxx@xxx.com&#10;Şifre: xxxxxx&#10;..."
                rows={3}
                className="mt-2 bg-slate-800 border-slate-700 text-white font-mono text-sm"
              />
              <p className="text-amber-400/60 text-xs mt-2">
                Not: Stok eklerseniz, stoktan otomatik atama yapılır. Bu alan sadece stok yoksa kullanılır.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="text-slate-400">
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : editingAccount ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
