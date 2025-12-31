'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { X, Gift, Clock, Sparkles } from 'lucide-react'

const DEFAULT_PRIZES = [
  { id: 1, name: '150₺', amount: 150, minOrder: 1500, color: '#FFD700' },
  { id: 2, name: '100₺', amount: 100, minOrder: 1000, color: '#FF6B00' },
  { id: 3, name: '50₺', amount: 50, minOrder: 500, color: '#3B82F6' },
  { id: 4, name: '25₺', amount: 25, minOrder: 250, color: '#10B981' },
  { id: 5, name: '10₺', amount: 10, minOrder: 100, color: '#8B5CF6' },
  { id: 6, name: 'Boş', amount: 0, minOrder: 0, color: '#6B7280' }
]

export default function SpinWheel({ isOpen, onClose, onSpinComplete }) {
  const [prizes, setPrizes] = useState(DEFAULT_PRIZES)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [canSpin, setCanSpin] = useState(true)
  const [nextSpinTime, setNextSpinTime] = useState(null)
  const [countdown, setCountdown] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      checkSpinStatus()
      fetchWheelSettings()
    }
  }, [isOpen])

  useEffect(() => {
    if (nextSpinTime) {
      const interval = setInterval(() => {
        const now = new Date()
        const target = new Date(nextSpinTime)
        const diff = target - now

        if (diff <= 0) {
          setCanSpin(true)
          setNextSpinTime(null)
          setCountdown('')
          clearInterval(interval)
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((diff % (1000 * 60)) / 1000)
          setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [nextSpinTime])

  useEffect(() => {
    if (canvasRef.current && prizes.length > 0) {
      drawWheel()
    }
  }, [prizes, rotation])

  const fetchWheelSettings = async () => {
    try {
      const response = await fetch('/api/spin-wheel/settings')
      const data = await response.json()
      if (data.success && data.data?.prizes) {
        setPrizes(data.data.prizes)
      }
    } catch (error) {
      console.error('Çark ayarları yüklenemedi:', error)
    }
  }

  const checkSpinStatus = async () => {
    const token = localStorage.getItem('userToken')
    if (!token) {
      setCanSpin(false)
      return
    }

    try {
      const response = await fetch('/api/user/discount-balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setCanSpin(data.data.canSpin)
        if (!data.data.canSpin && data.data.nextSpinTime) {
          setNextSpinTime(data.data.nextSpinTime)
        }
      }
    } catch (error) {
      console.error('Çevirme durumu kontrol edilemedi:', error)
    }
  }

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const sliceAngle = (2 * Math.PI) / prizes.length

    prizes.forEach((prize, index) => {
      const startAngle = index * sliceAngle + (rotation * Math.PI) / 180
      const endAngle = startAngle + sliceAngle

      // Draw slice
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = prize.color
      ctx.fill()
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw text
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px Arial'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 3
      ctx.fillText(prize.name, radius - 20, 5)
      ctx.restore()
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw pointer
    ctx.beginPath()
    ctx.moveTo(centerX + radius + 5, centerY)
    ctx.lineTo(centerX + radius - 20, centerY - 15)
    ctx.lineTo(centerX + radius - 20, centerY + 15)
    ctx.closePath()
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const spin = async () => {
    const token = localStorage.getItem('userToken')
    if (!token) {
      alert('Çark çevirmek için giriş yapmalısınız!')
      return
    }

    if (isSpinning || !canSpin) return

    setIsSpinning(true)
    setResult(null)

    try {
      const response = await fetch('/api/spin-wheel/spin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('JSON parse error:', text)
        throw new Error('Sunucu hatası, lütfen tekrar deneyin')
      }

      if (data.success) {
        // Find prize index
        const prizeIndex = prizes.findIndex(p => p.id === data.prize.id)
        const sliceAngle = 360 / prizes.length
        
        // Calculate target rotation (5 full spins + prize position)
        const targetRotation = 360 * 5 + (360 - (prizeIndex * sliceAngle + sliceAngle / 2))
        
        // Animate
        let currentRotation = rotation
        const duration = 4000
        const startTime = Date.now()
        
        const animate = () => {
          const elapsed = Date.now() - startTime
          const progress = Math.min(elapsed / duration, 1)
          
          // Easing function (ease out cubic)
          const easeOut = 1 - Math.pow(1 - progress, 3)
          
          currentRotation = rotation + targetRotation * easeOut
          setRotation(currentRotation % 360)
          
          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            setIsSpinning(false)
            setResult(data.prize)
            setCanSpin(false)
            
            if (data.prize.amount > 0) {
              setShowConfetti(true)
              setTimeout(() => setShowConfetti(false), 3000)
            }
            
            if (onSpinComplete) {
              onSpinComplete(data.prize)
            }
          }
        }
        
        animate()
      } else {
        setIsSpinning(false)
        alert(data.error || 'Bir hata oluştu')
        if (data.nextSpinTime) {
          setCanSpin(false)
          setNextSpinTime(data.nextSpinTime)
        }
      }
    } catch (error) {
      setIsSpinning(false)
      alert('Bir hata oluştu, lütfen tekrar deneyin')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isSpinning ? onClose : undefined}
      />
      
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '10px',
                height: '10px',
                backgroundColor: ['#FFD700', '#FF6B00', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'][Math.floor(Math.random() * 6)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-yellow-600 to-orange-600 p-4">
          <button
            onClick={onClose}
            disabled={isSpinning}
            className="absolute right-3 top-3 text-white/80 hover:text-white disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <h2 className="text-2xl font-bold text-white">GÜNLÜK ŞANS!</h2>
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <p className="text-white/80 text-sm">Her gün 1 ücretsiz çevirme hakkı</p>
          </div>
        </div>

        {/* Wheel */}
        <div className="p-6 flex flex-col items-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="drop-shadow-2xl"
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl text-center w-full ${
              result.amount > 0 
                ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30' 
                : 'bg-slate-800/50 border border-slate-700'
            }`}>
              {result.amount > 0 ? (
                <>
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-xl font-bold text-green-400">TEBRİKLER!</p>
                  <p className="text-2xl font-bold text-white mt-1">{result.amount}₺ İndirim Kazandınız!</p>
                  <p className="text-slate-400 text-sm mt-2">
                    {result.minOrder}₺ ve üzeri alışverişlerde geçerli
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    7 gün içinde kullanılmalı
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">😔</div>
                  <p className="text-lg text-slate-400">Maalesef boş çıktı</p>
                  <p className="text-slate-500 text-sm mt-1">Yarın tekrar deneyin!</p>
                </>
              )}
            </div>
          )}

          {/* Spin Button or Countdown */}
          {!result && (
            <div className="mt-4 w-full">
              {canSpin ? (
                <Button
                  onClick={spin}
                  disabled={isSpinning}
                  className="w-full py-6 text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">🎡</span>
                      Çevriliyor...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Gift className="w-6 h-6" />
                      ÇEVİR!
                    </span>
                  )}
                </Button>
              ) : (
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-slate-400 text-sm mb-2">Sonraki çevirme hakkınız:</p>
                  <p className="text-2xl font-bold text-white font-mono">{countdown || 'Yükleniyor...'}</p>
                </div>
              )}
            </div>
          )}

          {/* Close button after result */}
          {result && (
            <Button
              onClick={onClose}
              className="mt-4 w-full bg-slate-700 hover:bg-slate-600"
            >
              {result.amount > 0 ? 'Alışverişe Git' : 'Kapat'}
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 px-4 py-3 text-center border-t border-slate-700">
          <p className="text-slate-500 text-xs">
            💡 İndirimler hesabınıza otomatik eklenir
          </p>
        </div>
      </div>

      {/* Confetti Animation CSS */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  )
}
