'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Package, Shield, ChevronRight, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccountDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      // Fetch user profile
      const profileRes = await fetch('/api/account/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      if (profileData.success) {
        setUser(profileData.data);
      }

      // Fetch recent orders
      const ordersRes = await fetch('/api/account/orders/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setRecentOrders(ordersData.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Bekliyor', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
      completed: { label: 'Tamamlandı', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
      failed: { label: 'Başarısız', color: 'bg-red-500/20 text-red-400', icon: XCircle },
      processing: { label: 'İşleniyor', color: 'bg-blue-500/20 text-blue-400', icon: Loader },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-white/60">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/20 p-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Hoş geldin, {user?.firstName || user?.email?.split('@')[0] || 'Kullanıcı'}! 👋
        </h1>
        <p className="text-white/60">
          Hesap bilgilerinizi yönetin, siparişlerinizi takip edin.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e2229] rounded-xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-white">{user?.stats?.totalOrders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1e2229] rounded-xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Son Sipariş</p>
              <p className="text-sm font-medium text-white">
                {user?.stats?.lastOrderDate 
                  ? new Date(user.stats.lastOrderDate).toLocaleDateString('tr-TR')
                  : 'Henüz yok'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1e2229] rounded-xl border border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <User className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Üyelik</p>
              <p className="text-sm font-medium text-white">
                {user?.createdAt 
                  ? new Date(user.createdAt).toLocaleDateString('tr-TR')
                  : '-'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/account/profile" className="bg-[#1e2229] rounded-xl border border-white/10 p-5 hover:border-blue-500/50 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Profil Bilgileri</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </Link>

        <Link href="/account/orders" className="bg-[#1e2229] rounded-xl border border-white/10 p-5 hover:border-blue-500/50 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">Tüm Siparişler</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </Link>

        <Link href="/account/security" className="bg-[#1e2229] rounded-xl border border-white/10 p-5 hover:border-blue-500/50 transition-colors group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Güvenlik Ayarları</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-[#1e2229] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Son Siparişler</h2>
          <Link href="/account/orders" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            Tümünü Gör →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">Henüz siparişiniz bulunmuyor.</p>
            <Link href="/" className="text-blue-400 hover:underline text-sm mt-2 inline-block">
              Alışverişe Başla →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {recentOrders.map((order) => (
              <Link 
                key={order.id} 
                href={`/account/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{order.productTitle}</p>
                    <p className="text-white/50 text-sm">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')} • #{order.id.slice(-8)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(order.status)}
                  <p className="text-white font-semibold mt-1">₺{order.amount}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
