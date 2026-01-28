'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Headphones, Clock, CheckCircle, AlertCircle, Search, Loader2, Trash2, X, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

const categoryLabels = {
  'odeme': 'Ödeme',
  'teslimat': 'Teslimat',
  'hesap': 'Hesap',
  'diger': 'Diğer'
};

const statusConfig = {
  'waiting_admin': { label: 'Yanıt Bekliyor', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  'waiting_user': { label: 'Kullanıcı Bekleniyor', color: 'bg-blue-500', textColor: 'text-blue-500' },
  'closed': { label: 'Kapatıldı', color: 'bg-gray-500', textColor: 'text-gray-500' }
};

export default function AdminSupport() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false)
  const [selectedTickets, setSelectedTickets] = useState([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchTickets()
  }, [statusFilter])

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const url = statusFilter 
        ? `/api/admin/support/tickets?status=${statusFilter}` 
        : '/api/admin/support/tickets'
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }

      const data = await response.json()
      if (data.success) {
        setTickets(data.data)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Talepler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ticket.subject?.toLowerCase().includes(search) ||
      ticket.userEmail?.toLowerCase().includes(search) ||
      ticket.userName?.toLowerCase().includes(search) ||
      ticket.id?.toLowerCase().includes(search)
    );
  });

  // Toplu silme modunu aç - tüm ticketlar seçili başlar
  const startBulkDelete = () => {
    setBulkDeleteMode(true)
    setSelectedTickets(filteredTickets.map(t => t.id))
  }

  // Toplu silme modunu kapat
  const cancelBulkDelete = () => {
    setBulkDeleteMode(false)
    setSelectedTickets([])
  }

  // Ticket seçim toggle
  const toggleTicketSelection = (ticketId) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  // Tümünü seç/kaldır
  const toggleSelectAll = () => {
    if (selectedTickets.length === filteredTickets.length) {
      setSelectedTickets([])
    } else {
      setSelectedTickets(filteredTickets.map(t => t.id))
    }
  }

  // Toplu silme işlemi
  const handleBulkDelete = async () => {
    if (selectedTickets.length === 0) {
      toast.error('Silinecek talep seçilmedi')
      return
    }

    if (!confirm(`${selectedTickets.length} talep silinecek. Resimler dahil tüm veriler kalıcı olarak silinecek. Emin misiniz?`)) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/support/tickets/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticketIds: selectedTickets })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        setBulkDeleteMode(false)
        setSelectedTickets([])
        await fetchTickets()
      } else {
        toast.error(data.error || 'Silme işlemi başarısız')
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig['waiting_admin'];
    return (
      <Badge variant="outline" className={`${config.textColor} border-current text-xs`}>
        {config.label}
      </Badge>
    );
  };

  // Counts
  const waitingAdminCount = tickets.filter(t => t.status === 'waiting_admin').length;
  const waitingUserCount = tickets.filter(t => t.status === 'waiting_user').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  return (
    <div className="p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Headphones className="w-7 h-7 md:w-8 md:h-8 text-blue-500" />
          Destek Talepleri
        </h1>
        <p className="text-slate-400 text-sm md:text-base">Müşteri destek taleplerini yönetin</p>
      </div>

      {/* Stats Cards - Mobile: 3 columns, stacked */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
        <div 
          onClick={() => setStatusFilter(statusFilter === 'waiting_admin' ? '' : 'waiting_admin')}
          className={`bg-slate-900 border rounded-xl p-3 md:p-5 cursor-pointer transition-all ${
            statusFilter === 'waiting_admin' ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Yanıt Bekliyor</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-500">{waitingAdminCount}</p>
            </div>
            <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-500/30 hidden md:block" />
          </div>
        </div>
        <div 
          onClick={() => setStatusFilter(statusFilter === 'waiting_user' ? '' : 'waiting_user')}
          className={`bg-slate-900 border rounded-xl p-3 md:p-5 cursor-pointer transition-all ${
            statusFilter === 'waiting_user' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Kullanıcı Bekl.</p>
              <p className="text-xl md:text-2xl font-bold text-blue-500">{waitingUserCount}</p>
            </div>
            <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-blue-500/30 hidden md:block" />
          </div>
        </div>
        <div 
          onClick={() => setStatusFilter(statusFilter === 'closed' ? '' : 'closed')}
          className={`bg-slate-900 border rounded-xl p-3 md:p-5 cursor-pointer transition-all ${
            statusFilter === 'closed' ? 'border-gray-500 ring-2 ring-gray-500/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Kapatıldı</p>
              <p className="text-xl md:text-2xl font-bold text-gray-500">{closedCount}</p>
            </div>
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-gray-500/30 hidden md:block" />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Konu, kullanıcı veya ID ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-2">
          {statusFilter && (
            <Button
              variant="outline"
              onClick={() => setStatusFilter('')}
              className="border-slate-700 text-slate-300"
            >
              Filtreyi Temizle
            </Button>
          )}
          {!bulkDeleteMode ? (
            <Button
              variant="outline"
              onClick={startBulkDelete}
              className="border-red-700 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Toplu Sil
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={cancelBulkDelete}
                className="border-slate-700 text-slate-300"
              >
                <X className="w-4 h-4 mr-2" />
                İptal
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={deleting || selectedTickets.length === 0}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {selectedTickets.length} Talebi Sil
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Info */}
      {bulkDeleteMode && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-xl">
          <p className="text-red-300 text-sm">
            <strong>Toplu Silme Modu:</strong> Tüm talepler seçili. Silmek <strong>İSTEMEDİĞİNİZ</strong> taleplerin checkbox'ını kaldırın.
          </p>
          <p className="text-red-400/70 text-xs mt-1">
            Silinecek: {selectedTickets.length} talep (resimler dahil kalıcı olarak silinecek)
          </p>
        </div>
      )}

      {/* Tickets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {searchTerm || statusFilter ? 'Sonuç bulunamadı' : 'Henüz destek talebi yok'}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 md:px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Kullanıcı</th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Konu</th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Kategori</th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Durum</th>
                    <th className="px-4 md:px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Tarih</th>
                    <th className="px-4 md:px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{ticket.userName}</p>
                          <p className="text-slate-500 text-sm">{ticket.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <p className="text-white truncate max-w-xs">{ticket.subject}</p>
                        <p className="text-slate-500 text-xs">#{ticket.id.slice(-8)}</p>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className="text-slate-300">{categoryLabels[ticket.category] || ticket.category}</span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-slate-400 text-sm">
                        {new Date(ticket.updatedAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <Link href={`/admin/support/${ticket.id}`}>
                          <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                            Görüntüle
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-800">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{ticket.subject}</p>
                      <p className="text-slate-500 text-xs">#{ticket.id.slice(-8)}</p>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-slate-300">{ticket.userName}</p>
                      <p className="text-slate-500 text-xs">{ticket.userEmail}</p>
                    </div>
                    <span className="text-slate-500 text-xs px-2 py-1 bg-slate-800 rounded">
                      {categoryLabels[ticket.category] || ticket.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-500 text-xs">
                      {new Date(ticket.updatedAt).toLocaleDateString('tr-TR')}
                    </span>
                    <Link href={`/admin/support/${ticket.id}`}>
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white h-8 text-xs">
                        Görüntüle
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
