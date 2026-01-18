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
        
        {/* Crisp Chat - Head'de yükle */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.$crisp=[];window.CRISP_WEBSITE_ID="a12ff9e6-9855-45b3-8d75-227252b9c05d";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`
          }}
        />
        
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
        <link rel="preconnect" href="https://client.crisp.chat" />
        
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

        {/* Mobil destek etiketi - Sürekli kontrol */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Mobil değilse çık
                function isMobile() {
                  return window.innerWidth < 768;
                }
                
                // Etiket oluştur
                function createLabel() {
                  if (document.getElementById('mobile-support-label')) return;
                  
                  var label = document.createElement('div');
                  label.id = 'mobile-support-label';
                  label.innerHTML = '💬 Destek';
                  label.style.cssText = 'display:none;position:fixed;bottom:65px;right:10px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;box-shadow:0 2px 10px rgba(102,126,234,0.4);z-index:999998;cursor:pointer;align-items:center;gap:4px;font-family:system-ui,sans-serif;';
                  
                  label.onclick = function() {
                    if (window.$crisp) {
                      window.$crisp.push(["do", "chat:open"]);
                    }
                  };
                  
                  document.body.appendChild(label);
                  return label;
                }
                
                // Görünürlük güncelle
                function updateLabelVisibility() {
                  var label = document.getElementById('mobile-support-label');
                  if (!label) label = createLabel();
                  if (!label) return;
                  
                  // Mobil değilse gizle
                  if (!isMobile()) {
                    label.style.display = 'none';
                    return;
                  }
                  
                  // Chat açık mı kontrol et
                  var chatOpen = false;
                  try {
                    if (window.$crisp && window.$crisp.is) {
                      chatOpen = window.$crisp.is("chat:opened");
                    }
                  } catch(e) {}
                  
                  label.style.display = chatOpen ? 'none' : 'flex';
                }
                
                // Crisp olaylarını dinle
                function setupCrispEvents() {
                  if (!window.$crisp || !window.$crisp.push) return;
                  
                  try {
                    window.$crisp.push(["on", "chat:opened", function() {
                      var label = document.getElementById('mobile-support-label');
                      if (label) label.style.display = 'none';
                    }]);
                    
                    window.$crisp.push(["on", "chat:closed", function() {
                      if (isMobile()) {
                        var label = document.getElementById('mobile-support-label');
                        if (label) label.style.display = 'flex';
                      }
                    }]);
                  } catch(e) {}
                }
                
                // Başlat
                function init() {
                  createLabel();
                  setupCrispEvents();
                  updateLabelVisibility();
                }
                
                // Sayfa yüklenince başlat
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', function() {
                    setTimeout(init, 1500);
                  });
                } else {
                  setTimeout(init, 1500);
                }
                
                // Her 3 saniyede kontrol et (yedek)
                setInterval(function() {
                  if (isMobile()) {
                    updateLabelVisibility();
                  }
                }, 3000);
                
                // Resize olduğunda güncelle
                window.addEventListener('resize', updateLabelVisibility);
                
                // Sayfa görünür olduğunda güncelle
                document.addEventListener('visibilitychange', function() {
                  if (!document.hidden) {
                    setTimeout(updateLabelVisibility, 500);
                  }
                });
              })();
            `
          }}
        />
        
        {/* Crisp stilleri */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Masaüstü */
              .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
                width: 54px !important;
                height: 54px !important;
              }
              
              /* Mobil */
              @media (max-width: 768px) {
                .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
                  width: 46px !important;
                  height: 46px !important;
                  bottom: 12px !important;
                  right: 12px !important;
                }
                
                /* Popup gizle */
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
            `
          }}
        />
      </body>
    </html>
  )
}
