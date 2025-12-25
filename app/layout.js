import './globals.css'

export const metadata = {
  title: 'PUBG UC Store - En Ucuz UC Satış Sitesi',
  description: 'PUBG Mobile UC satın al. Anında teslimat, güvenli ödeme. En uygun fiyatlarla UC paketleri.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
      </body>
    </html>
  )
}