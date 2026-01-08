'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ArrowLeft, Plus, Trash2, Star, Check, X } from 'lucide-react';

export default function ReviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newReview, setNewReview] = useState({
    userName: '',
    rating: 5,
    comment: '',
    approved: true,
    customDate: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/reviews?game=pubg', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setReviews(result.data || []);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Yorumlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!newReview.userName.trim()) {
      toast.error('Kullanıcı adı zorunludur');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          game: 'pubg',
          ...newReview
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Yorum eklendi!');
        setNewReview({ userName: '', rating: 5, comment: '', approved: true, customDate: '' });
        setShowForm(false);
        loadReviews();
      } else {
        toast.error(result.error || 'Ekleme hatası');
      }
    } catch (error) {
      console.error('Add error:', error);
      toast.error('Ekleme hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Yorum silindi!');
        loadReviews();
      } else {
        toast.error(result.error || 'Silme hatası');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Silme hatası');
    }
  };

  const StarRating = ({ rating, onChange, readonly = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`}
          />
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Star className="w-7 h-7 md:w-8 md:h-8 text-yellow-500" />
            Değerlendirme Yönetimi
          </h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Müşteri yorumlarını yönetin</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yorum Ekle
        </Button>
      </div>

      {/* Add Review Form */}
      {showForm && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Yeni Yorum Ekle</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Kullanıcı Adı</Label>
              <Input
                value={newReview.userName}
                onChange={(e) => setNewReview({ ...newReview, userName: e.target.value })}
                placeholder="Misafir veya kullanıcı adı"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Puan</Label>
              <StarRating 
                rating={newReview.rating} 
                onChange={(rating) => setNewReview({ ...newReview, rating })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-slate-300 mb-2 block text-sm">Tarih (Opsiyonel)</Label>
              <Input
                type="datetime-local"
                value={newReview.customDate}
                onChange={(e) => setNewReview({ ...newReview, customDate: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Boş bırakılırsa şu anki tarih kullanılır</p>
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-slate-300 mb-2 block text-sm">Yorum</Label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Yorum metni..."
              className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newReview.approved}
                onChange={(e) => setNewReview({ ...newReview, approved: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-300">Onaylı (hemen görünsün)</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleAddReview}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {saving ? 'Ekleniyor...' : 'Ekle'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white w-full sm:w-auto"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Yorumlar ({reviews.length})</h2>
        </div>

        {reviews.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Henüz yorum eklenmemiş.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {reviews.map((review) => (
              <div key={review.id} className="px-4 md:px-6 py-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm md:text-base">
                      {review.userName?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm md:text-base">{review.userName || 'Misafir'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${review.approved ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                          {review.approved ? 'Onaylı' : 'Beklemede'}
                        </span>
                      </div>
                      <StarRating rating={review.rating} readonly />
                      {review.comment && (
                        <p className="text-slate-300 mt-2 text-sm">{review.comment}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteReview(review.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
