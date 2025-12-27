'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export default function AdminProducts() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedProductForStock, setSelectedProductForStock] = useState(null)
  const [stockData, setStockData] = useState({ items: '', summary: null })
  const [stockLoading, setStockLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    ucAmount: '',
    price: '',
    discountPrice: '',
    discountPercent: '',
    active: true,
    sortOrder: '',
    imageUrl: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Ürünler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      title: product.title,
      ucAmount: product.ucAmount.toString(),
      price: product.price.toString(),
      discountPrice: product.discountPrice.toString(),
      discountPercent: product.discountPercent.toString(),
      active: product.active,
      sortOrder: product.sortOrder.toString(),
      imageUrl: product.imageUrl || ''
    })
    setImagePreview(product.imageUrl || null)
    setImageFile(null)
    setEditDialogOpen(true)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'dan büyük olamaz')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleImageUpload = async () => {
    if (!imageFile) return null

    setUploadingImage(true)

    try {
      const token = localStorage.getItem('adminToken')
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('category', 'product')

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        return result.data.url
      } else {
        toast.error(result.error || 'Görsel yüklenemedi')
        return null
      }
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error('Görsel yükleme hatası')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    try {
      // Upload image first if selected
      let imageUrl = formData.imageUrl
      if (imageFile) {
        const uploadedUrl = await handleImageUpload()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          ucAmount: parseInt(formData.ucAmount),
          price: parseFloat(formData.price),
          discountPrice: parseFloat(formData.discountPrice),
          discountPercent: parseInt(formData.discountPercent),
          active: formData.active,
          sortOrder: parseInt(formData.sortOrder),
          imageUrl: imageUrl
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Ürün güncellendi')
        setEditDialogOpen(false)
        fetchProducts()
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Güncelleme sırasında hata oluştu')
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Ürün silindi')
        fetchProducts()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Silme sırasında hata oluştu')
    }
  }

  const handleOpenStockDialog = async (product) => {
    setSelectedProductForStock(product)
    setStockDialogOpen(true)
    setStockData({ items: '', summary: null })
    await fetchStock(product.id)
  }

  const fetchStock = async (productId) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/products/${productId}/stock`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      toast.error('Lütfen en az bir stok item\'ı girin')
      return
    }

    const items = stockData.items.split('\n').filter(line => line.trim())
    
    if (items.length === 0) {
      toast.error('Geçerli stok item\'ı bulunamadı')
      return
    }

    setStockLoading(true)

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/products/${selectedProductForStock.id}/stock`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || `${items.length} adet stok eklendi`)
        setStockData({ items: '', summary: null })
        await fetchStock(selectedProductForStock.id)
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-center" richColors />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 p-4">
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
            className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            Ürünler
          </Button>
          <Button
            onClick={() => router.push('/admin/settings/payments')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ödeme Ayarları
          </Button>
          <Button
            onClick={() => router.push('/admin/settings/site')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Site Ayarları
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
          <h1 className="text-3xl font-bold text-white mb-2">Ürünler</h1>
          <p className="text-slate-400">UC paketlerini görüntüle ve düzenle</p>
        </div>

        {/* Products Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Ürün Listesi</CardTitle>
            <CardDescription className="text-slate-400">
              Toplam {products.length} ürün
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Ürün bulunamadı
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Ürün</TableHead>
                    <TableHead className="text-slate-400">UC Miktarı</TableHead>
                    <TableHead className="text-slate-400">Fiyat</TableHead>
                    <TableHead className="text-slate-400">İndirimli Fiyat</TableHead>
                    <TableHead className="text-slate-400">İndirim %</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="text-white font-medium">{product.title}</TableCell>
                      <TableCell className="text-slate-400">{product.ucAmount} UC</TableCell>
                      <TableCell className="text-white">{product.price.toFixed(2)} ₺</TableCell>
                      <TableCell className="text-green-400 font-semibold">
                        {product.discountPrice.toFixed(2)} ₺
                      </TableCell>
                      <TableCell className="text-slate-400">{product.discountPercent}%</TableCell>
                      <TableCell>
                        <Badge variant={product.active ? 'default' : 'secondary'}>
                          {product.active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenStockDialog(product)}
                            className="border-blue-700 text-blue-400 hover:bg-blue-900/20"
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Stok
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            className="border-slate-700 text-white hover:bg-slate-800"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(product.id)}
                            className="border-red-700 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Sil
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ürün Düzenle</DialogTitle>
            <DialogDescription className="text-slate-400">
              Ürün bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="title" className="text-white">Ürün Adı</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="ucAmount" className="text-white">UC Miktarı</Label>
              <Input
                id="ucAmount"
                type="number"
                value={formData.ucAmount}
                onChange={(e) => setFormData({ ...formData, ucAmount: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="price" className="text-white">Liste Fiyatı (₺)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="discountPrice" className="text-white">İndirimli Fiyat (₺)</Label>
              <Input
                id="discountPrice"
                type="number"
                step="0.01"
                value={formData.discountPrice}
                onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="discountPercent" className="text-white">İndirim Yüzdesi (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="sortOrder" className="text-white">Sıralama</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="image" className="text-white">Görsel URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-2"
              />
            </div>

            <div className="col-span-2 flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active" className="text-white">Ürün Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Management Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Stok Yönetimi</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedProductForStock?.title} - Stok durumu ve yeni stok ekleme
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
                <div className="text-sm text-blue-300">Atanmış</div>
              </div>
            </div>
          )}

          {/* Add Stock Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 mb-2 block">
                Stok Ekle (Her satıra bir kod/item)
              </Label>
              <textarea
                value={stockData.items}
                onChange={(e) => setStockData({ ...stockData, items: e.target.value })}
                placeholder="Örnek:&#10;ABCD-1234-EFGH-5678&#10;IJKL-9012-MNOP-3456&#10;QRST-7890-UVWX-1234"
                className="w-full h-40 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm resize-none"
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                {stockLoading ? 'Ekleniyor...' : 'Toplu Ekle'}
              </Button>
            </DialogFooter>
          </div>

          {/* Stock Information */}
          <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">Otomatik Teslimat:</p>
                <p>Eklenen stoklar, ödeme onaylandığında (PAID) otomatik olarak siparişlere atanır. FIFO (ilk giren ilk çıkar) prensibiyle çalışır.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
