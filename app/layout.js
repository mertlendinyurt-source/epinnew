import './globals.css'

// Default metadata (will be overridden by page-level metadata)
export const metadata = {
  title: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
  description: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.',
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
