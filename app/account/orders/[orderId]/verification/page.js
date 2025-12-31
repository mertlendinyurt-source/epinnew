'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Upload, FileText, Image as ImageIcon, Shield, AlertCircle, CheckCircle, Eye, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function VerificationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.orderId

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [identityFile, setIdentityFile] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [identityPreview, setIdentityPreview] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('userToken')
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch(`/api/account/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setOrder(data.data)
      } else {
        toast({
          title: "Hata",
          description: "Sipariş bilgileri alınamadı",
          variant: "destructive"
        })
        router.push('/account/orders')
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Dosya çok büyük",
        description: "Maksimum dosya boyutu 5MB olmalıdır",
        variant: "destructive"
      })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Geçersiz dosya tipi",
        description: "Sadece JPG, PNG veya PDF dosyaları kabul edilir",
        variant: "destructive"
      })
      return
    }

    if (type === 'identity') {
      setIdentityFile(file)
      // Create preview for images only
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setIdentityPreview(reader.result)
        reader.readAsDataURL(file)
      } else {
        setIdentityPreview(null)
      }
    } else {
      setReceiptFile(file)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setReceiptPreview(reader.result)
        reader.readAsDataURL(file)
      } else {
        setReceiptPreview(null)
      }
    }
  }

  const handleSubmit = async () => {
    if (!identityFile || !receiptFile) {
      toast({
        title: "Eksik dosya",
        description: "Lütfen her iki belgeyi de yükleyin",
        variant: "destructive"
      })
      return
    }

    setUploading(true)

    try {
      const token = localStorage.getItem('userToken')
      if (!token) {
        toast({
          title: "Hata",
          description: "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.",
          variant: "destructive"
        })
        router.push('/')
        return
      }

      const formData = new FormData()
      formData.append('identityPhoto', identityFile)
      formData.append('paymentReceipt', receiptFile)

      const response = await fetch(`/api/account/orders/${orderId}/verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Başarılı!",
          description: "Doğrulama belgeleri yüklendi. Admin incelemesi bekleniyor.",
        })
        setTimeout(() => {
          router.push(`/account/orders/${orderId}`)
        }, 1500)
      } else {
        toast({
          title: "Hata",
          description: data.error || "Dosyalar yüklenemedi",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        title: "Hata",
        description: "Bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    )
  }

  if (!order || !order.verification?.required) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Doğrulama Gerekli Değil</h2>
            <p className="text-slate-400 mb-4">Bu sipariş için doğrulama gerekmemektedir.</p>
            <Button onClick={() => router.push('/account/orders')} className="w-full">
              Siparişlerime Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If already submitted
  if (order.verification.submittedAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900/50 border-slate-800 max-w-md w-full">
          <CardHeader className="text-center">
            {order.verification.status === 'approved' ? (
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            ) : order.verification.status === 'rejected' ? (
              <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            ) : (
              <Clock className="w-20 h-20 text-amber-500 mx-auto mb-4" />
            )}
            <CardTitle className="text-white text-2xl">
              {order.verification.status === 'approved' ? 'Doğrulama Onaylandı' :
               order.verification.status === 'rejected' ? 'Doğrulama Reddedildi' :
               'Doğrulama İnceleniyor'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.verification.status === 'pending' && (
              <p className="text-slate-400 text-center">
                Belgeleriniz admin tarafından inceleniyor. Lütfen bekleyin.
              </p>
            )}
            {order.verification.status === 'rejected' && order.verification.rejectionReason && (
              <div className="p-4 rounded-lg bg-red-900/20 border border-red-700">
                <p className="text-red-400 text-sm">
                  <strong>Red Sebebi:</strong> {order.verification.rejectionReason}
                </p>
              </div>
            )}
            <Button onClick={() => router.push(`/account/orders/${orderId}`)} className="w-full">
              Sipariş Detayına Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-amber-500" />
              <div>
                <CardTitle className="text-white text-2xl">Güvenlik Doğrulaması</CardTitle>
                <CardDescription className="text-slate-400">
                  Sipariş No: {orderId.slice(-8).toUpperCase()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info Box */}
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-2">Neden doğrulama isteniyor?</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Yüksek tutarlı siparişiniz (3000 TL ve üzeri) dolandırıcılık önleme kapsamındadır</li>
                    <li>• Kimlik ve ödeme doğrulaması yaparak hem sizi hem de kendimizi koruyoruz</li>
                    <li>• <strong>Belgeleriniz sadece bu işlem için kullanılacak ve onay/red sonrası silinecektir</strong></li>
                    <li>• Admin incelemesi genellikle 1-24 saat içinde tamamlanır</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Identity Photo Upload */}
            <div className="space-y-3">
              <label className="text-white font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Kimlik Fotoğrafı (TC Kimlik Kartı Ön Yüz)
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-600 transition-colors">
                {identityPreview ? (
                  <div className="space-y-3">
                    <img src={identityPreview} alt="Kimlik önizleme" className="max-h-48 mx-auto rounded" />
                    <p className="text-sm text-slate-400">{identityFile.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIdentityFile(null)
                        setIdentityPreview(null)
                      }}
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : identityFile ? (
                  <div className="space-y-3">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-400">{identityFile.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIdentityFile(null)}
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-300 mb-2">Kimlik fotoğrafı yükle</p>
                    <p className="text-xs text-slate-500 mb-3">JPG, PNG veya PDF (Max 5MB)</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, 'identity')}
                        className="hidden"
                      />
                      <span className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors inline-block">
                        Dosya Seç
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Payment Receipt Upload */}
            <div className="space-y-3">
              <label className="text-white font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Ödeme Dekontu / Ekran Görüntüsü
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-600 transition-colors">
                {receiptPreview ? (
                  <div className="space-y-3">
                    <img src={receiptPreview} alt="Dekont önizleme" className="max-h-48 mx-auto rounded" />
                    <p className="text-sm text-slate-400">{receiptFile.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReceiptFile(null)
                        setReceiptPreview(null)
                      }}
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : receiptFile ? (
                  <div className="space-y-3">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-400">{receiptFile.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReceiptFile(null)}
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-300 mb-2">Ödeme dekontu yükle</p>
                    <p className="text-xs text-slate-500 mb-3">JPG, PNG veya PDF (Max 5MB)</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(e, 'receipt')}
                        className="hidden"
                      />
                      <span className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors inline-block">
                        Dosya Seç
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!identityFile || !receiptFile || uploading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-12 text-base"
            >
              {uploading ? 'Yükleniyor...' : 'Belgeleri Gönder'}
            </Button>

            {/* Security Note */}
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-800">
              <p className="text-xs text-green-400 text-center">
                🔒 Belgeleriniz şifrelenmiş olarak güvenli sunucularımızda saklanır ve onay/red işlemi sonrası otomatik olarak silinir.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
