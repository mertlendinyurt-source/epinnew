'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle, XCircle, Eye, Clock, User, Mail, Phone, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export default function AdminVerification() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchPendingVerifications()
  }, [])

  const fetchPendingVerifications = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/orders/pending-verification', {
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
      }
    } catch (error) {
      console.error('Error fetching verifications:', error)
      toast.error('Doğrulama listesi yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
    setActionType(null)
    setRejectionReason('')
  }

  const handleAction = async () => {
    if (!actionType || !selectedOrder) return

    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Lütfen red sebebini belirtin')
      return
    }

    setProcessing(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}/verify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: actionType,
          rejectionReason: actionType === 'reject' ? rejectionReason : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(actionType === 'approve' ? 'Doğrulama onaylandı ve stok atandı' : 'Doğrulama reddedildi')
        setShowDetailModal(false)
        setSelectedOrder(null)
        fetchPendingVerifications()
      } else {
        toast.error(data.error || 'İşlem başarısız')
      }
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR', {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-8 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-amber-500" />
                Doğrulama Bekleyen Siparişler
              </h1>
              <p className="text-slate-400 mt-2">Yüksek tutarlı siparişler için kimlik ve ödeme doğrulaması</p>
            </div>
            <Button onClick={() => router.push('/admin')} variant="outline">
              ← Admin Panele Dön
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Bekleyen Doğrulama</p>
                  <p className="text-3xl font-bold text-white">{orders.length}</p>
                </div>
                <Clock className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Toplam Tutar</p>
                  <p className="text-3xl font-bold text-white">
                    {orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(0)} TL
                  </p>
                </div>
                <CreditCard className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Ortalama Bekleme</p>
                  <p className="text-3xl font-bold text-white">
                    {orders.length > 0 
                      ? Math.floor((Date.now() - Math.min(...orders.map(o => new Date(o.verification.submittedAt).getTime()))) / (1000 * 60))
                      : 0} dk
                  </p>
                </div>
                <Clock className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Doğrulama Listesi</CardTitle>
            <CardDescription className="text-slate-400">
              3000 TL ve üzeri siparişler için güvenlik kontrolü
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Doğrulama bekleyen sipariş yok</p>
                <p className="text-slate-500 text-sm mt-2">Tüm siparişler işlenmiş durumda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-400">Sipariş No</TableHead>
                      <TableHead className="text-slate-400">Müşteri</TableHead>
                      <TableHead className="text-slate-400">Tutar</TableHead>
                      <TableHead className="text-slate-400">Gönderilme</TableHead>
                      <TableHead className="text-slate-400">Bekleme Süresi</TableHead>
                      <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const waitingTime = Math.floor((Date.now() - new Date(order.verification.submittedAt).getTime()) / (1000 * 60))
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-white">
                            {order.id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <div className="text-white">{order.userName || 'N/A'}</div>
                            <div className="text-xs text-slate-400">{order.userEmail}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                              {order.totalAmount?.toFixed(0)} TL
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {formatDate(order.verification.submittedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                waitingTime > 60 
                                  ? "bg-red-900/20 text-red-400 border-red-800"
                                  : waitingTime > 30
                                  ? "bg-amber-900/20 text-amber-400 border-amber-800"
                                  : "bg-blue-900/20 text-blue-400 border-blue-800"
                              }
                            >
                              {waitingTime} dakika
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleViewDetails(order)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              İncele
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              Doğrulama Detayları
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Sipariş: {selectedOrder?.id.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Müşteri Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ad Soyad:</span>
                    <span className="text-white font-semibold">{selectedOrder.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">E-posta:</span>
                    <span className="text-white">{selectedOrder.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telefon:</span>
                    <span className="text-white">{selectedOrder.customer?.phone || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Sipariş Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sipariş Tutarı:</span>
                    <span className="text-white font-bold text-lg">{selectedOrder.totalAmount?.toFixed(2)} TL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ürün:</span>
                    <span className="text-white">{selectedOrder.productTitle || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Player ID:</span>
                    <span className="text-white font-mono">{selectedOrder.playerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sipariş Tarihi:</span>
                    <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Belge Gönderilme:</span>
                    <span className="text-white">{formatDate(selectedOrder.verification.submittedAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identity Photo */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Kimlik Fotoğrafı</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.verification.identityPhoto ? (
                      <a 
                        href={selectedOrder.verification.identityPhoto} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={selectedOrder.verification.identityPhoto} 
                          alt="Kimlik" 
                          className="w-full rounded-lg border border-slate-600 hover:opacity-80 transition-opacity cursor-pointer"
                        />
                        <p className="text-xs text-blue-400 mt-2 text-center hover:underline">
                          Büyütmek için tıklayın
                        </p>
                      </a>
                    ) : (
                      <p className="text-slate-400 text-sm">Yüklenmemiş</p>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Receipt */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Ödeme Dekontu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedOrder.verification.paymentReceipt ? (
                      <a 
                        href={selectedOrder.verification.paymentReceipt} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={selectedOrder.verification.paymentReceipt} 
                          alt="Dekont" 
                          className="w-full rounded-lg border border-slate-600 hover:opacity-80 transition-opacity cursor-pointer"
                        />
                        <p className="text-xs text-blue-400 mt-2 text-center hover:underline">
                          Büyütmek için tıklayın
                        </p>
                      </a>
                    ) : (
                      <p className="text-slate-400 text-sm">Yüklenmemiş</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Action Section */}
              {!actionType && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => setActionType('approve')}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Onayla ve Stok Ata
                  </Button>
                  <Button
                    onClick={() => setActionType('reject')}
                    variant="destructive"
                    className="flex-1 h-12 text-base"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reddet
                  </Button>
                </div>
              )}

              {/* Rejection Form */}
              {actionType === 'reject' && (
                <Card className="bg-red-900/20 border-red-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Reddetme Sebebi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Neden reddedildiğini açıklayın (müşteriye gönderilecek)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAction}
                        disabled={processing || !rejectionReason.trim()}
                        variant="destructive"
                        className="flex-1"
                      >
                        {processing ? 'İşleniyor...' : 'Doğrulamayı Reddet'}
                      </Button>
                      <Button
                        onClick={() => setActionType(null)}
                        variant="outline"
                        disabled={processing}
                      >
                        İptal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approval Confirmation */}
              {actionType === 'approve' && (
                <Card className="bg-green-900/20 border-green-800">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Onay Onayı</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-300 text-sm">
                      Bu doğrulamayı onaylamak istediğinizden emin misiniz? 
                      <br />
                      <br />
                      <strong className="text-white">Yapılacak işlemler:</strong>
                    </p>
                    <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
                      <li>Doğrulama onaylanacak</li>
                      <li>Otomatik stok atanacak</li>
                      <li>Müşteriye email gönderilecek</li>
                      <li>Belgeler silinecek (güvenlik)</li>
                    </ul>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAction}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {processing ? 'İşleniyor...' : 'Onayla ve Devam Et'}
                      </Button>
                      <Button
                        onClick={() => setActionType(null)}
                        variant="outline"
                        disabled={processing}
                      >
                        İptal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
