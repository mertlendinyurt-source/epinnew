'use client'

import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'

function PaymentFailedContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="bg-slate-900/50 border-slate-800 max-w-md w-full">
        <CardHeader className="text-center">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-white text-3xl">Ödeme Başarısız</CardTitle>
          <CardDescription className="text-slate-400 text-lg">
            Ödeme işlemi tamamlanamadı
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {orderId && (
            <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-sm text-slate-400 mb-1">Sipariş Numarası</div>
              <div className="text-white font-mono font-bold">{orderId}</div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-400">
            <p className="font-semibold mb-1">Ödeme işlemi başarısız oldu</p>
            <p className="text-xs">Lütfen ödeme bilgilerinizi kontrol edip tekrar deneyin.</p>
          </div>

          {/* BANKA BAKIM UYARISI */}
          <div className="relative overflow-hidden rounded-xl border-2 border-yellow-500">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 via-red-600/20 to-yellow-600/20" />
            <div className="relative p-4 bg-gradient-to-r from-yellow-900/60 to-red-900/40">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🚧</span>
                <h3 className="text-yellow-300 font-black text-base uppercase tracking-wide">Banka Bakım Bildirimi</h3>
                <span className="text-xl">🚧</span>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-yellow-500/40">
                <p className="text-white font-bold text-sm leading-relaxed">
                  🏦 Garanti Bankası ödeme sistemleri şu anda bakımdadır.
                </p>
                <p className="text-yellow-300 font-bold text-sm mt-2">
                  💳 Lütfen farklı bir banka kartı ile tekrar deneyiniz.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 text-sm">
            <p className="font-semibold text-white mb-2">Olası Nedenler:</p>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>• Yetersiz bakiye</li>
              <li>• Kart bilgileri hatalı</li>
              <li>• 3D Secure doğrulaması başarısız</li>
              <li>• Banka tarafından işlem engellendi</li>
              <li>• İşlem zaman aşımına uğradı</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              Tekrar Dene
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full border-slate-700 text-white hover:bg-slate-800"
            >
              Ana Sayfaya Dön
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentFailed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  )
}
