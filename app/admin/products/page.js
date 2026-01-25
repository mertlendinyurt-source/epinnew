'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Plus, Pencil, Trash2, X, Copy, Upload, AlertTriangle } from 'lucide-react'
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
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedProductForStock, setSelectedProductForStock] = useState(null)
  const [stockData, setStockData] = useState({ items: '', summary: null })
  const [stockLoading, setStockLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [priceErrors, setPriceErrors] = useState({})
  const [lastEditedField, setLastEditedField] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    ucAmount: '',
    price: '',
    discountPrice: '',
    discountPercent: '',
    active: true,
    sortOrder: '',
    imageUrl: '',
    game: 'pubg'
  })
  const [addFormData, setAddFormData] = useState({
    title: '',
    ucAmount: '',
    price: '',
    discountPrice: '',
    discountPercent: '',
    active: true,
    sortOrder: '',
    imageUrl: '',
    game: 'pubg'
  })
  const [addImageFile, setAddImageFile] = useState(null)
  const [addImagePreview, setAddImagePreview] = useState(null)
  const [addPriceErrors, setAddPriceErrors] = useState({})

  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = () => {
    let token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    
    if (!token) {
      router.push('/admin/login')
      return
    }

    const userData = localStorage.getItem('userData')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        if (user.role !== 'admin') {
          toast.error('Bu sayfaya erişim yetkiniz yok')
          router.push('/')
          return
        }
      } catch (e) {}
    }

    if (!localStorage.getItem('adminToken') && token) {
      localStorage.setItem('adminToken', token)
    }

    fetchProducts()
  }

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
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

  // DijiPin toggle handler
  const handleDijipinToggle = async (productId, enabled) => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/products/dijipin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId, dijipinEnabled: enabled })
      })

      const data = await response.json()
      if (data.success) {
        // Update local state
        setProducts(products.map(p => 
          p.id === productId ? { ...p, dijipinEnabled: enabled } : p
        ))
        toast.success(enabled ? 'DijiPin otomatik gönderim açıldı' : 'DijiPin otomatik gönderim kapatıldı')
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('DijiPin toggle error:', error)
      toast.error('DijiPin ayarı güncellenirken hata oluştu')
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      title: product.title,
      ucAmount: (product.ucAmount || product.vpAmount || product.diamondsAmount || '').toString(),
      price: product.price.toString(),
      discountPrice: product.discountPrice.toString(),
      discountPercent: product.discountPercent.toString(),
      active: product.active,
      sortOrder: product.sortOrder.toString(),
      imageUrl: product.imageUrl || '',
      game: product.game || 'pubg'
    })
    setImagePreview(product.imageUrl || null)
    setImageFile(null)
    setPriceErrors({})
    setLastEditedField(null)
    setEditDialogOpen(true)
  }

  // Auto-calculate discount percentage when prices change
  const calculateDiscountPercent = useCallback((listPrice, salePrice) => {
    const list = parseFloat(listPrice) || 0
    const sale = parseFloat(salePrice) || 0
    if (list <= 0) return 0
    const percent = Math.round(((list - sale) / list) * 100)
    return Math.max(0, Math.min(100, percent))
  }, [])

  // Auto-calculate sale price from discount percent
  const calculateSalePrice = useCallback((listPrice, discountPercent) => {
    const list = parseFloat(listPrice) || 0
    const percent = parseFloat(discountPercent) || 0
    if (list <= 0) return 0
    const salePrice = list * (1 - percent / 100)
    return Math.round(salePrice * 100) / 100
  }, [])

  // Handle price field changes with auto-calculation
  const handlePriceChange = (field, value) => {
    const newFormData = { ...formData, [field]: value }
    setLastEditedField(field)
    
    // Clear previous errors
    const newErrors = { ...priceErrors }
    delete newErrors[field]
    
    if (field === 'price') {
      // List price changed - recalculate discount %
      const listPrice = parseFloat(value) || 0
      const salePrice = parseFloat(newFormData.discountPrice) || 0
      
      if (listPrice > 0 && salePrice > 0) {
        newFormData.discountPercent = calculateDiscountPercent(listPrice, salePrice).toString()
      }
      
      // Validate
      if (listPrice < 0) {
        newErrors.price = 'Fiyat negatif olamaz'
      }
    } else if (field === 'discountPrice') {
      // Sale price changed - recalculate discount %
      const listPrice = parseFloat(newFormData.price) || 0
      const salePrice = parseFloat(value) || 0
      
      if (listPrice > 0) {
        newFormData.discountPercent = calculateDiscountPercent(listPrice, salePrice).toString()
      }
      
      // Validate
      if (salePrice < 0) {
        newErrors.discountPrice = 'Fiyat negatif olamaz'
      } else if (salePrice > listPrice && listPrice > 0) {
        newErrors.discountPrice = 'İndirimli fiyat liste fiyatından yüksek olamaz'
      }
    } else if (field === 'discountPercent') {
      // Discount percent changed - recalculate sale price
      const listPrice = parseFloat(newFormData.price) || 0
      const percent = parseFloat(value) || 0
      
      if (listPrice > 0) {
        newFormData.discountPrice = calculateSalePrice(listPrice, percent).toString()
      }
      
      // Validate
      if (percent < 0 || percent > 100) {
        newErrors.discountPercent = 'Yüzde 0-100 arasında olmalı'
      }
    }
    
    setPriceErrors(newErrors)
    setFormData(newFormData)
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
    // Validate prices before saving
    const listPrice = parseFloat(formData.price) || 0
    const salePrice = parseFloat(formData.discountPrice) || 0
    
    if (listPrice < 0 || salePrice < 0) {
      toast.error('Fiyatlar negatif olamaz')
      return
    }
    
    if (salePrice > listPrice) {
      toast.error('İndirimli fiyat liste fiyatından yüksek olamaz')
      return
    }
    
    setSaving(true)
    
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
      
      // Prepare body based on game type
      const bodyData = {
        title: formData.title,
        price: parseFloat(formData.price),
        discountPrice: parseFloat(formData.discountPrice),
        discountPercent: parseInt(formData.discountPercent),
        active: formData.active,
        sortOrder: parseInt(formData.sortOrder),
        imageUrl: imageUrl,
        game: formData.game
      }
      
      // Use ucAmount for PUBG, vpAmount for Valorant, diamondsAmount for MLBB
      if (formData.game === 'valorant') {
        bodyData.vpAmount = parseInt(formData.ucAmount)
      } else if (formData.game === 'mlbb') {
        bodyData.diamondsAmount = parseInt(formData.ucAmount)
      } else {
        bodyData.ucAmount = parseInt(formData.ucAmount)
      }
      
      const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Ürün başarıyla güncellendi')
        fetchProducts()
        // Don't close modal - user can close manually
      } else {
        toast.error(data.error || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Güncelleme sırasında hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  // Confirm and execute hard delete
  const confirmDelete = async () => {
    if (!productToDelete) return
    
    setDeleteLoading(true)

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Ürün ve stokları tamamen silindi')
        setDeleteDialogOpen(false)
        setProductToDelete(null)
        fetchProducts()
      } else {
        toast.error(data.error || 'Silme başarısız')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Silme sırasında hata oluştu')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDelete = async (productId) => {
    // Find product and open delete dialog
    const product = products.find(p => p.id === productId)
    if (product) {
      openDeleteDialog(product)
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

  // Handle clear stock
  const handleClearStock = async () => {
    if (!selectedProductForStock) return
    
    const confirmClear = window.confirm(
      `"${selectedProductForStock.title}" ürününün tüm mevcut stoklarını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`
    )
    
    if (!confirmClear) return
    
    setStockLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/products/${selectedProductForStock.id}/stock/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message || 'Stoklar sıfırlandı')
        await fetchStock(selectedProductForStock.id)
      } else {
        toast.error(data.error || 'Stok sıfırlanamadı')
      }
    } catch (error) {
      console.error('Error clearing stock:', error)
      toast.error('Stok sıfırlanırken hata oluştu')
    } finally {
      setStockLoading(false)
    }
  }

  // Handle add form price changes
  const handleAddPriceChange = (field, value) => {
    const newFormData = { ...addFormData, [field]: value }
    
    // Clear previous errors
    const newErrors = { ...addPriceErrors }
    delete newErrors[field]
    
    if (field === 'price') {
      const listPrice = parseFloat(value) || 0
      const salePrice = parseFloat(newFormData.discountPrice) || 0
      
      if (listPrice > 0 && salePrice > 0) {
        newFormData.discountPercent = calculateDiscountPercent(listPrice, salePrice).toString()
      }
      
      if (listPrice < 0) {
        newErrors.price = 'Fiyat negatif olamaz'
      }
    } else if (field === 'discountPrice') {
      const listPrice = parseFloat(newFormData.price) || 0
      const salePrice = parseFloat(value) || 0
      
      if (listPrice > 0) {
        newFormData.discountPercent = calculateDiscountPercent(listPrice, salePrice).toString()
      }
      
      if (salePrice < 0) {
        newErrors.discountPrice = 'Fiyat negatif olamaz'
      } else if (salePrice > listPrice && listPrice > 0) {
        newErrors.discountPrice = 'İndirimli fiyat liste fiyatından yüksek olamaz'
      }
    } else if (field === 'discountPercent') {
      const listPrice = parseFloat(newFormData.price) || 0
      const percent = parseFloat(value) || 0
      
      if (listPrice > 0) {
        newFormData.discountPrice = calculateSalePrice(listPrice, percent).toString()
      }
      
      if (percent < 0 || percent > 100) {
        newErrors.discountPercent = 'Yüzde 0-100 arasında olmalı'
      }
    }
    
    setAddPriceErrors(newErrors)
    setAddFormData(newFormData)
  }

  // Handle add image select
  const handleAddImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'dan büyük olamaz')
      return
    }

    setAddImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAddImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Upload image for add
  const handleAddImageUpload = async () => {
    if (!addImageFile) return null

    try {
      const token = localStorage.getItem('adminToken')
      const formData = new FormData()
      formData.append('file', addImageFile)
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
    }
  }

  // Open add dialog
  const handleOpenAddDialog = () => {
    setAddFormData({
      title: '',
      ucAmount: '',
      price: '',
      discountPrice: '',
      discountPercent: '0',
      active: true,
      sortOrder: (products.length + 1).toString(),
      imageUrl: '',
      game: 'pubg'
    })
    setAddImageFile(null)
    setAddImagePreview(null)
    setAddPriceErrors({})
    setAddDialogOpen(true)
  }

  // Handle add product
  const handleAddProduct = async () => {
    // Validate required fields
    if (!addFormData.title.trim()) {
      toast.error('Ürün adı gereklidir')
      return
    }
    if (!addFormData.ucAmount || parseInt(addFormData.ucAmount) <= 0) {
      toast.error('Geçerli bir UC miktarı girin')
      return
    }
    if (!addFormData.price || parseFloat(addFormData.price) <= 0) {
      toast.error('Geçerli bir fiyat girin')
      return
    }

    // Validate prices
    const listPrice = parseFloat(addFormData.price) || 0
    const salePrice = parseFloat(addFormData.discountPrice) || listPrice
    
    if (listPrice < 0 || salePrice < 0) {
      toast.error('Fiyatlar negatif olamaz')
      return
    }
    
    if (salePrice > listPrice) {
      toast.error('İndirimli fiyat liste fiyatından yüksek olamaz')
      return
    }
    
    setAdding(true)
    
    try {
      // Upload image first if selected
      let imageUrl = addFormData.imageUrl
      if (addImageFile) {
        const uploadedUrl = await handleAddImageUpload()
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      const token = localStorage.getItem('adminToken')
      
      // Prepare body based on game type
      const bodyData = {
        title: addFormData.title.trim(),
        price: parseFloat(addFormData.price),
        discountPrice: salePrice,
        discountPercent: parseInt(addFormData.discountPercent) || 0,
        active: addFormData.active,
        sortOrder: parseInt(addFormData.sortOrder) || 1,
        imageUrl: imageUrl,
        game: addFormData.game
      }
      
      // Use ucAmount for PUBG, vpAmount for Valorant, diamondsAmount for MLBB
      if (addFormData.game === 'valorant') {
        bodyData.vpAmount = parseInt(addFormData.ucAmount)
      } else if (addFormData.game === 'mlbb') {
        bodyData.diamondsAmount = parseInt(addFormData.ucAmount)
      } else {
        bodyData.ucAmount = parseInt(addFormData.ucAmount)
      }
      
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Ürün başarıyla eklendi')
        setAddDialogOpen(false)
        fetchProducts()
      } else {
        toast.error(data.error || 'Ürün eklenemedi')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      toast.error('Ürün eklenirken hata oluştu')
    } finally {
      setAdding(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Package className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
            Ürünler
          </h1>
          <p className="text-slate-400 text-sm md:text-base">UC paketlerini görüntüle ve düzenle</p>
        </div>
        <Button
          onClick={handleOpenAddDialog}
          className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Ürün Ekle
        </Button>
      </div>

      {/* Products Table/Cards */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-white text-lg">Ürün Listesi</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Toplam {products.length} ürün
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {products.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Ürün bulunamadı
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Oyun</TableHead>
                      <TableHead className="text-slate-400">Ürün</TableHead>
                      <TableHead className="text-slate-400">Miktar</TableHead>
                      <TableHead className="text-slate-400">Fiyat</TableHead>
                      <TableHead className="text-slate-400">İnd. Fiyat</TableHead>
                      <TableHead className="text-slate-400">%</TableHead>
                      <TableHead className="text-slate-400">DijiPin</TableHead>
                      <TableHead className="text-slate-400">Durum</TableHead>
                      <TableHead className="text-slate-400">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell>
                          <Badge variant={product.game === 'valorant' ? 'destructive' : product.game === 'mlbb' ? 'default' : 'default'} className={product.game === 'valorant' ? 'bg-red-600' : product.game === 'mlbb' ? 'bg-blue-600' : 'bg-yellow-600'}>
                            {product.game === 'valorant' ? 'Valorant' : product.game === 'mlbb' ? 'MLBB' : 'PUBG'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-medium">{product.title}</TableCell>
                        <TableCell className="text-slate-400">{product.ucAmount || product.vpAmount || product.diamondsAmount} {product.game === 'valorant' ? 'VP' : product.game === 'mlbb' ? '💎' : 'UC'}</TableCell>
                        <TableCell className="text-white">{product.price.toFixed(2)} ₺</TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          {product.discountPrice.toFixed(2)} ₺
                        </TableCell>
                        <TableCell className="text-slate-400">{product.discountPercent}%</TableCell>
                        <TableCell>
                          <Switch
                            checked={product.dijipinEnabled || false}
                            onCheckedChange={(checked) => handleDijipinToggle(product.id, checked)}
                            className="data-[state=checked]:bg-yellow-500"
                          />
                        </TableCell>
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
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(product.id)}
                              className="border-red-700 text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-slate-800">
                {products.map((product) => (
                  <div key={product.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={product.game === 'valorant' ? 'destructive' : product.game === 'mlbb' ? 'default' : 'default'} className={`text-xs ${product.game === 'valorant' ? 'bg-red-600' : product.game === 'mlbb' ? 'bg-blue-600' : 'bg-yellow-600'}`}>
                            {product.game === 'valorant' ? 'Valorant' : product.game === 'mlbb' ? 'MLBB' : 'PUBG'}
                          </Badge>
                        </div>
                        <h3 className="text-white font-medium">{product.title}</h3>
                        <p className="text-slate-500 text-sm">{product.ucAmount || product.vpAmount || product.diamondsAmount} {product.game === 'valorant' ? 'VP' : product.game === 'mlbb' ? '💎' : 'UC'}</p>
                      </div>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs">Fiyat</p>
                        <p className="text-white">{product.price.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">İnd. Fiyat</p>
                        <p className="text-green-400 font-semibold">{product.discountPrice.toFixed(2)} ₺</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">İndirim</p>
                        <p className="text-yellow-400">{product.discountPercent}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">DijiPin:</span>
                        <Switch
                          checked={product.dijipinEnabled || false}
                          onCheckedChange={(checked) => handleDijipinToggle(product.id, checked)}
                          className="data-[state=checked]:bg-yellow-500 scale-75"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStockDialog(product)}
                          className="border-blue-700 text-blue-400 hover:bg-blue-900/20 h-8 text-xs"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Stok
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                          className="border-slate-700 text-white hover:bg-slate-800 h-8 w-8 p-0"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product.id)}
                          className="border-red-700 text-red-400 hover:bg-red-900/20 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Premium UI */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg md:text-xl font-bold text-white">Ürün Düzenle</DialogTitle>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Ürün bilgilerini güncelleyin</p>
            </div>
            <div className="flex items-center gap-3">
              {editingProduct && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                  <span className="text-xs text-slate-500">ID:</span>
                  <code className="text-xs text-slate-400 font-mono">{editingProduct.id.slice(0, 8)}...</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editingProduct.id)
                      toast.success('ID kopyalandı')
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Section 1: Product Info */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-xs md:text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                Ürün Bilgileri
              </h3>
              
              {/* Game Selection */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Oyun Türü</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, game: 'pubg' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      formData.game === 'pubg' 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">🎮</span>
                      <span className={`font-medium ${formData.game === 'pubg' ? 'text-yellow-400' : 'text-white'}`}>PUBG UC</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, game: 'valorant' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      formData.game === 'valorant' 
                        ? 'border-red-500 bg-red-500/10' 
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">🔫</span>
                      <span className={`font-medium ${formData.game === 'valorant' ? 'text-red-400' : 'text-white'}`}>Valorant VP</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, game: 'mlbb' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      formData.game === 'mlbb' 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">💎</span>
                      <span className={`font-medium ${formData.game === 'mlbb' ? 'text-blue-400' : 'text-white'}`}>MLBB</span>
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Ürün Adı</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white h-11"
                    placeholder={formData.game === 'valorant' ? 'Örn: 475 VP' : formData.game === 'mlbb' ? 'Örn: 86 Diamonds' : 'Örn: 60 UC'}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">{formData.game === 'valorant' ? 'VP Miktarı' : formData.game === 'mlbb' ? 'Diamonds Miktarı' : 'UC Miktarı'}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.ucAmount}
                      onChange={(e) => setFormData({ ...formData, ucAmount: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white h-11 pr-12"
                      placeholder={formData.game === 'valorant' ? '475' : formData.game === 'mlbb' ? '86' : '60'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{formData.game === 'valorant' ? 'VP' : formData.game === 'mlbb' ? '💎' : 'UC'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Pricing */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fiyatlandırma
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Liste Fiyatı</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handlePriceChange('price', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white h-11 pl-8 ${priceErrors.price ? 'border-red-500' : ''}`}
                      placeholder="100.00"
                    />
                  </div>
                  {priceErrors.price && (
                    <p className="text-xs text-red-400">{priceErrors.price}</p>
                  )}
                  <p className="text-xs text-slate-500">Ürünün normal satış fiyatı</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">İndirimli Fiyat</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discountPrice}
                      onChange={(e) => handlePriceChange('discountPrice', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white h-11 pl-8 ${priceErrors.discountPrice ? 'border-red-500' : ''}`}
                      placeholder="80.00"
                    />
                  </div>
                  {priceErrors.discountPrice && (
                    <p className="text-xs text-red-400">{priceErrors.discountPrice}</p>
                  )}
                  <p className="text-xs text-slate-500">Müşterinin ödeyeceği fiyat</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">İndirim Oranı</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.discountPercent}
                      onChange={(e) => handlePriceChange('discountPercent', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white h-11 pr-8 ${priceErrors.discountPercent ? 'border-red-500' : ''}`}
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  </div>
                  {priceErrors.discountPercent && (
                    <p className="text-xs text-red-400">{priceErrors.discountPercent}</p>
                  )}
                  <p className="text-xs text-slate-500">Otomatik hesaplanır</p>
                </div>
              </div>

              {/* Price calculation info */}
              {parseFloat(formData.price) > 0 && parseFloat(formData.discountPrice) > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400">
                      Müşteri {parseFloat(formData.price) - parseFloat(formData.discountPrice) > 0 ? (parseFloat(formData.price) - parseFloat(formData.discountPrice)).toFixed(2) : 0} ₺ tasarruf edecek
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Image */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Ürün Görseli
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preview */}
                <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] border border-slate-700">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-32 h-32 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setImageFile(null)
                          setFormData({ ...formData, imageUrl: '' })
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-slate-500">Görsel önizleme</p>
                    </div>
                  )}
                </div>

                {/* Upload */}
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label
                    htmlFor="product-image-upload"
                    className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-800/70 transition-all min-h-[160px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">
                        {imageFile ? imageFile.name : 'Görsel yükle'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP • Max 2MB</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Status & Order */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Durum & Sıralama
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div>
                    <Label className="text-white font-medium">Ürün Durumu</Label>
                    <p className="text-xs text-slate-500 mt-1">Pasif ürünler sitede gösterilmez</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${formData.active ? 'text-green-400' : 'text-slate-400'}`}>
                      {formData.active ? 'Aktif' : 'Pasif'}
                    </span>
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Sıralama</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white h-11"
                    placeholder="1"
                  />
                  <p className="text-xs text-slate-500">Küçük sayılar önce gösterilir</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Kapat
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploadingImage || Object.keys(priceErrors).length > 0}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8"
            >
              {saving || uploadingImage ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploadingImage ? 'Görsel yükleniyor...' : 'Kaydediliyor...'}
                </>
              ) : (
                'Kaydet'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-white mb-2">Ürünü Sil</DialogTitle>
            <DialogDescription className="text-slate-400">
              <span className="font-semibold text-white">{productToDelete?.title}</span> ürününü silmek istediğinizden emin misiniz?
            </DialogDescription>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">
                ⚠️ Bu işlem geri alınamaz. Ürün ve tüm stok kayıtları tamamen silinecektir.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 border-slate-700 text-white hover:bg-slate-800"
              disabled={deleteLoading}
            >
              İptal
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Siliniyor...
                </>
              ) : (
                'Evet, Sil'
              )}
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                onClick={handleClearStock}
                disabled={stockLoading || !stockData.summary?.available}
                variant="outline"
                className="border-red-700 text-red-400 hover:bg-red-900/20 hover:text-red-300"
              >
                {stockLoading ? 'İşleniyor...' : `Stokları Sıfırla (${stockData.summary?.available || 0})`}
              </Button>
              <div className="flex gap-2">
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
              </div>
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

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white">Yeni Ürün Ekle</DialogTitle>
              <p className="text-sm text-slate-400 mt-1">{addFormData.game === 'valorant' ? 'Yeni VP paketi ekleyin' : 'Yeni UC paketi ekleyin'}</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Section 1: Product Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                Ürün Bilgileri
              </h3>
              
              {/* Game Selection */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Oyun Türü *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddFormData({ ...addFormData, game: 'pubg' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      addFormData.game === 'pubg' 
                        ? 'border-yellow-500 bg-yellow-500/10' 
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">🎮</span>
                      <span className={`font-medium ${addFormData.game === 'pubg' ? 'text-yellow-400' : 'text-white'}`}>PUBG UC</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddFormData({ ...addFormData, game: 'valorant' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      addFormData.game === 'valorant' 
                        ? 'border-red-500 bg-red-500/10' 
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">🔫</span>
                      <span className={`font-medium ${addFormData.game === 'valorant' ? 'text-red-400' : 'text-white'}`}>Valorant VP</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddFormData({ ...addFormData, game: 'mlbb' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      addFormData.game === 'mlbb' 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">💎</span>
                      <span className={`font-medium ${addFormData.game === 'mlbb' ? 'text-blue-400' : 'text-white'}`}>MLBB</span>
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Ürün Adı *</Label>
                  <Input
                    value={addFormData.title}
                    onChange={(e) => setAddFormData({ ...addFormData, title: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white h-11"
                    placeholder={addFormData.game === 'valorant' ? 'Örn: 475 VP' : addFormData.game === 'mlbb' ? 'Örn: 86 Diamonds' : 'Örn: 60 UC'}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">{addFormData.game === 'valorant' ? 'VP Miktarı *' : addFormData.game === 'mlbb' ? 'Diamonds Miktarı *' : 'UC Miktarı *'}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={addFormData.ucAmount}
                      onChange={(e) => setAddFormData({ ...addFormData, ucAmount: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white h-11 pr-12"
                      placeholder={addFormData.game === 'valorant' ? '475' : addFormData.game === 'mlbb' ? '86' : '60'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{addFormData.game === 'valorant' ? 'VP' : addFormData.game === 'mlbb' ? '💎' : 'UC'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Pricing */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Fiyatlandırma
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Liste Fiyatı *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={addFormData.price}
                      onChange={(e) => handleAddPriceChange('price', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white h-11 pl-8 ${addPriceErrors.price ? 'border-red-500' : ''}`}
                      placeholder="100.00"
                    />
                  </div>
                  {addPriceErrors.price && (
                    <p className="text-xs text-red-400">{addPriceErrors.price}</p>
                  )}
                  <p className="text-xs text-slate-500">Ürünün normal satış fiyatı</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">İndirimli Fiyat</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₺</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={addFormData.discountPrice}
                      onChange={(e) => handleAddPriceChange('discountPrice', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white h-11 pl-8 ${addPriceErrors.discountPrice ? 'border-red-500' : ''}`}
                      placeholder="80.00"
                    />
                  </div>
                  {addPriceErrors.discountPrice && (
                    <p className="text-xs text-red-400">{addPriceErrors.discountPrice}</p>
                  )}
                  <p className="text-xs text-slate-500">Müşterinin ödeyeceği fiyat</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">İndirim Oranı</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={addFormData.discountPercent}
                      onChange={(e) => handleAddPriceChange('discountPercent', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white h-11 pr-8 ${addPriceErrors.discountPercent ? 'border-red-500' : ''}`}
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  </div>
                  {addPriceErrors.discountPercent && (
                    <p className="text-xs text-red-400">{addPriceErrors.discountPercent}</p>
                  )}
                  <p className="text-xs text-slate-500">Otomatik hesaplanır</p>
                </div>
              </div>

              {/* Price calculation info */}
              {parseFloat(addFormData.price) > 0 && parseFloat(addFormData.discountPrice) > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400">
                      Müşteri {parseFloat(addFormData.price) - parseFloat(addFormData.discountPrice) > 0 ? (parseFloat(addFormData.price) - parseFloat(addFormData.discountPrice)).toFixed(2) : 0} ₺ tasarruf edecek
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Image */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Ürün Görseli (Opsiyonel)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preview */}
                <div className="bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] border border-slate-700">
                  {addImagePreview ? (
                    <div className="relative">
                      <img 
                        src={addImagePreview} 
                        alt="Preview" 
                        className="w-32 h-32 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAddImagePreview(null)
                          setAddImageFile(null)
                          setAddFormData({ ...addFormData, imageUrl: '' })
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-slate-500">Görsel önizleme</p>
                    </div>
                  )}
                </div>

                {/* Upload */}
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAddImageSelect}
                    className="hidden"
                    id="add-product-image-upload"
                  />
                  <label
                    htmlFor="add-product-image-upload"
                    className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-800/70 transition-all min-h-[160px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">
                        {addImageFile ? addImageFile.name : 'Görsel yükle'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP • Max 2MB</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Status & Order */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Durum & Sıralama
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div>
                    <Label className="text-white font-medium">Ürün Durumu</Label>
                    <p className="text-xs text-slate-500 mt-1">Pasif ürünler sitede gösterilmez</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${addFormData.active ? 'text-green-400' : 'text-slate-400'}`}>
                      {addFormData.active ? 'Aktif' : 'Pasif'}
                    </span>
                    <Switch
                      checked={addFormData.active}
                      onCheckedChange={(checked) => setAddFormData({ ...addFormData, active: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Sıralama</Label>
                  <Input
                    type="number"
                    value={addFormData.sortOrder}
                    onChange={(e) => setAddFormData({ ...addFormData, sortOrder: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white h-11"
                    placeholder="1"
                  />
                  <p className="text-xs text-slate-500">Küçük sayılar önce gösterilir</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setAddDialogOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              İptal
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={adding || Object.keys(addPriceErrors).length > 0}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8"
            >
              {adding ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ekleniyor...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Ürün Ekle
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
