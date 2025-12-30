'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  FileText,
  Search,
  ShieldCheck,
  ShieldAlert,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Ban,
  ChevronRight,
  Home,
  RefreshCw,
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

const STATUS_CONFIG = {
  CLEAR: { label: 'Temiz', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  SUSPICIOUS: { label: 'Şüpheli', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  FLAGGED: { label: 'Riskli', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  BLOCKED: { label: 'Engellendi', color: 'bg-red-500/20 text-red-400', icon: XCircle }
}

export default function RiskLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchLogs()
  }, [page, statusFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30'
      })
      if (statusFilter) params.append('status', statusFilter)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)

      const response = await fetch(`/api/admin/risk/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
        setTotal(data.meta?.total || 0)
      }
    } catch (error) {
      console.error('Error fetching risk logs:', error)
      toast.error('Loglar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUsername')
    router.push('/admin/login')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  const getScoreColor = (score) => {
    if (score <= 29) return 'text-green-400'
    if (score <= 59) return 'text-yellow-400'
    return 'text-red-400'
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
          <Link href="/admin/blacklist" className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Ban className="w-4 h-4" />
            Kara Liste
          </Link>
          <Link href="/admin/risk-logs" className="flex items-center gap-2 px-4 py-2 text-white bg-slate-800 rounded-lg transition-colors">
            <FileText className="w-4 h-4 text-cyan-500" />
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
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
            <Link href="/admin" className="hover:text-white">Dashboard</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Risk Logları</span>
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-cyan-500" />
            Risk Logları
          </h1>
          <p className="text-slate-400 mt-1">Tüm sipariş risk değerlendirmelerini görüntüleyin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const Icon = config.icon
            const count = logs.filter(l => l.status === status || l.actualStatus === status).length
            return (
              <Card key={status} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${config.color.split(' ')[1]}`} />
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
            <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Tüm durumlar" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="">Tüm durumlar</SelectItem>
                  <SelectItem value="CLEAR">Temiz</SelectItem>
                  <SelectItem value="SUSPICIOUS">Şüpheli</SelectItem>
                  <SelectItem value="FLAGGED">Riskli</SelectItem>
                  <SelectItem value="BLOCKED">Engellendi</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Başlangıç"
                />
                <span className="text-slate-500">-</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Bitiş"
                />
              </div>
              
              <Button type="submit" variant="secondary">
                <Search className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
              <Button type="button" variant="outline" onClick={() => { setStatusFilter(''); setFromDate(''); setToDate(''); setPage(1); fetchLogs(); }}>
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
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Risk logu bulunamadı</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400">Sipariş</TableHead>
                    <TableHead className="text-slate-400">Skor</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400">IP</TableHead>
                    <TableHead className="text-slate-400">Mod</TableHead>
                    <TableHead className="text-slate-400 text-right">Detay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.CLEAR
                    const StatusIcon = statusConfig.icon
                    return (
                      <TableRow key={log.id} className="border-slate-800">
                        <TableCell className="text-slate-400 text-sm">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          {log.order ? (
                            <Link href={`/admin/orders`} className="text-blue-400 hover:underline">
                              {log.orderId?.substring(0, 8)}...
                            </Link>
                          ) : (
                            <span className="text-slate-500">{log.orderId?.substring(0, 8) || '-'}...</span>
                          )}
                          {log.order && (
                            <p className="text-xs text-slate-500 mt-1">₺{log.order.amount}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xl font-bold ${getScoreColor(log.score)}`}>
                            {log.score}
                          </span>
                          <span className="text-slate-500 text-sm">/100</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">
                          {log.ip || '-'}
                        </TableCell>
                        <TableCell>
                          {log.isTestMode ? (
                            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                              TEST
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                              CANLI
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedLog(log); setDetailDialogOpen(true); }}
                            className="text-slate-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {total > 30 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800">
                <p className="text-sm text-slate-400">
                  Toplam {total} log
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
                    disabled={page * 30 >= total}
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-500" />
              Risk Analizi Detayı
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 py-4">
              {/* Score Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-slate-400 text-sm">Risk Skoru</p>
                  <p className={`text-3xl font-bold ${getScoreColor(selectedLog.score)}`}>
                    {selectedLog.score}
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-slate-400 text-sm">Durum</p>
                  <p className={`text-lg font-semibold ${STATUS_CONFIG[selectedLog.status]?.color.split(' ')[1] || 'text-white'}`}>
                    {STATUS_CONFIG[selectedLog.status]?.label || selectedLog.status}
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg text-center">
                  <p className="text-slate-400 text-sm">Mod</p>
                  <p className={`text-lg font-semibold ${selectedLog.isTestMode ? 'text-yellow-400' : 'text-green-400'}`}>
                    {selectedLog.isTestMode ? 'TEST' : 'CANLI'}
                  </p>
                </div>
              </div>

              {/* Order Info */}
              {selectedLog.order && (
                <div className="p-4 bg-slate-800 rounded-lg">
                  <p className="text-slate-400 text-sm mb-2">Sipariş Bilgisi</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">ID:</span>
                      <span className="text-white ml-2">{selectedLog.orderId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tutar:</span>
                      <span className="text-white ml-2">₺{selectedLog.order.amount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ürün:</span>
                      <span className="text-white ml-2">{selectedLog.order.productTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Durum:</span>
                      <span className="text-white ml-2">{selectedLog.order.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Info */}
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-2">Teknik Bilgi</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">IP:</span>
                    <span className="text-white ml-2 font-mono">{selectedLog.ip || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">User Agent:</span>
                    <span className="text-white ml-2 text-xs break-all">{selectedLog.userAgent || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tarih:</span>
                    <span className="text-white ml-2">{formatDate(selectedLog.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Risk Reasons */}
              <div className="p-4 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-sm mb-3">Risk Sebepleri</p>
                {selectedLog.reasons && selectedLog.reasons.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLog.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-900 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span className="text-white text-sm">{reason.label}</span>
                        </div>
                        <span className="text-red-400 font-semibold">+{reason.points}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Risk sebebi yok</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
