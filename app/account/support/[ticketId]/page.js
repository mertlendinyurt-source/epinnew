'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, Lock, Clock, CheckCircle, AlertCircle, User, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const categoryLabels = {
  'odeme': 'Ödeme',
  'teslimat': 'Teslimat',
  'hesap': 'Hesap',
  'diger': 'Diğer'
};

const statusConfig = {
  'waiting_admin': { label: 'Admin Yanıtı Bekleniyor', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  'waiting_user': { label: 'Yanıtınız Bekleniyor', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
  'closed': { label: 'Kapatıldı', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle }
};

export default function TicketDetail() {
  const router = useRouter();
  const params = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicket();
  }, [params.ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTicket = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch(`/api/support/tickets/${params.ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (response.status === 404) {
        toast.error('Talep bulunamadı');
        router.push('/account/support');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setTicket(data.data.ticket);
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu maksimum 5MB olabilir');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file) => {
    const token = localStorage.getItem('userToken');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'support');

    const response = await fetch('/api/support/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    }
    throw new Error(data.error || 'Fotoğraf yüklenemedi');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedImage) {
      toast.error('Mesaj veya fotoğraf gerekli');
      return;
    }

    const token = localStorage.getItem('userToken');
    if (!token) {
      router.push('/');
      return;
    }

    setSending(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadImage(selectedImage);
        } catch (uploadError) {
          toast.error('Fotoğraf yüklenemedi: ' + uploadError.message);
          setUploadingImage(false);
          setSending(false);
          return;
        }
        setUploadingImage(false);
      }

      const response = await fetch(`/api/support/tickets/${params.ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: newMessage || (imageUrl ? '📷 Fotoğraf gönderildi' : ''),
          imageUrl 
        })
      });

      const data = await response.json();

      if (response.status === 403) {
        toast.error(data.error || 'Şu anda mesaj gönderemezsiniz');
        return;
      }

      if (data.success) {
        setNewMessage('');
        removeSelectedImage();
        // Refresh ticket to get updated status
        await fetchTicket();
        toast.success('Mesajınız gönderildi');
      } else {
        toast.error(data.error || 'Mesaj gönderilemedi');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const statusInfo = statusConfig[ticket.status] || statusConfig['waiting_admin'];
  const StatusIcon = statusInfo.icon;
  const canReply = ticket.userCanReply && ticket.status !== 'closed';

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#1e2229] rounded-t-xl border border-white/10 border-b-0 p-4">
        <div className="flex items-start gap-4">
          <Link 
            href="/account/support"
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/70">
                {categoryLabels[ticket.category] || ticket.category}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-white truncate">{ticket.subject}</h1>
            <p className="text-white/50 text-sm mt-1">
              Talep No: #{ticket.id.slice(-8)} • {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[#12151a] border-x border-white/10 p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                }`}>
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Headphones className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-[#1e2229] border border-white/10 text-white rounded-bl-md'
                }`}>
                  {/* Show image if exists */}
                  {msg.imageUrl && (
                    <a 
                      href={msg.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block mb-2"
                    >
                      <img 
                        src={msg.imageUrl} 
                        alt="Ek görsel" 
                        className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}
                  {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                </div>
              </div>
              
              {/* Timestamp */}
              <p className={`text-xs text-white/40 mt-1 ${msg.sender === 'user' ? 'text-right mr-10' : 'ml-10'}`}>
                {msg.sender === 'admin' && <span className="text-emerald-400 mr-1">Destek Ekibi</span>}
                {new Date(msg.createdAt).toLocaleString('tr-TR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[#1e2229] rounded-b-xl border border-white/10 border-t-0 p-4">
        {ticket.status === 'closed' ? (
          <div className="flex items-center justify-center gap-2 py-3 text-white/50">
            <Lock className="w-4 h-4" />
            <span>Bu talep kapatılmıştır. Yeni mesaj gönderemezsiniz.</span>
          </div>
        ) : !canReply ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-yellow-400 font-medium">Admin yanıtı bekleniyor</p>
                <p className="text-yellow-400/70 text-sm">Yanıt geldiğinde mesaj gönderebilirsiniz.</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-3">
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Seçilen görsel" 
                  className="max-h-32 rounded-lg border border-white/20"
                />
                <button
                  type="button"
                  onClick={removeSelectedImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Image Upload Button */}
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                variant="outline"
                className="px-3 border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                title="Fotoğraf ekle"
              >
                <ImagePlus className="w-5 h-5" />
              </Button>
              
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Mesajınızı yazın..."
                className="flex-1 px-4 py-3 rounded-lg bg-[#12151a] border border-white/10 text-white placeholder:text-white/40 focus:border-blue-500 focus:outline-none"
                disabled={sending}
              />
              <Button
                type="submit"
                disabled={sending || (!newMessage.trim() && !selectedImage)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            {uploadingImage && (
              <p className="text-xs text-blue-400 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Fotoğraf yükleniyor...
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
