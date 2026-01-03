'use client'

import dynamic from 'next/dynamic'

// Client-side only render - SSR kapatıldı
const PaymentSuccessContent = dynamic(() => import('./PaymentSuccessContent'), {
  ssr: false,
  loading: () => null // Boş loading - component hemen yüklenecek
})

export default function PaymentSuccess() {
  return <PaymentSuccessContent />
}
