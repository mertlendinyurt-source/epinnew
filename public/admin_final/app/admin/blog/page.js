'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import { 
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Home,
  RefreshCw,
  Calendar,
  Image as ImageIcon,
  Send,
  Save,
  X,
  BarChart3
} from 'lucide-react'

const CATEGORIES = [
  { value: 'genel', label: 'Genel' },
  { value: 'guncelleme', label: 'PUBG Güncelleme' },
  { value: 'etkinlik', label: 'Etkinlik' },
  { value: 'duyuru', label: 'Duyuru' },
  { value: 'rehber', label: 'Rehber' }
]

export default function AdminBlogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'genel',
    coverImage: '',
    tags: '',
    status: 'draft'
  })
  const [editingPost, setEditingPost] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchPosts()
  }, [page, statusFilter])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/admin/blog?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setPosts(data.data)
        setTotal(data.meta?.total || 0)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Yazılar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingPost(null)
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: 'genel',
      coverImage: '',
      tags: '',
      status: 'draft'
    })
    setEditDialogOpen(true)
  }

  const handleOpenEdit = (post) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      category: post.category || 'genel',
      coverImage: post.coverImage || '',
      tags: post.tags?.join(', ') || '',
      status: post.status
    })
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Başlık zorunludur')
      return
    }
    if (!formData.content.trim()) {
      toast.error('İçerik zorunludur')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const url = editingPost 
        ? `/api/admin/blog/${editingPost.id}`
        : '/api/admin/blog'
      
      const method = editingPost ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(editingPost ? 'Yazı güncellendi' : 'Yazı oluşturuldu')
        setEditDialogOpen(false)
        fetchPosts()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!postToDelete) return

    setDeleting(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/blog/${postToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Yazı silindi')
        setDeleteDialogOpen(false)
        setPostToDelete(null)
        fetchPosts()
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
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="p-8">
      {/* Main Content */}
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Link href="/admin" className="hover:text-white">Dashboard</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">Blog / Haberler</span>
            </div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-500" />
              Blog Yönetimi
            </h1>
            <p className="text-slate-400 mt-1">PUBG haberleri, güncellemeler ve duyurular</p>
          </div>
          <Button 
            onClick={handleOpenCreate}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Yazı
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-slate-400 text-sm">Toplam Yazı</p>
                  <p className="text-2xl font-bold text-white">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Send className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-slate-400 text-sm">Yayında</p>
                  <p className="text-2xl font-bold text-white">
                    {posts.filter(p => p.status === 'published').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Edit className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-slate-400 text-sm">Taslak</p>
                  <p className="text-2xl font-bold text-white">
                    {posts.filter(p => p.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-slate-400 text-sm">Toplam Görüntülenme</p>
                  <p className="text-2xl font-bold text-white">
                    {posts.reduce((acc, p) => acc + (p.views || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Tüm durumlar" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">Tüm durumlar</SelectItem>
                  <SelectItem value="published">Yayında</SelectItem>
                  <SelectItem value="draft">Taslak</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { setStatusFilter(''); fetchPosts(); }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Henüz blog yazısı yok</p>
                <Button onClick={handleOpenCreate} className="mt-4 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Yazıyı Oluştur
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Başlık</TableHead>
                    <TableHead className="text-slate-400">Kategori</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400">Görüntülenme</TableHead>
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {post.coverImage ? (
                            <img src={post.coverImage} alt="" className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{post.title}</p>
                            <p className="text-slate-500 text-sm">{post.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-700 text-slate-300">
                          {CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.status === 'published' ? (
                          <Badge className="bg-green-600">Yayında</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Taslak</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.views || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(post.publishedAt || post.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {post.status === 'published' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                              className="text-slate-400 hover:text-white"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(post)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setPostToDelete(post); setDeleteDialogOpen(true); }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPost ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingPost ? 'Yazıyı Düzenle' : 'Yeni Yazı Oluştur'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Başlık *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Yazı başlığı..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Kategori</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Durum</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="draft">Taslak</SelectItem>
                    <SelectItem value="published">Yayınla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Kapak Görseli URL</Label>
              <Input
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="bg-slate-800 border-slate-700 text-white"
              />
              {formData.coverImage && (
                <img src={formData.coverImage} alt="Preview" className="w-full h-40 object-cover rounded mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Özet</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Kısa açıklama (boş bırakılırsa içerikten otomatik oluşturulur)..."
                className="bg-slate-800 border-slate-700 text-white h-20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">İçerik * (HTML destekler)</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Yazı içeriği... HTML etiketleri kullanabilirsiniz (<p>, <h2>, <ul>, <li>, <strong>, <a> vb.)"
                className="bg-slate-800 border-slate-700 text-white h-60 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Etiketler (virgülle ayırın)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="pubg, güncelleme, etkinlik..."
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingPost ? 'Güncelle' : 'Oluştur'}
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
            <DialogTitle className="text-red-400">Yazıyı Sil</DialogTitle>
            <DialogDescription>
              Bu yazıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          
          {postToDelete && (
            <div className="py-4">
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-white font-medium">{postToDelete.title}</p>
                <p className="text-slate-500 text-sm mt-1">{postToDelete.slug}</p>
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
