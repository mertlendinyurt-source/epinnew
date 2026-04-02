'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export default function DailyDealsPage() {
  const router = useRouter()
  const [deals, setDeals] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [dealPrice, setDealPrice] = useState('')
  const [endTime, setEndTime] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/daily-deals', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDeals(data.data.deals || [])
        setProducts(data.data.products || [])
      }
    } catch (err) {
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedProduct || !dealPrice || !endTime) {
      toast.error('Tüm alanları doldurun')
      return
    }
    setCreating(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/daily-deals', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', productId: selectedProduct, dealPrice, endTime })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Fırsat oluşturuldu!')
        setSelectedProduct('')
        setDealPrice('')
        setEndTime('')
        fetchDeals()
      } else {
        toast.error(data.error || 'Hata oluştu')
      }
    } catch (err) {
      toast.error('Bağlantı hatası')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (dealId) => {
    if (!confirm('Bu fırsatı silmek istediğinize emin misiniz?')) return
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/daily-deals', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', dealId })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Fırsat silindi')
        fetchDeals()
      }
    } catch (err) {
      toast.error('Hata')
    }
  }

  const handleToggle = async (dealId) => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      await fetch('/api/admin/daily-deals', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', dealId })
      })
      fetchDeals()
    } catch (err) {
      toast.error('Hata')
    }
  }

  const getProductName = (productId) => {
    const p = products.find(pr => pr.id === productId)
    return p ? p.title : productId
  }

  const isExpired = (endTime) => new Date(endTime) < new Date()

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-white">Yükleniyor...</div></div>

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">🔥 Günün Fırsatları</h1>
            <p className="text-slate-400 text-sm mt-1">Ürünlere özel fırsat fiyatı belirleyin</p>
          </div>
          <Button onClick={() => router.push('/admin/dashboard')} variant="outline" className="border-slate-700 text-white">
            ← Geri
          </Button>
        </div>

        {/* Yeni Fırsat Oluştur */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Yeni Fırsat Oluştur</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Ürün Seçin</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Ürün seçin..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-white">
                      {p.title} (₺{p.discountPrice?.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Fırsat Fiyatı (₺)</Label>
              <Input
                type="number"
                step="0.01"
                value={dealPrice}
                onChange={(e) => setDealPrice(e.target.value)}
                placeholder="29.99"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Bitiş Zamanı</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleCreate} 
                disabled={creating}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white h-10"
              >
                {creating ? 'Oluşturuluyor...' : '🔥 Fırsat Oluştur'}
              </Button>
            </div>
          </div>

          {selectedProduct && dealPrice && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-300 text-sm">
                <strong>{getProductName(selectedProduct)}</strong> ürünü <strong>₺{parseFloat(dealPrice).toFixed(2)}</strong> fırsat fiyatıyla gösterilecek.
                {products.find(p => p.id === selectedProduct)?.discountPrice && (
                  <span className="text-white/50"> (Normal: ₺{products.find(p => p.id === selectedProduct).discountPrice.toFixed(2)} → %{((1 - parseFloat(dealPrice) / products.find(p => p.id === selectedProduct).discountPrice) * 100).toFixed(0)} indirim)</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Mevcut Fırsatlar */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Aktif Fırsatlar ({deals.filter(d => d.active && !isExpired(d.endTime)).length})</h2>
          
          {deals.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Henüz fırsat eklenmemiş</p>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => (
                <div key={deal.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                  isExpired(deal.endTime) ? 'bg-slate-800/50 border-slate-700/50 opacity-50' :
                  deal.active ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800 border-slate-700'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{getProductName(deal.productId)}</span>
                      {isExpired(deal.endTime) && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">SÜRESİ DOLMUŞ</span>}
                      {!deal.active && <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">PASİF</span>}
                      {deal.active && !isExpired(deal.endTime) && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">AKTİF</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="text-orange-400 font-bold">₺{deal.dealPrice?.toFixed(2)}</span>
                      <span className="text-slate-500">Bitiş: {new Date(deal.endTime).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(deal.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${deal.active ? 'bg-green-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${deal.active ? 'translate-x-6' : 'translate-x-0.5'}`}></span>
                    </button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(deal.id)} className="text-xs h-8">
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
