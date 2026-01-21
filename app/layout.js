import './globals.css'

const BASE_URL = 'https://pinly.com.tr';

// Admin panelden yüklenen favicon yolu
// Bu değer cPanel'de değiştirilebilir
const FAVICON_PATH = '/uploads/favicon/2bbe8446-e4c4-47bd-9cf1-1d5eedea2b32.png';

// Comprehensive SEO metadata
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
  
  // Canonical URL
  alternates: {
    canonical: BASE_URL,
  },
  
  // OpenGraph
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
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
    description: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.',
    images: [`${BASE_URL}/og-image.png`],
  },
  
  // Robots
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
  
  // Verification (will be set from admin panel)
  verification: {
    google: '', // Will be injected dynamically
  },
  
  // Icons - Google Search için kapsamlı ayarlar
  icons: {
    // Standard favicon
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '32x32' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '16x16' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '192x192' },
      { url: FAVICON_PATH, type: 'image/png', sizes: '512x512' },
    ],
    // Apple Touch Icon
    apple: [
      { url: FAVICON_PATH, sizes: '180x180', type: 'image/png' },
    ],
    // Other icons
    other: [
      {
        rel: 'mask-icon',
        url: FAVICON_PATH,
        color: '#f97316',
      },
    ],
  },
  
  // Web App Manifest
  manifest: '/manifest.json',
  
  // Theme Color
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)', color: '#f97316' },
  ],
  
  // Apple Web App
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PINLY',
  },
}

// Schema.org JSON-LD
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
        {/* End Google Tag Manager */}
        
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
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* Canonical URL */}
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
        {/* End Google Tag Manager (noscript) */}
        
        {children}

        {/* Crisp Chat - Mobil uyumlu, küçük boyut */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.$crisp=[];
              window.CRISP_WEBSITE_ID="a12ff9e6-9855-45b3-8d75-227252b9c05d";
              
              // Crisp ayarları - küçük ve mobil uyumlu
              window.CRISP_READY_TRIGGER = function() {
                // Chat kutusunu küçült
                $crisp.push(["config", "container:index", [1]]);
                
                // Mobilde daha küçük göster
                if (window.innerWidth < 768) {
                  $crisp.push(["config", "position:reverse", [true]]);
                }
              };
              
              (function(){
                var d=document;
                var s=d.createElement("script");
                s.src="https://client.crisp.chat/l.js";
                s.async=1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
            `
          }}
        />
        
        {/* Crisp Chat Stilleri - Küçük ve şık */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Crisp chat butonunu küçült */
              .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
                width: 54px !important;
                height: 54px !important;
              }
              
              /* Mobilde daha da küçük */
              @media (max-width: 768px) {
                .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
                  width: 48px !important;
                  height: 48px !important;
                  bottom: 15px !important;
                  right: 15px !important;
                }
                
                /* Chat penceresi mobilde tam ekran olmasın */
                .crisp-client .cc-1brb6[data-full-view="true"] .cc-1yy0g {
                  bottom: 70px !important;
                  right: 10px !important;
                  left: 10px !important;
                  width: auto !important;
                  max-height: 70vh !important;
                }
              }
              
              /* Hover efekti */
              .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf:hover {
                transform: scale(1.05);
              }
            `
          }}
        />
      </body>
    </html>
  )
}
