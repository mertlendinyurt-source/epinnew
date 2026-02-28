'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

function IbanPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')

  const [step, setStep] = useState('payment') // 'payment' | 'waiting'
  const [senderName, setSenderName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const [dots, setDots] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  const IBAN = 'TR16 0006 4000 0014 3790 3852 51'
  const IBAN_RAW = 'TR1600064000001437903852 51'
  const IBAN_NAME = 'PİNLY ELEKTRONİK HİZMET TİCARET A.Ş'

  // Waiting animation dots
  useEffect(() => {
    if (step === 'waiting') {
      const dotInterval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 500)
      return () => clearInterval(dotInterval)
    }
  }, [step])

  // Poll order status when waiting
  useEffect(() => {
    if (step === 'waiting' && orderId) {
      const pollInterval = setInterval(async () => {
        try {
          const token = localStorage.getItem('userToken')
          const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({})
          })
          const data = await res.json()
          if (data.success && data.data.status === 'paid') {
            clearInterval(pollInterval)
            // Redirect to success page (for Google Ads conversion)
            window.location.href = `/payment/success?orderId=${orderId}`
          }
        } catch (err) {
          console.error('Poll error:', err)
        }
      }, 5000) // Poll every 5 seconds

      // Elapsed time counter
      const timeInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)

      return () => {
        clearInterval(pollInterval)
        clearInterval(timeInterval)
      }
    }
  }, [step, orderId])

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} kopyalandı!`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleNotifyPayment = async () => {
    if (!senderName.trim() || senderName.trim().length < 3) {
      toast.error('Lütfen gönderici ad soyad bilgisini girin')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('userToken')
      const res = await fetch(`/api/orders/${orderId}/iban-notify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ senderName: senderName.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setStep('waiting')
        toast.success('Ödeme bildiriminiz alındı!')
      } else {
        toast.error(data.error || 'Bildirim gönderilemedi')
      }
    } catch (err) {
      toast.error('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Sipariş bulunamadı</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-blue-600 rounded-lg text-white font-semibold">Ana Sayfaya Dön</button>
        </div>
      </div>
    )
  }

  // WAITING SCREEN
  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="max-w-md w-full text-center">
          {/* Animated loading spinner */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">İşleminiz Kontrol Ediliyor{dots}</h1>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <p className="text-yellow-300 font-semibold text-sm mb-2">⚠️ Bu sayfayı kapatmayın!</p>
            <p className="text-yellow-200/70 text-xs">Sayfayı kapatırsanız siparişiniz teslim edilmeyebilir.</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 mb-4">
            <p className="text-slate-400 text-sm mb-2">Ödemeniz kontrol ediliyor, bu işlem genellikle</p>
            <p className="text-white text-3xl font-bold mb-2">10 dakika</p>
            <p className="text-slate-400 text-sm">kadar sürebilir.</p>
            
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-500 text-xs">Geçen süre: <span className="text-white font-mono">{formatTime(elapsedTime)}</span></p>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
            <p className="text-slate-500 text-xs">Sipariş No: <span className="font-mono text-slate-400">{orderId?.substring(0, 12)}...</span></p>
          </div>

          {/* Kırmızı Uyarı */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4">
            <p className="text-red-400 font-bold text-sm mb-1">❌ Ödeme yapmadıysanız onaylanmayacaktır!</p>
            <p className="text-red-300/70 text-xs">Havale/EFT yapmadan ödeme bildirimi göndermeniz durumunda siparişiniz otomatik olarak onaylanmayacak ve iptal edilecektir.</p>
          </div>

          {/* Siteye Geri Dön */}
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-sm transition-all"
          >
            ← Siteye Geri Dön
          </button>
        </div>
      </div>
    )
  }

  // PAYMENT SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-3">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Havale / EFT ile Ödeme</h1>
          <p className="text-slate-400 text-sm mt-1">Aşağıdaki hesaba havale yapın</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-lg rounded-2xl border border-slate-700 overflow-hidden">
          {/* Amount */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-5 text-center">
            <p className="text-emerald-100 text-sm mb-1">Ödenecek Tutar</p>
            <p className="text-white text-4xl font-black">₺{amount ? Number(amount).toFixed(2) : '0.00'}</p>
          </div>

          <div className="p-5 space-y-4">
            {/* IBAN */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">IBAN Numarası</span>
                <button 
                  onClick={() => handleCopy(IBAN.replace(/\s/g, ''), 'IBAN')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    copied === 'IBAN' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {copied === 'IBAN' ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-white font-mono text-base md:text-lg font-bold tracking-wider">{IBAN}</p>
            </div>

            {/* Account Name */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Hesap Adı</span>
                <button 
                  onClick={() => handleCopy(IBAN_NAME, 'Ad')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    copied === 'Ad' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {copied === 'Ad' ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-white font-semibold text-sm">{IBAN_NAME}</p>
            </div>

            {/* Amount to copy */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Tutar</span>
                <button 
                  onClick={() => handleCopy(amount || '0', 'Tutar')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    copied === 'Tutar' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {copied === 'Tutar' ? '✓ Kopyalandı' : 'Kopyala'}
                </button>
              </div>
              <p className="text-white font-bold text-lg">₺{amount ? Number(amount).toFixed(2) : '0.00'}</p>
            </div>

            {/* Sender Name Input */}
            <div className="pt-3 border-t border-slate-700">
              <label className="block text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2">
                Gönderici Ad Soyad <span className="text-red-400">*</span> <span className="text-red-400 text-[10px] normal-case">(Zorunlu alan)</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Havale yapan kişinin adı soyadı"
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:ring-1 outline-none transition-all ${
                  senderName.trim().length > 0 && senderName.trim().length < 3 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
                required
              />
              {senderName.trim().length > 0 && senderName.trim().length < 3 && (
                <p className="text-red-400 text-xs mt-1">⚠️ Ad soyad en az 3 karakter olmalıdır</p>
              )}
              <p className="text-slate-500 text-xs mt-1">Havaleyi yapan kişinin bankadaki ad soyadını girin</p>
            </div>

            {/* Notify Button */}
            <button
              onClick={handleNotifyPayment}
              disabled={loading || !senderName.trim()}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                loading || !senderName.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-[1.02]'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Gönderiliyor...
                </span>
              ) : (
                '✅ Ödemeyi Yaptım, Bildir'
              )}
            </button>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <h3 className="text-blue-400 font-semibold text-sm mb-2">ℹ️ Nasıl çalışır?</h3>
              <ol className="text-slate-400 text-xs space-y-1.5">
                <li>1. Yukarıdaki IBAN'a belirtilen tutarı havale/EFT yapın</li>
                <li>2. Gönderici ad soyadını girin ve "Ödemeyi Bildir" butonuna tıklayın</li>
                <li>3. Ödemeniz kontrol edilecek ve onaylandığında siparişiniz teslim edilecektir</li>
              </ol>
            </div>

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-xs font-medium">
                ⚠️ Tutarı kuruşuna kadar doğru girin. Farklı tutar göndermeniz durumunda ödemeniz onaylanmayabilir.
              </p>
            </div>
          </div>
        </div>

        {/* Order info */}
        <div className="mt-4 text-center">
          <p className="text-slate-600 text-xs">Sipariş No: <span className="font-mono text-slate-500">{orderId?.substring(0, 16)}...</span></p>
        </div>
      </div>
    </div>
  )
}

export default function IbanPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    }>
      <IbanPaymentContent />
    </Suspense>
  )
}
