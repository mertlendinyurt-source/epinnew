'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Headphones, ArrowLeft, Send, Lock, User, Loader2, XCircle, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export default function AdminTicketDetail() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }
    fetchTicket()
  }, [params.ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/support/tickets/${params.ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }

      if (response.status === 404) {
        toast.error('Talep bulunamadı')
        router.push('/admin/support')
        return
      }

      const data = await response.json()
      if (data.success) {
        setTicket(data.data.ticket)
        setMessages(data.data.messages)
      }
    } catch (error) {
      console.error('Error fetching ticket:', error)
      toast.error('Talep yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu maksimum 5MB olabilir')
      return
    }

    setSelectedImage(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file) => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'support')

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    const data = await response.json()
    if (data.success) {
      return data.data.url
    }
    throw new Error(data.error || 'Fotoğraf yüklenemedi')
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedImage) {
      toast.error('Mesaj veya fotoğraf gerekli')
      return
    }

    setSending(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      let imageUrl = null

      // Upload image if selected
      if (selectedImage) {
        setUploadingImage(true)
        try {
          imageUrl = await uploadImage(selectedImage)
        } catch (uploadError) {
          toast.error('Fotoğraf yüklenemedi: ' + uploadError.message)
          setUploadingImage(false)
          setSending(false)
          return
        }
        setUploadingImage(false)
      }

      const response = await fetch(`/api/admin/support/tickets/${params.ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: newMessage || (imageUrl ? '📷 Fotoğraf' : ''),
          imageUrl 
        })
      })

      const data = await response.json()
      if (data.success) {
        setNewMessage('')
        removeSelectedImage()
        await fetchTicket()
        toast.success('Yanıt gönderildi')
      } else {
        toast.error(data.error || 'Yanıt gönderilemedi')
      }
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setSending(false)
    }
  }

  const handleCloseTicket = async () => {
    if (!confirm('Bu talebi kapatmak istediğinize emin misiniz?')) return

    setClosing(true)
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/support/tickets/${params.ticketId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Talep kapatıldı')
        await fetchTicket()
      } else {
        toast.error(data.error || 'Talep kapatılamadı')
      }
    } catch (error) {
      console.error('Close error:', error)
      toast.error('Bir hata oluştu')
    } finally {
      setClosing(false)
    }
  }

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig['waiting_admin']
    return (
      <Badge variant="outline" className={`${config.textColor} border-current text-xs`}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-2 md:gap-4">
            <Link
              href="/admin/support"
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-slate-500 text-xs md:text-sm">#{ticket?.id?.slice(-8)}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 text-xs md:text-sm">{categoryLabels[ticket?.category]}</span>
                {getStatusBadge(ticket?.status)}
              </div>
              <h1 className="text-base md:text-xl font-bold text-white truncate">{ticket?.subject}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 md:mt-2 text-xs md:text-sm">
                <span className="text-slate-400">
                  <span className="text-slate-500">Kullanıcı:</span> {ticket?.userName}
                </span>
                <span className="text-slate-400 truncate">
                  <span className="text-slate-500">Email:</span> {ticket?.userEmail}
                </span>
              </div>
            </div>
          </div>
          {ticket?.status !== 'closed' && (
            <Button
              onClick={handleCloseTicket}
              disabled={closing}
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 w-full sm:w-auto flex-shrink-0"
            >
              {closing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Talebi Kapat
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 bg-slate-950">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] sm:max-w-[70%]`}>
              <div className={`flex items-end gap-2 ${msg.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'admin' 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' 
                    : 'bg-blue-600'
                }`}>
                  {msg.sender === 'admin' ? (
                    <Headphones className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  ) : (
                    <User className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  )}
                </div>
                
                {/* Message Bubble */}
                <div className={`rounded-2xl px-3 md:px-4 py-2 md:py-3 ${
                  msg.sender === 'admin'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-slate-800 border border-slate-700 text-white rounded-bl-md'
                }`}>
                  <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
              </div>
              
              {/* Timestamp */}
              <p className={`text-[10px] md:text-xs text-slate-500 mt-1 ${msg.sender === 'admin' ? 'text-right mr-9 md:mr-10' : 'ml-9 md:ml-10'}`}>
                {msg.sender === 'admin' && msg.adminUsername && (
                  <span className="text-emerald-400 mr-1">{msg.adminUsername}</span>
                )}
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
      <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 p-3 md:p-4">
        {ticket?.status === 'closed' ? (
          <div className="flex items-center justify-center gap-2 py-2 md:py-3 text-slate-500 text-sm">
            <Lock className="w-4 h-4" />
            <span>Bu talep kapatılmıştır.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Yanıtınızı yazın..."
              className="flex-1 px-3 md:px-4 py-2 md:py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none text-sm"
              disabled={sending}
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-6"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
