'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Search, Filter, Image as ImageIcon, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export default function AdminOrders() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [processingOrder, setProcessingOrder] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchOrders()
  }, [])

  useEffect(() => {
    let filtered = orders
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }
    
    if (riskFilter === 'flagged') {
      filtered = filtered.filter(order => order.risk?.status === 'FLAGGED')
    } else if (riskFilter === 'hold') {
      filtered = filtered.filter(order => order.delivery?.status === 'hold')
    }
    
    setFilteredOrders(filtered)
  }, [statusFilter, riskFilter, orders])

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setOrders(data.data)
        setFilteredOrders(data.data)
        setFlaggedCount(data.meta?.flaggedCount || 0)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Siparişler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  const handleApproveOrder = async (orderId) => {
    setProcessingOrder(orderId)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Sipariş onaylandı ve teslim edildi')
        fetchOrders()
      } else {
        toast.error(data.error || 'Onay başarısız')
      }
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Onay işlemi başarısız')
    } finally {
      setProcessingOrder(null)
    }
  }

  const handleRefundOrder = async (orderId) => {
    if (!confirm('Bu siparişi iade edildi olarak işaretlemek istediğinize emin misiniz? Shopier üzerinden manuel iade yapmalısınız.')) {
      return
    }
    
    setProcessingOrder(orderId)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Manuel iade - Shopier üzerinden' })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Sipariş iade edildi olarak işaretlendi')
        fetchOrders()
      } else {
        toast.error(data.error || 'İade başarısız')
      }
    } catch (error) {
      console.error('Refund error:', error)
      toast.error('İade işlemi başarısız')
    } finally {
      setProcessingOrder(null)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline',
      completed: 'default'
    }
    const labels = {
      paid: 'Ödendi',
      pending: 'Bekliyor',
      failed: 'Başarısız',
      refunded: 'İade',
      completed: 'Tamamlandı'
    }
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>
  }

  const getRiskBadge = (order) => {
    if (!order.risk) return null
    
    const status = order.risk.actualStatus || order.risk.status
    
    if (status === 'BLOCKED') {
      return (
        <Badge className="bg-red-700 hover:bg-red-800 text-white gap-1">
          <Ban className="w-3 h-3" />
          ENGELLİ
        </Badge>
      )
    }
    if (status === 'FLAGGED') {
      return (
        <Badge className="bg-red-600 hover:bg-red-700 text-white gap-1">
          <AlertTriangle className="w-3 h-3" />
          RİSKLİ ({order.risk.score})
        </Badge>
      )
    }
    if (status === 'SUSPICIOUS') {
      return (
        <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white gap-1">
          <AlertTriangle className="w-3 h-3" />
          ŞÜPHELİ ({order.risk.score})
        </Badge>
      )
    }
    if (order.risk.score > 0) {
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1">
          TEMİZ ({order.risk.score})
        </Badge>
      )
    }
    return null
  }

  const getDeliveryBadge = (order) => {
    if (!order.delivery) return null
    
    const badges = {
      hold: <Badge className="bg-orange-600 hover:bg-orange-700 text-white">HOLD</Badge>,
      pending: <Badge variant="secondary">Stok Bekliyor</Badge>,
      delivered: <Badge className="bg-green-600 hover:bg-green-700 text-white">Teslim Edildi</Badge>,
      cancelled: <Badge variant="outline">İptal</Badge>
    }
    return badges[order.delivery.status] || null
  }

  const openOrderDetail = (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
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
            P
          </div>
          <div>
            <div className="text-white font-bold">PINLY</div>
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
            className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white relative"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Siparişler
            {flaggedCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {flaggedCount}
              </span>
            )}
          </Button>
          <Button
            onClick={() => router.push('/admin/products')}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
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
            <ImageIcon className="w-4 h-4 mr-2" />
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
          <h1 className="text-3xl font-bold text-white mb-2">Siparişler</h1>
          <p className="text-slate-400">Tüm siparişleri görüntüleyin ve yönetin</p>
        </div>

        {/* Risk Alert */}
        {flaggedCount > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-200 font-medium">{flaggedCount} riskli sipariş onay bekliyor</p>
              <p className="text-red-300/70 text-sm">Bu siparişlerin teslimatı durduruldu. Manuel onay veya iade gerekiyor.</p>
            </div>
            <Button 
              onClick={() => setRiskFilter('hold')}
              className="ml-auto bg-red-600 hover:bg-red-700"
            >
              Görüntüle
            </Button>
          </div>
        )}

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Sipariş Listesi</CardTitle>
                <CardDescription className="text-slate-400">Tüm sipariş geçmişi</CardDescription>
              </div>
              <div className="flex gap-3">
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Risk filtrele" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">Tümü</SelectItem>
                    <SelectItem value="flagged" className="text-white">🚨 Riskli</SelectItem>
                    <SelectItem value="hold" className="text-white">⏸️ Beklemede</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Durum filtrele" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">Tümü</SelectItem>
                    <SelectItem value="pending" className="text-white">Bekliyor</SelectItem>
                    <SelectItem value="paid" className="text-white">Ödendi</SelectItem>
                    <SelectItem value="failed" className="text-white">Başarısız</SelectItem>
                    <SelectItem value="refunded" className="text-white">İade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto text-slate-700 mb-4" />
                <p className="text-slate-400">Sipariş bulunamadı</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Sipariş No</TableHead>
                    <TableHead className="text-slate-400">Ürün</TableHead>
                    <TableHead className="text-slate-400">Oyuncu</TableHead>
                    <TableHead className="text-slate-400">Tutar</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400">Risk</TableHead>
                    <TableHead className="text-slate-400">Teslimat</TableHead>
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className={`border-slate-800 hover:bg-slate-800/50 ${order.risk?.status === 'FLAGGED' ? 'bg-red-950/20' : ''}`}
                    >
                      <TableCell 
                        className="font-mono text-slate-400 text-xs cursor-pointer hover:text-blue-400"
                        onClick={() => openOrderDetail(order)}
                      >
                        {order.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-white">{order.productTitle}</TableCell>
                      <TableCell className="text-slate-400">
                        <div className="text-xs">{order.playerName}</div>
                        <div className="text-xs text-slate-500">{order.playerId}</div>
                      </TableCell>
                      <TableCell className="text-white font-semibold">
                        ₺{order.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getRiskBadge(order)}</TableCell>
                      <TableCell>{getDeliveryBadge(order)}</TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        {order.delivery?.status === 'hold' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveOrder(order.id)}
                              disabled={processingOrder === order.id}
                              className="bg-green-600 hover:bg-green-700 text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRefundOrder(order.id)}
                              disabled={processingOrder === order.id}
                              className="text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              İade
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Sipariş Detayı</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Customer Info Section */}
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="text-white font-medium">Müşteri Bilgileri</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">İsim</p>
                    <p className="text-white">{selectedOrder.userName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">E-posta</p>
                    <p className="text-white">{selectedOrder.userEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Telefon</p>
                    <p className="text-white">{selectedOrder.userPhone || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Sipariş No</p>
                  <p className="text-white font-mono">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Ürün</p>
                  <p className="text-white">{selectedOrder.productTitle}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Oyuncu</p>
                  <p className="text-white">{selectedOrder.playerName} ({selectedOrder.playerId})</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tutar</p>
                  <p className="text-white font-bold">₺{selectedOrder.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Durum</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tarih</p>
                  <p className="text-white">{new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}</p>
                </div>
              </div>

              {/* Risk Section - Enhanced */}
              {selectedOrder.risk && (
                <div className={`rounded-lg p-4 border ${
                  selectedOrder.risk.status === 'FLAGGED' || selectedOrder.risk.status === 'BLOCKED'
                    ? 'bg-red-900/20 border-red-700/50'
                    : selectedOrder.risk.status === 'SUSPICIOUS'
                    ? 'bg-yellow-900/20 border-yellow-700/50'
                    : 'bg-green-900/20 border-green-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${
                        selectedOrder.risk.status === 'FLAGGED' || selectedOrder.risk.status === 'BLOCKED'
                          ? 'text-red-400'
                          : selectedOrder.risk.status === 'SUSPICIOUS'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`} />
                      <h3 className="text-white font-medium">Risk Analizi</h3>
                    </div>
                    {selectedOrder.risk.isTestMode && (
                      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                        TEST MODU
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs mb-1">Risk Skoru</p>
                      <p className={`text-2xl font-bold ${
                        selectedOrder.risk.score >= 60 ? 'text-red-400' :
                        selectedOrder.risk.score >= 30 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {selectedOrder.risk.score}/100
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs mb-1">Risk Durumu</p>
                      {selectedOrder.risk.status === 'BLOCKED' ? (
                        <Badge className="bg-red-600">ENGELLENDİ</Badge>
                      ) : selectedOrder.risk.status === 'FLAGGED' ? (
                        <Badge className="bg-red-600">RİSKLİ</Badge>
                      ) : selectedOrder.risk.status === 'SUSPICIOUS' ? (
                        <Badge className="bg-yellow-600">ŞÜPHELİ</Badge>
                      ) : (
                        <Badge className="bg-green-600">TEMİZ</Badge>
                      )}
                    </div>
                  </div>
                  
                  {selectedOrder.risk.reasons?.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-sm mb-2">Risk Sebepleri:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedOrder.risk.reasons.map((reason, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-yellow-500" />
                              <span className="text-slate-300">{reason.label || reason}</span>
                            </div>
                            {reason.points && (
                              <span className="text-red-400 font-semibold">+{reason.points}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Warning for risky orders */}
                  {(selectedOrder.risk.status === 'FLAGGED' || selectedOrder.risk.status === 'BLOCKED') && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-200">
                          <p className="font-semibold">Dikkat!</p>
                          <p>Bu sipariş riskli olarak işaretlendi. Teslimat yapılmadan önce manuel kontrol yapmanız önerilir. Gerekirse Shopier üzerinden iade yapabilirsiniz.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Section */}
              {selectedOrder.delivery && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Teslimat Durumu</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-400 text-sm">Durum:</span>
                    {getDeliveryBadge(selectedOrder)}
                  </div>
                  {selectedOrder.delivery.message && (
                    <p className="text-slate-300 text-sm">{selectedOrder.delivery.message}</p>
                  )}
                  {selectedOrder.delivery.items?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-slate-400 text-sm">Atanan Kod:</p>
                      <p className="text-green-400 font-mono text-sm">{selectedOrder.delivery.items[0]}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {selectedOrder.delivery?.status === 'hold' && (
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <Button
                    onClick={() => {
                      handleApproveOrder(selectedOrder.id)
                      setShowDetailModal(false)
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Manuel Onayla ve Teslim Et
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleRefundOrder(selectedOrder.id)
                      setShowDetailModal(false)
                    }}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    İade Edildi (Shopier)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
