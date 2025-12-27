'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ArrowLeft, Search, Download, Filter, RefreshCw, Shield, User, Package, Settings, Ticket } from 'lucide-react';

// Action type colors and labels
const ACTION_CONFIG = {
  'product.create': { label: 'Ürün Oluşturuldu', color: 'bg-green-500/20 text-green-400', icon: Package },
  'product.update': { label: 'Ürün Güncellendi', color: 'bg-blue-500/20 text-blue-400', icon: Package },
  'product.delete': { label: 'Ürün Silindi', color: 'bg-red-500/20 text-red-400', icon: Package },
  'stock.add': { label: 'Stok Eklendi', color: 'bg-green-500/20 text-green-400', icon: Package },
  'stock.assign': { label: 'Stok Atandı', color: 'bg-purple-500/20 text-purple-400', icon: Package },
  'order.status_change': { label: 'Sipariş Durumu Değişti', color: 'bg-yellow-500/20 text-yellow-400', icon: Package },
  'settings.site_update': { label: 'Site Ayarları Güncellendi', color: 'bg-blue-500/20 text-blue-400', icon: Settings },
  'settings.oauth_update': { label: 'OAuth Ayarları Güncellendi', color: 'bg-blue-500/20 text-blue-400', icon: Settings },
  'settings.payment_update': { label: 'Ödeme Ayarları Güncellendi', color: 'bg-blue-500/20 text-blue-400', icon: Settings },
  'settings.email_update': { label: 'E-posta Ayarları Güncellendi', color: 'bg-blue-500/20 text-blue-400', icon: Settings },
  'user.create': { label: 'Kullanıcı Kaydı', color: 'bg-green-500/20 text-green-400', icon: User },
  'user.login': { label: 'Kullanıcı Girişi', color: 'bg-slate-500/20 text-slate-400', icon: User },
  'user.login_failed': { label: 'Başarısız Giriş', color: 'bg-red-500/20 text-red-400', icon: Shield },
  'admin.login': { label: 'Admin Girişi', color: 'bg-blue-500/20 text-blue-400', icon: Shield },
  'admin.login_failed': { label: 'Başarısız Admin Girişi', color: 'bg-red-500/20 text-red-400', icon: Shield },
  'ticket.create': { label: 'Destek Talebi Oluşturuldu', color: 'bg-yellow-500/20 text-yellow-400', icon: Ticket },
  'ticket.reply': { label: 'Destek Talebi Yanıtlandı', color: 'bg-blue-500/20 text-blue-400', icon: Ticket },
  'ticket.close': { label: 'Destek Talebi Kapatıldı', color: 'bg-slate-500/20 text-slate-400', icon: Ticket },
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ actionTypes: [], entityTypes: [] });
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role !== 'admin') {
          router.push('/');
          return;
        }
      } catch (e) {}
    }
    fetchLogs();
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: page.toString(), limit: '50' });
      if (selectedAction) params.set('action', selectedAction);
      if (selectedEntity) params.set('entityType', selectedEntity);

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
        setFilters(data.data.filters);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Loglar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      toast.error('Dışa aktarılacak log yok');
      return;
    }

    const headers = ['Tarih', 'İşlem', 'Kullanıcı', 'Tür', 'ID', 'IP', 'Detay'];
    const rows = logs.map(log => [
      new Date(log.createdAt).toLocaleString('tr-TR'),
      ACTION_CONFIG[log.action]?.label || log.action,
      log.actorId || '-',
      log.entityType || '-',
      log.entityId || '-',
      log.ip || '-',
      JSON.stringify(log.meta || {})
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Loglar dışa aktarıldı');
  };

  const getActionConfig = (action) => {
    return ACTION_CONFIG[action] || { label: action, color: 'bg-slate-500/20 text-slate-400', icon: Shield };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  Audit Logları
                </h1>
                <p className="text-sm text-gray-400">Sistem aktivite kayıtları</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => fetchLogs(pagination.page)}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Yenile
              </Button>
              <Button
                onClick={exportCSV}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Filtrele:</span>
              </div>
              
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setTimeout(() => fetchLogs(1), 100);
                }}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm İşlemler</option>
                {filters.actionTypes.map(action => (
                  <option key={action} value={action}>
                    {getActionConfig(action).label}
                  </option>
                ))}
              </select>

              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setTimeout(() => fetchLogs(1), 100);
                }}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Tüm Türler</option>
                {filters.entityTypes.map(entity => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>

              {(selectedAction || selectedEntity) && (
                <Button
                  onClick={() => {
                    setSelectedAction('');
                    setSelectedEntity('');
                    setTimeout(() => fetchLogs(1), 100);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                >
                  Temizle
                </Button>
              )}

              <div className="ml-auto text-sm text-gray-400">
                Toplam: {pagination.total} kayıt
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Henüz log kaydı yok</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">İşlem</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Detay</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {logs.map((log) => {
                      const config = getActionConfig(log.action);
                      const IconComponent = config.icon;
                      return (
                        <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${config.color} border-0 flex items-center gap-1 w-fit`}>
                              <IconComponent className="w-3 h-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {log.actorId ? (
                              <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                                {log.actorId.includes('@') ? log.actorId : `${log.actorId.slice(0, 8)}...`}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                            {log.meta && Object.keys(log.meta).length > 0 ? (
                              <span className="text-xs">
                                {Object.entries(log.meta).slice(0, 2).map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    <span className="text-gray-500">{key}:</span> {String(value).slice(0, 20)}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">
                            {log.ip || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <div className="text-sm text-gray-400">
                  Sayfa {pagination.page} / {pagination.pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    Önceki
                  </Button>
                  <Button
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
