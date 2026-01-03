'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Wallet, TrendingUp, TrendingDown, Eye, Calendar, CalendarDays, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month
  const [selectedUser, setSelectedUser] = useState(null)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceAction, setBalanceAction] = useState('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceNote, setBalanceNote] = useState('')
  const [processing, setProcessing] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    monthCount: 0
  })

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchUsers()
  }, [pagination.page, search, dateFilter])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users?page=${pagination.page}&limit=20&search=${search}&dateFilter=${dateFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setUsers(data.data.users)
        setPagination(data.data.pagination)
        
        // Stats varsa güncelle
        if (data.data.stats) {
          setStats(data.data.stats)
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleBalanceUpdate = async () => {
    if (!balanceAmount || parseFloat(balanceAmount) <= 0) {
      toast.error('Geçerli bir tutar giriniz')
      return
    }

    setProcessing(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(balanceAmount),
          type: balanceAction,
          note: balanceNote
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        setShowBalanceModal(false)
        setBalanceAmount('')
        setBalanceNote('')
        fetchUsers()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Balance update error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              Kullanıcı Yönetimi
            </h1>
            <p className="text-slate-400 mt-2">Kullanıcı listesi ve bakiye yönetimi</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-blue-500 ${dateFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}
          onClick={() => { setDateFilter('all'); setPagination(prev => ({ ...prev, page: 1 })); }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Toplam Kullanıcı</p>
                <p className="text-3xl font-bold text-white">{pagination.total}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-green-500 ${dateFilter === 'today' ? 'border-green-500 ring-2 ring-green-500/20' : ''}`}
          onClick={() => { setDateFilter('today'); setPagination(prev => ({ ...prev, page: 1 })); }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Bugün Kayıt</p>
                <p className="text-3xl font-bold text-green-400">{stats.todayCount}</p>
              </div>
              <Calendar className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-yellow-500 ${dateFilter === 'week' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : ''}`}
          onClick={() => { setDateFilter('week'); setPagination(prev => ({ ...prev, page: 1 })); }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Bu Hafta</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.weekCount}</p>
              </div>
              <CalendarDays className="w-12 h-12 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-purple-500 ${dateFilter === 'month' ? 'border-purple-500 ring-2 ring-purple-500/20' : ''}`}
          onClick={() => { setDateFilter('month'); setPagination(prev => ({ ...prev, page: 1 })); }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Bu Ay</p>
                <p className="text-3xl font-bold text-purple-400">{stats.monthCount}</p>
              </div>
              <CalendarRange className="w-12 h-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-slate-900 border-slate-800 mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="İsim, e-posta veya telefon ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button onClick={fetchUsers} className="bg-blue-600 hover:bg-blue-700">
              Ara
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Kullanıcı Listesi</CardTitle>
              <CardDescription className="text-slate-400">
                {dateFilter === 'all' && 'Tüm kayıtlı kullanıcılar'}
                {dateFilter === 'today' && 'Bugün kayıt olan kullanıcılar'}
                {dateFilter === 'week' && 'Bu hafta kayıt olan kullanıcılar'}
                {dateFilter === 'month' && 'Bu ay kayıt olan kullanıcılar'}
              </CardDescription>
            </div>
            {dateFilter !== 'all' && (
              <Badge 
                className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                onClick={() => { setDateFilter('all'); setPagination(prev => ({ ...prev, page: 1 })); }}
              >
                Filtreyi Temizle ✕
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-400">Ad Soyad</TableHead>
                    <TableHead className="text-slate-400">E-posta</TableHead>
                    <TableHead className="text-slate-400">Telefon</TableHead>
                    <TableHead className="text-slate-400">Bakiye</TableHead>
                    <TableHead className="text-slate-400">Kayıt Tarihi</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-white font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-slate-300">{user.email}</TableCell>
                      <TableCell className="text-slate-300">{user.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            (user.balance || 0) > 0 
                              ? "bg-green-900/20 text-green-400 border-green-800"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }
                        >
                          {(user.balance || 0).toFixed(2)} ₺
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowBalanceModal(true)
                            setBalanceAction('add')
                            setBalanceAmount('')
                            setBalanceNote('')
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Wallet className="w-4 h-4 mr-1" />
                          Bakiye Düzenle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Önceki
              </Button>
              <span className="text-white px-4">
                {pagination.page} / {pagination.pages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Sonraki
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Update Modal */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-500" />
              Bakiye Düzenle
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* Current Balance */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-4">
                  <p className="text-slate-400 text-sm mb-1">Mevcut Bakiye</p>
                  <p className="text-3xl font-bold text-white">
                    {(selectedUser.balance || 0).toFixed(2)} ₺
                  </p>
                </CardContent>
              </Card>

              {/* Action Type */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setBalanceAction('add')}
                  variant={balanceAction === 'add' ? 'default' : 'outline'}
                  className={
                    balanceAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'border-slate-700 hover:bg-slate-800'
                  }
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ekle
                </Button>
                <Button
                  onClick={() => setBalanceAction('subtract')}
                  variant={balanceAction === 'subtract' ? 'default' : 'outline'}
                  className={
                    balanceAction === 'subtract'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'border-slate-700 hover:bg-slate-800'
                  }
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Çıkar
                </Button>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Tutar (₺)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Not (Opsiyonel)</label>
                <Textarea
                  placeholder="Bakiye değişikliği sebebi..."
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>

              {/* Preview */}
              {balanceAmount && parseFloat(balanceAmount) > 0 && (
                <Card className={`border-2 ${
                  balanceAction === 'add' 
                    ? 'bg-green-900/20 border-green-700' 
                    : 'bg-red-900/20 border-red-700'
                }`}>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-400 mb-1">Yeni Bakiye</p>
                    <p className={`text-2xl font-bold ${
                      balanceAction === 'add' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {balanceAction === 'add' 
                        ? ((selectedUser.balance || 0) + parseFloat(balanceAmount)).toFixed(2)
                        : ((selectedUser.balance || 0) - parseFloat(balanceAmount)).toFixed(2)
                      } ₺
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleBalanceUpdate}
                  disabled={processing || !balanceAmount || parseFloat(balanceAmount) <= 0}
                  className={`flex-1 ${
                    balanceAction === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing ? 'İşleniyor...' : 'Onayla'}
                </Button>
                <Button
                  onClick={() => setShowBalanceModal(false)}
                  variant="outline"
                  disabled={processing}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  İptal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
