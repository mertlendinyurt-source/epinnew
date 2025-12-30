'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from 'sonner'
import { 
  Ban,
  Plus,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShieldAlert,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Phone,
  Mail,
  Globe,
  User,
  ChevronRight,
  Home,
  FileText,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

const TYPE_LABELS = {
  email: { label: 'E-posta', icon: Mail, color: 'text-purple-400' },
  phone: { label: 'Telefon', icon: Phone, color: 'text-blue-400' },
  ip: { label: 'IP Adresi', icon: Globe, color: 'text-cyan-400' },
  playerId: { label: 'Oyuncu ID', icon: User, color: 'text-green-400' },
  domain: { label: 'Domain', icon: Globe, color: 'text-orange-400' }
}

export default function BlacklistPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newItem, setNewItem] = useState({
    type: 'email',
    value: '',
    reason: ''
  })

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchBlacklist()
  }, [page, typeFilter])

  const fetchBlacklist = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (typeFilter) params.append('type', typeFilter)
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/risk/blacklist?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setItems(data.data)
        setTotal(data.meta?.total || 0)
      }
    } catch (error) {
      console.error('Error fetching blacklist:', error)
      toast.error('Kara liste yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchBlacklist()
  }

  const handleAdd = async () => {
    if (!newItem.value.trim()) {
      toast.error('Değer zorunludur')
      return
    }

    setAdding(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/risk/blacklist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem)
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Kara listeye eklendi')
        setAddDialogOpen(false)
        setNewItem({ type: 'email', value: '', reason: '' })
        fetchBlacklist()
      } else {
        toast.error(data.error || 'Eklenemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (item) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/risk/blacklist/${item.id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        fetchBlacklist()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    setDeleting(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/risk/blacklist/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Kara listeden silindi')
        setDeleteDialogOpen(false)
        setItemToDelete(null)
        fetchBlacklist()
      } else {
        toast.error(data.error || 'Silinemedi')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR')
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
          <Link href="/admin/settings/risk" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            Risk Ayarları
          </Link>
          <Link href="/admin/blacklist" className="flex items-center gap-2 px-4 py-2 text-white bg-slate-800 rounded-lg transition-colors">
            <Ban className="w-4 h-4 text-red-500" />
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
              <span className="text-white">Kara Liste</span>
            </div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Ban className="w-8 h-8 text-red-500" />
              Kara Liste
            </h1>
            <p className="text-slate-400 mt-1">Engelli e-posta, telefon, IP ve oyuncu ID'lerini yönetin</p>
          </div>
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ekle
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(TYPE_LABELS).map(([type, config]) => {
            const Icon = config.icon
            const count = items.filter(i => i.type === type && i.isActive).length
            return (
              <Card key={type} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${config.color}`} />
                    <div>
                      <p className="text-slate-400 text-sm">{config.label}</p>
                      <p className="text-2xl font-bold text-white">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Ara (e-posta, telefon, IP, oyuncu ID)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Tüm tipler" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">Tüm tipler</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="phone">Telefon</SelectItem>
                  <SelectItem value="ip">IP Adresi</SelectItem>
                  <SelectItem value="playerId">Oyuncu ID</SelectItem>
                  <SelectItem value="domain">Domain</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">
                <Search className="w-4 h-4 mr-2" />
                Ara
              </Button>
              <Button type="button" variant="outline" onClick={() => { setSearch(''); setTypeFilter(''); setPage(1); fetchBlacklist(); }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <Ban className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Kara listede kayıt bulunamadı</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tip</TableHead>
                    <TableHead className="text-slate-400">Değer</TableHead>
                    <TableHead className="text-slate-400">Sebep</TableHead>
                    <TableHead className="text-slate-400">Ekleyen</TableHead>
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const typeConfig = TYPE_LABELS[item.type] || TYPE_LABELS.email
                    const Icon = typeConfig.icon
                    return (
                      <TableRow key={item.id} className="border-slate-800">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                            <span className="text-slate-300">{typeConfig.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-mono">{item.value}</TableCell>
                        <TableCell className="text-slate-400">{item.reason || '-'}</TableCell>
                        <TableCell className="text-slate-400">{item.createdBy || '-'}</TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            item.isActive 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {item.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggle(item)}
                              className="text-slate-400 hover:text-white"
                            >
                              {item.isActive ? (
                                <ToggleRight className="w-4 h-4" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800">
                <p className="text-sm text-slate-400">
                  Toplam {total} kayıt
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * 20 >= total}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-500" />
              Kara Listeye Ekle
            </DialogTitle>
            <DialogDescription>
              Engellemek istediğiniz kaydı girin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Tip</Label>
              <Select value={newItem.type} onValueChange={(v) => setNewItem(prev => ({ ...prev, type: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="phone">Telefon</SelectItem>
                  <SelectItem value="ip">IP Adresi</SelectItem>
                  <SelectItem value="playerId">Oyuncu ID</SelectItem>
                  <SelectItem value="domain">Domain (geçici mail için)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Değer</Label>
              <Input
                value={newItem.value}
                onChange={(e) => setNewItem(prev => ({ ...prev, value: e.target.value }))}
                placeholder={
                  newItem.type === 'email' ? 'ornek@mail.com' :
                  newItem.type === 'phone' ? '5551234567' :
                  newItem.type === 'ip' ? '192.168.1.1' :
                  newItem.type === 'playerId' ? 'PUBG_12345' :
                  'tempmail.com'
                }
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Sebep (opsiyonel)</Label>
              <Input
                value={newItem.reason}
                onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Örn: Chargeback geçmişi, dolandırıcı şüphesi..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleAdd} 
              disabled={adding}
              className="bg-red-600 hover:bg-red-700"
            >
              {adding ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Ekle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Kaydı Sil
            </DialogTitle>
            <DialogDescription>
              Bu kaydı kara listeden silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          
          {itemToDelete && (
            <div className="py-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm">Silinecek kayıt:</p>
                <p className="text-white font-mono mt-1">{itemToDelete.value}</p>
                <p className="text-slate-500 text-sm mt-1">Tip: {TYPE_LABELS[itemToDelete.type]?.label}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sil
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
