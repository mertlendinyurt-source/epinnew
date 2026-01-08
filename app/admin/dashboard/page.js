'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Clock, CheckCircle, DollarSign, ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])

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
      } catch (e) {
        // If can't parse, continue with API check
      }
    }

    if (!localStorage.getItem('adminToken') && token) {
      localStorage.setItem('adminToken', token)
    }

    fetchDashboard()
  }

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUsername')
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
        toast.error('Oturum süreniz doldu veya yetkiniz yok')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setStats(data.data.stats)
        setRecentOrders(data.data.recentOrders)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline'
    }
    const labels = {
      paid: 'Ödendi',
      pending: 'Bekliyor',
      failed: 'Başarısız',
      refunded: 'İade'
    }
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      {/* Main Content */}
      <div>
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400 text-sm md:text-base">Hoş geldiniz, {localStorage.getItem('adminUsername')}</p>
        </div>

        {/* Stats Cards - Mobile: 2 columns, Desktop: 4 columns */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-400">Toplam Sipariş</CardTitle>
                <ShoppingBag className="h-4 w-4 text-slate-400 hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-xl md:text-2xl font-bold text-white">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-400">Ödenen</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500 hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-xl md:text-2xl font-bold text-white">{stats.paidOrders}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-400">Bekleyen</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500 hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-xl md:text-2xl font-bold text-white">{stats.pendingOrders}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-400">Toplam Gelir</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500 hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold text-white">{stats.totalRevenue.toFixed(2)} ₺</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Orders */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-white text-lg md:text-xl">Son Siparişler</CardTitle>
            <CardDescription className="text-slate-400 text-sm">En son oluşturulan siparişler</CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Henüz sipariş yok
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Sipariş ID</TableHead>
                        <TableHead className="text-slate-400">Ürün</TableHead>
                        <TableHead className="text-slate-400">Oyuncu</TableHead>
                        <TableHead className="text-slate-400">Tutar</TableHead>
                        <TableHead className="text-slate-400">Durum</TableHead>
                        <TableHead className="text-slate-400">Tarih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id} className="border-slate-800">
                          <TableCell className="text-white font-mono text-xs">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-white">{order.productTitle}</TableCell>
                          <TableCell className="text-slate-400">
                            <div className="text-xs">{order.playerName}</div>
                            <div className="text-xs text-slate-500">ID: {order.playerId}</div>
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            {order.amount.toFixed(2)} ₺
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-800">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">{order.productTitle}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{order.playerName}</span>
                        <span className="text-white font-semibold">{order.amount.toFixed(2)} ₺</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono">#{order.id.slice(0, 8)}</span>
                        <span className="text-slate-500">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
