'use client'

import dynamic from 'next/dynamic'
import { CheckCircle, Shield, User, Mail, Receipt, Hash, Package, Copy, Phone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Skeleton placeholder
const Skeleton = ({ width = 'w-32' }) => (
  <span className={`animate-pulse bg-slate-600 rounded h-5 ${width} inline-block`}></span>
)

// Loading ekranı - JavaScript yüklenirken bu görünecek
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
    <Card className="bg-slate-900/50 border-slate-800 max-w-lg w-full shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
          <CheckCircle className="w-14 h-14 text-white" />
        </div>
        <CardTitle className="text-white text-3xl font-bold">Ödeme Başarılı!</CardTitle>
        <CardDescription className="text-slate-400 text-lg">
          Siparişiniz başarıyla oluşturuldu
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
        <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-4">
          {/* Sipariş Numarası */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Hash className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Sipariş Numarası</div>
                <Skeleton width="w-48" />
              </div>
            </div>
            <button className="p-2 rounded-lg bg-slate-700">
              <Copy className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Müşteri Adı */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Müşteri Adı</div>
              <Skeleton width="w-36" />
            </div>
          </div>

          {/* E-posta */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">E-posta Adresi</div>
              <Skeleton width="w-44" />
            </div>
          </div>

          {/* Telefon */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Telefon Numarası</div>
              <Skeleton width="w-32" />
            </div>
          </div>

          {/* Ürün */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Ürün</div>
              <Skeleton width="w-40" />
            </div>
          </div>

          {/* Tutar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Sipariş Tutarı</div>
              <span className="animate-pulse bg-slate-600 rounded h-6 w-28 inline-block"></span>
            </div>
          </div>
        </div>

        {/* Butonlar */}
        <div className="space-y-3 pt-2">
          <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold">
            <Package className="w-5 h-5 mr-2" />
            Siparişlerime Git
          </Button>
          <Button variant="outline" className="w-full h-12 border-slate-600 text-slate-300">
            Ana Sayfaya Dön
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)

// Client-side only render
const PaymentSuccessContent = dynamic(() => import('./PaymentSuccessContent'), {
  ssr: false,
  loading: () => <LoadingScreen />
})

export default function PaymentSuccess() {
  return <PaymentSuccessContent />
}
