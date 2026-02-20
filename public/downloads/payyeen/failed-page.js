'use client'

import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentFailed() {
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

          <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-700 text-sm text-amber-400">
            <p className="font-semibold mb-1">⚠️ Garanti Bankası Kartları</p>
            <p className="text-xs">Garanti bankası sanal kart ve banka kartları ile ödeme yapılamamaktadır. Lütfen başka bir banka kartı ile tekrar deneyin.</p>
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