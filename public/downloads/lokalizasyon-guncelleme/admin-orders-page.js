'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, LogOut, Search, Filter, Image as ImageIcon, AlertTriangle, CheckCircle, XCircle, Shield, Ban, ChevronLeft, ChevronRight, MessageSquare, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function AdminOrders() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [processingOrder, setProcessingOrder] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [availableStocks, setAvailableStocks] = useState([])
  const [selectedStockId, setSelectedStockId] = useState(null)
  const [loadingStocks, setLoadingStocks] = useState(false)
  
  // Search filters
  const [emailSearch, setEmailSearch] = useState('')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [orderIdSearch, setOrderIdSearch] = useState('')
  const [playerIdSearch, setPlayerIdSearch] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

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

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentMethod === paymentMethodFilter)
    }
    
    if (riskFilter === 'flagged') {
      filtered = filtered.filter(order => order.risk?.status === 'FLAGGED')
    } else if (riskFilter === 'hold') {
      filtered = filtered.filter(order => order.delivery?.status === 'hold')
    }
    
    // E-posta ile arama
    if (emailSearch.trim()) {
      const searchTerm = emailSearch.toLowerCase().trim()
      filtered = filtered.filter(order => 
        order.customer?.email?.toLowerCase().includes(searchTerm) ||
        order.userEmail?.toLowerCase().includes(searchTerm)
      )
    }
    
    // Telefon ile arama
    if (phoneSearch.trim()) {
      const searchTerm = phoneSearch.replace(/\s/g, '').trim()
      filtered = filtered.filter(order => 
        order.customer?.phone?.replace(/\s/g, '').includes(searchTerm) ||
        order.userPhone?.replace(/\s/g, '').includes(searchTerm)
      )
    }
    
    // Sipariş ID ile arama
    if (orderIdSearch.trim()) {
      const searchTerm = orderIdSearch.toLowerCase().trim()
      filtered = filtered.filter(order => 
        order.id?.toLowerCase().includes(searchTerm)
      )
    }
    
    // PUBG ID (Oyuncu ID) ile arama
    if (playerIdSearch.trim()) {
      const searchTerm = playerIdSearch.trim()
      filtered = filtered.filter(order => 
        order.playerId?.includes(searchTerm) ||
        order.player?.id?.includes(searchTerm)
      )
    }
    
    setFilteredOrders(filtered)
    setCurrentPage(1) // Reset to first page when filter changes
  }, [statusFilter, paymentMethodFilter, riskFilter, orders, emailSearch, phoneSearch, orderIdSearch, playerIdSearch])

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

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

  const fetchAvailableStocks = async (accountId) => {
    setLoadingStocks(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/accounts/${accountId}/stock`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      if (data.success) {
        // Filter only available stocks
        const available = data.data.stocks?.filter(s => s.status === 'available') || []
        setAvailableStocks(available)
        if (available.length > 0) {
          setSelectedStockId(available[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching stocks:', error)
    } finally {
      setLoadingStocks(false)
    }
  }

  const handleOrderClick = async (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
    
    // If account order, fetch available stocks
    if (order.accountId) {
      await fetchAvailableStocks(order.accountId)
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

  const handleAssignStock = async (orderId) => {
    setProcessingOrder(orderId)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      
      // Determine order type - check both 'type' and 'orderType' fields, plus accountId
      const order = orders.find(o => o.id === orderId)
      const isAccountOrder = order?.type === 'account' || order?.orderType === 'account' || order?.accountId
      
      console.log('DEBUG - Assign Stock:', {
        orderId,
        hasOrder: !!order,
        type: order?.type,
        orderType: order?.orderType,
        hasAccountId: !!order?.accountId,
        hasProductId: !!order?.productId,
        isAccountOrder,
        selectedStockId
      })
      
      // Use correct endpoint based on order type
      const endpoint = isAccountOrder 
        ? `/api/admin/account-orders/${orderId}/assign-stock`
        : `/api/admin/orders/${orderId}/assign-stock`
      
      console.log('DEBUG - Using endpoint:', endpoint)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stockId: selectedStockId // Send selected stock ID
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Stok başarıyla atandı ve müşteriye e-posta gönderildi')
        fetchOrders()
        setShowDetailModal(false)
      } else {
        toast.error(data.error || 'Stok atama başarısız')
      }
    } catch (error) {
      console.error('Assign stock error:', error)
      toast.error('Stok atama işlemi başarısız')
    } finally {
      setProcessingOrder(null)
    }
  }

  // Manuel SMS Gönder
  const handleSendSms = async (orderId) => {
    if (!confirm('Bu siparişe SMS göndermek istediğinize emin misiniz?')) {
      return
    }
    
    setProcessingOrder(orderId)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/orders/${orderId}/send-sms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.message || 'SMS gönderildi')
      } else {
        toast.error(data.error || 'SMS gönderilemedi')
      }
    } catch (error) {
      console.error('SMS error:', error)
      toast.error('SMS gönderimi başarısız')
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

  const getIbanBadge = (order) => {
    if (order.paymentMethod !== 'iban') return null
    if (order.ibanPayment?.status === 'notified') {
      return <Badge className="bg-emerald-600 text-white text-[10px]">🏦 {order.ibanPayment.senderName || 'IBAN Bildirildi'}</Badge>
    }
    if (order.ibanPayment?.status === 'waiting' || !order.ibanPayment?.status) {
      return <Badge className="bg-yellow-600 text-white text-[10px]">⏳ İsim Bekleniyor</Badge>
    }
    return null
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
      <div className="flex items-center justify-center p-8">
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
            Siparişler
          </h1>
          <p className="text-slate-400 text-sm md:text-base">Tüm siparişleri görüntüleyin ve yönetin</p>
        </div>

        {/* Risk Alert */}
        {flaggedCount > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 md:p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-200 font-medium text-sm md:text-base">{flaggedCount} riskli sipariş onay bekliyor</p>
              <p className="text-red-300/70 text-xs md:text-sm">Bu siparişlerin teslimatı durduruldu. Manuel onay veya iade gerekiyor.</p>
            </div>
            <Button 
              onClick={() => setRiskFilter('hold')}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm"
              size="sm"
            >
              Görüntüle
            </Button>
          </div>
        )}

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-white text-lg">Sipariş Listesi</CardTitle>
                <CardDescription className="text-slate-400 text-sm">Tüm sipariş geçmişi</CardDescription>
              </div>
              <div className="grid grid-cols-2 lg:flex gap-2 lg:gap-3">
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-full lg:w-[150px] bg-slate-800 border-slate-700 text-white text-sm">
                    <SelectValue placeholder="Risk filtrele" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">Tümü</SelectItem>
                    <SelectItem value="flagged" className="text-white">🚨 Riskli</SelectItem>
                    <SelectItem value="hold" className="text-white">⏸️ Beklemede</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[150px] bg-slate-800 border-slate-700 text-white text-sm">
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
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-full lg:w-[150px] bg-slate-800 border-slate-700 text-white text-sm">
                    <SelectValue placeholder="Ödeme yöntemi" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">Tüm Ödemeler</SelectItem>
                    <SelectItem value="iban" className="text-white">🏦 IBAN</SelectItem>
                    <SelectItem value="card" className="text-white">💳 Kredi Kartı</SelectItem>
                    <SelectItem value="balance" className="text-white">💰 Bakiye</SelectItem>
                    <SelectItem value="payyeen" className="text-white">💳 Payyeen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Arama Filtreleri */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="E-posta ile ara..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Telefon ile ara..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
              </div>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Sipariş ID ile ara..."
                  value={orderIdSearch}
                  onChange={(e) => setOrderIdSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="PUBG ID ile ara..."
                  value={playerIdSearch}
                  onChange={(e) => setPlayerIdSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
              </div>
            </div>
            
            {/* Aktif Filtre Göstergesi */}
            {(emailSearch || phoneSearch || orderIdSearch || playerIdSearch) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-slate-400 text-xs md:text-sm">Aktif filtreler:</span>
                {emailSearch && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs">
                    E-posta: {emailSearch.length > 15 ? emailSearch.slice(0, 15) + '...' : emailSearch}
                    <button onClick={() => setEmailSearch('')} className="ml-1 hover:text-blue-200">×</button>
                  </Badge>
                )}
                {phoneSearch && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                    Tel: {phoneSearch}
                    <button onClick={() => setPhoneSearch('')} className="ml-1 hover:text-green-200">×</button>
                  </Badge>
                )}
                {orderIdSearch && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 text-xs">
                    ID: {orderIdSearch}
                    <button onClick={() => setOrderIdSearch('')} className="ml-1 hover:text-purple-200">×</button>
                  </Badge>
                )}
                {playerIdSearch && (
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 text-xs">
                    PUBG ID: {playerIdSearch}
                    <button onClick={() => setPlayerIdSearch('')} className="ml-1 hover:text-orange-200">×</button>
                  </Badge>
                )}
                <button 
                  onClick={() => { setEmailSearch(''); setPhoneSearch(''); setOrderIdSearch(''); setPlayerIdSearch(''); }}
                  className="text-slate-500 hover:text-slate-300 text-xs ml-2"
                >
                  Temizle
                </button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 mx-auto text-slate-700 mb-4" />
                <p className="text-slate-400">Sipariş bulunamadı</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
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
                      {currentOrders.map((order) => (
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
                          <TableCell className="text-white">
                            {order.productTitle || order.accountTitle || '-'}
                            {(order.type === 'account' || order.accountId) && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Hesap</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            <div className="text-xs">{order.playerName || '-'}</div>
                            <div className="text-xs text-slate-500">{order.playerId || '-'}</div>
                          </TableCell>
                          <TableCell className="text-white font-semibold">
                            ₺{(order.amount || order.totalAmount || order.price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                            {getIbanBadge(order)}
                          </TableCell>
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
                            {order.delivery?.status === 'pending' && order.status === 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => handleAssignStock(order.id)}
                                disabled={processingOrder === order.id}
                                className="bg-blue-600 hover:bg-blue-700 text-xs"
                              >
                                <Package className="w-3 h-3 mr-1" />
                                {processingOrder === order.id ? 'Atanıyor...' : 'Stok Ata'}
                              </Button>
                            )}
                            {order.paymentMethod === 'iban' && order.status === 'pending' && (
                              <div className="flex flex-col gap-1">
                                {order.ibanPayment?.status === 'notified' && order.ibanPayment?.senderName ? (
                                  <>
                                    <div className="text-[10px] text-emerald-400 font-medium mb-1">
                                      🏦 {order.ibanPayment.senderName}
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={async () => {
                                          if (!confirm('IBAN ödemesini onaylamak istediğinize emin misiniz?')) return;
                                          setProcessingOrder(order.id);
                                          try {
                                            const token = localStorage.getItem('adminToken');
                                            const res = await fetch(`/api/admin/orders/${order.id}/approve-iban`, {
                                              method: 'POST',
                                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                              body: JSON.stringify({})
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                              toast.success('IBAN ödemesi onaylandı!');
                                              fetchOrders();
                                            } else {
                                              toast.error(data.error || 'Onaylama başarısız');
                                            }
                                          } catch (err) { toast.error('Hata oluştu'); }
                                          finally { setProcessingOrder(null); }
                                        }}
                                        disabled={processingOrder === order.id}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                                      >
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {processingOrder === order.id ? '...' : 'IBAN Onayla'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={async () => {
                                          if (!confirm('IBAN ödemesini reddetmek istediğinize emin misiniz?')) return;
                                          setProcessingOrder(order.id);
                                          try {
                                            const token = localStorage.getItem('adminToken');
                                            const res = await fetch(`/api/admin/orders/${order.id}/reject-iban`, {
                                              method: 'POST',
                                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                              body: JSON.stringify({})
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                              toast.success('IBAN ödemesi reddedildi');
                                              fetchOrders();
                                            } else {
                                              toast.error(data.error || 'İşlem başarısız');
                                            }
                                          } catch (err) { toast.error('Hata oluştu'); }
                                          finally { setProcessingOrder(null); }
                                        }}
                                        disabled={processingOrder === order.id}
                                        className="text-xs"
                                      >
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Ret
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-[10px] text-yellow-400">
                                    ⏳ Bildirim bekleniyor
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-800">
                  {currentOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className={`p-4 space-y-3 ${order.risk?.status === 'FLAGGED' ? 'bg-red-950/20' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {order.productTitle || order.accountTitle || '-'}
                          </p>
                          <p 
                            className="text-slate-500 text-xs font-mono cursor-pointer hover:text-blue-400"
                            onClick={() => openOrderDetail(order)}
                          >
                            #{order.id.substring(0, 8)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(order.status)}
                          {(order.type === 'account' || order.accountId) && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Hesap</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-slate-300 text-xs">{order.playerName || '-'}</p>
                          <p className="text-slate-500 text-xs">ID: {order.playerId || '-'}</p>
                        </div>
                        <p className="text-white font-bold">₺{(order.amount || order.totalAmount || order.price || 0).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {getRiskBadge(order)}
                        {getDeliveryBadge(order)}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-slate-500 text-xs">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                        <div className="flex gap-2">
                          {order.delivery?.status === 'hold' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveOrder(order.id)}
                                disabled={processingOrder === order.id}
                                className="bg-green-600 hover:bg-green-700 text-xs h-7 px-2"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRefundOrder(order.id)}
                                disabled={processingOrder === order.id}
                                className="text-xs h-7 px-2"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {order.delivery?.status === 'pending' && order.status === 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => handleAssignStock(order.id)}
                              disabled={processingOrder === order.id}
                              className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
                            >
                              <Package className="w-3 h-3 mr-1" />
                              {processingOrder === order.id ? '...' : 'Stok'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOrderDetail(order)}
                            className="border-slate-700 text-slate-300 text-xs h-7"
                          >
                            Detay
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800 px-4 md:px-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
                    <span className="text-slate-400 text-xs sm:text-sm">
                      Toplam {filteredOrders.length} sipariş
                    </span>
                    <div className="flex items-center gap-2">
                      <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[70px] sm:w-[80px] bg-slate-800 border-slate-700 text-white text-xs sm:text-sm h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="10" className="text-white">10</SelectItem>
                          <SelectItem value="20" className="text-white">20</SelectItem>
                          <SelectItem value="50" className="text-white">50</SelectItem>
                          <SelectItem value="100" className="text-white">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-slate-400 text-xs sm:text-sm">/sayfa</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-slate-400 text-xs sm:text-sm mr-2 sm:mr-4">
                      {currentPage}/{totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="hidden sm:flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="text-slate-500 px-1">...</span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className={`h-8 w-8 p-0 ${currentPage === page 
                              ? "bg-blue-600 hover:bg-blue-700 text-white" 
                              : "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"}`}
                          >
                            {page}
                          </Button>
                        )
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h2 className="text-lg md:text-xl font-bold text-white">Sipariş Detayı</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {/* Customer Info Section */}
              <div className="bg-blue-900/20 rounded-lg p-3 md:p-4 border border-blue-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="text-white font-medium text-sm md:text-base">Müşteri Bilgileri</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">İsim</p>
                    <p className="text-white text-sm md:text-base truncate">{selectedOrder.userName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">E-posta</p>
                    <p className="text-white text-sm md:text-base truncate">{selectedOrder.userEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs md:text-sm">Telefon</p>
                    <p className="text-white text-sm md:text-base">{selectedOrder.userPhone || '-'}</p>
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
                  <p className="text-white">
                    {selectedOrder.productTitle || selectedOrder.accountTitle || '-'}
                    {(selectedOrder.type === 'account' || selectedOrder.accountId) && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">Hesap</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Oyuncu</p>
                  <p className="text-white">
                    {selectedOrder.playerName ? `${selectedOrder.playerName} (${selectedOrder.playerId})` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Tutar</p>
                  <p className="text-white font-bold">₺{(selectedOrder.amount || selectedOrder.totalAmount || selectedOrder.price || 0).toFixed(2)}</p>
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

              {/* Stok Bekliyor durumundaki siparişler için Stok Seçme + Ata */}
              {selectedOrder.delivery?.status === 'pending' && selectedOrder.status === 'paid' && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  {/* Account orders için stok seçme dropdown */}
                  {selectedOrder.accountId && (
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Atanacak Hesap Stoğu Seçin:
                      </label>
                      {loadingStocks ? (
                        <div className="text-sm text-slate-400">Stoklar yükleniyor...</div>
                      ) : availableStocks.length > 0 ? (
                        <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Stok seçin..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {availableStocks.map((stock) => (
                              <SelectItem key={stock.id} value={stock.id} className="text-white hover:bg-slate-700">
                                {stock.credentials?.substring(0, 50)}... (Stok ID: {stock.id.substring(0, 8)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm text-red-400">⚠️ Bu hesap için mevcut stok yok</div>
                      )}
                    </div>
                  )}
                  
                  <Button
                    onClick={() => handleAssignStock(selectedOrder.id)}
                    disabled={processingOrder === selectedOrder.id || (selectedOrder.accountId && !selectedStockId)}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    {processingOrder === selectedOrder.id ? 'Stok Atanıyor...' : 'Stok Ata'}
                  </Button>
                </div>
              )}
              
              {/* Manuel SMS Gönder Butonu */}
              {selectedOrder.status === 'paid' && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => handleSendSms(selectedOrder.id)}
                    disabled={processingOrder === selectedOrder.id}
                    variant="outline"
                    className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {processingOrder === selectedOrder.id ? 'SMS Gönderiliyor...' : 'Manuel SMS Gönder'}
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
