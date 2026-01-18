import './globals.css'

const BASE_URL = 'https://pinly.com.tr';

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
  
  // Icons
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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

        {/* Crisp Chat - Basit entegrasyon */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.$crisp=[];
              window.CRISP_WEBSITE_ID="a12ff9e6-9855-45b3-8d75-227252b9c05d";
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
        
        {/* Mobil için küçük "Canlı Destek" etiketi */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Sayfa yüklendiğinde küçük etiket ekle
              document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                  // Mobil kontrol
                  if (window.innerWidth < 768) {
                    // Küçük etiket oluştur
                    var label = document.createElement('div');
                    label.id = 'crisp-mobile-label';
                    label.innerHTML = '💬 Destek';
                    label.onclick = function() {
                      if (window.$crisp) {
                        $crisp.push(["do", "chat:open"]);
                      }
                      label.style.display = 'none';
                    };
                    document.body.appendChild(label);
                    
                    // Crisp açıldığında etiketi gizle
                    if (window.$crisp) {
                      $crisp.push(["on", "chat:opened", function() {
                        label.style.display = 'none';
                      }]);
                      $crisp.push(["on", "chat:closed", function() {
                        label.style.display = 'flex';
                      }]);
                    }
                  }
                }, 2000);
              });
            `
          }}
        />
        
        {/* Crisp ve etiket stilleri */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Masaüstü - Normal Crisp */
              .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
                width: 54px !important;
                height: 54px !important;
              }
              
              /* MOBİL */
              @media (max-width: 768px) {
                /* Crisp butonunu küçült */
                .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
                  width: 46px !important;
                  height: 46px !important;
                  bottom: 12px !important;
                  right: 12px !important;
                }
                
                /* Popup mesajını mobilde gizle */
                .crisp-client .cc-1brb6 .cc-unoo,
                .crisp-client .cc-1brb6 .cc-nsge {
                  display: none !important;
                }
                
                /* Chat penceresi */
                .crisp-client .cc-1brb6[data-full-view="true"] .cc-1yy0g {
                  bottom: 65px !important;
                  right: 8px !important;
                  left: 8px !important;
                  width: auto !important;
                  max-height: 60vh !important;
                  border-radius: 12px !important;
                }
              }
              
              /* Mobil "Destek" etiketi */
              #crisp-mobile-label {
                display: none;
                position: fixed;
                bottom: 65px;
                right: 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
                z-index: 999998;
                cursor: pointer;
                align-items: center;
                gap: 4px;
                animation: pulse-label 2s infinite;
              }
              
              @media (max-width: 768px) {
                #crisp-mobile-label {
                  display: flex;
                }
              }
              
              @keyframes pulse-label {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
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
