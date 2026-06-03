import './globals.css'
import CrispChat from '../components/CrispChat'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr';
const FAVICON_PATH = '/uploads/favicon/2bbe8446-e4c4-47bd-9cf1-1d5eedea2b32.png';

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
    template: '%s | PINLY'
  },
  description: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir. Güvenli ödeme, hızlı teslimat.',
  keywords: ['dijital kod', 'oyun kodu', 'UC satın al', 'PUBG UC', 'oyun içi satın alma', 'dijital pin', 'PINLY'],
  authors: [{ name: 'PINLY' }],
  creator: 'PINLY',
  publisher: 'PINLY',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: BASE_URL,
    siteName: 'PINLY',
    title: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
    description: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.',
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'PINLY - Dijital Kod ve Oyun Satış Platformu',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
    description: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.',
    images: [`${BASE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '',
  },
  icons: {
    icon: [
      { url: FAVICON_PATH, type: 'image/png', sizes: '48x48' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '32x32' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '16x16' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '192x192' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: FAVICON_PATH, sizes: '180x180', type: 'image/png' },
    ],
    shortcut: FAVICON_PATH,
  },
  manifest: '/manifest.json',
  other: {
    'msapplication-TileColor': '#f97316',
    'msapplication-TileImage': FAVICON_PATH,
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PINLY',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description: 'Dijital kod ve oyun satış platformu',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Turkish'
  },
  sameAs: []
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PINLY',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BASE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M97FFKWS');`
          }}
        />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1731753641595741');
fbq('track', 'PageView');`
          }}
        />
        <noscript>
          <img height="1" width="1" style={{display:'none'}}
            src="https://www.facebook.com/tr?id=1731753641595741&ev=PageView&noscript=1"
          />
        </noscript>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://client.crisp.chat" />
        <link rel="canonical" href={BASE_URL} />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-M97FFKWS"
            height="0" 
            width="0" 
            style={{display: 'none', visibility: 'hidden'}}
          />
        </noscript>
        
        {children}
        
        {/* Crisp Chat - Mobil uyumlu, "Destek" yazılı */}
        <CrispChat />
      </body>
    </html>
  )
}
