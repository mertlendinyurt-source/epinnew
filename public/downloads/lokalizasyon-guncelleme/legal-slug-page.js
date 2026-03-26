'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, ChevronRight, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

export default function LegalPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    fetchPage();
    fetchSiteSettings();
  }, [slug]);

  const fetchPage = async () => {
    try {
      const response = await fetch(`/api/legal/${slug}`);
      const data = await response.json();
      
      if (data.success) {
        setPage(data.data);
      } else {
        setPage(null);
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      setPage(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const response = await fetch('/api/site/settings');
      const data = await response.json();
      if (data.success) {
        setSiteSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  // Render markdown content with premium styling
  const renderContent = (content) => {
    if (!content) return null;
    
    return content.split('\n').map((line, i) => {
      // H1 - Main title (skip as we have hero)
      if (line.startsWith('# ')) {
        return null;
      }
      // H2 - Section headers
      if (line.startsWith('## ')) {
        return (
          <h2 key={i} className="text-2xl font-bold text-white mt-12 mb-6 pb-3 border-b border-white/10">
            {line.slice(3)}
          </h2>
        );
      }
      // H3 - Subsection headers
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-xl font-semibold text-white mt-8 mb-4">
            {line.slice(4)}
          </h3>
        );
      }
      // List items
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="text-white/70 ml-6 mb-2 relative before:content-['•'] before:absolute before:-left-4 before:text-blue-400">
            {line.slice(2)}
          </li>
        );
      }
      // Numbered list (1. 2. etc)
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\./)[1];
        const text = line.replace(/^\d+\.\s/, '');
        return (
          <li key={i} className="text-white/70 ml-6 mb-2 relative">
            <span className="absolute -left-6 text-blue-400 font-semibold">{num}.</span>
            {text}
          </li>
        );
      }
      // Horizontal rule
      if (line === '---') {
        return <hr key={i} className="border-white/10 my-8" />;
      }
      // Italic/Note text
      if (line.startsWith('*') && line.endsWith('*') && line.length > 2) {
        return (
          <p key={i} className="text-white/40 italic text-sm mt-6 p-4 bg-white/5 rounded-lg border-l-4 border-blue-500/50">
            {line.slice(1, -1)}
          </p>
        );
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-4" />;
      }
      // Bold text handling
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      // Regular paragraph
      return (
        <p 
          key={i} 
          className="text-white/70 mb-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Yükleniyor...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-4xl">📄</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Sayfa Bulunamadı</h1>
          <p className="text-white/60 mb-6">Aradığınız sayfa mevcut değil veya kaldırılmış olabilir.</p>
          <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700">
            <Home className="w-4 h-4 mr-2" />
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12151a]">
      {/* Hero Section */}
      <div className="relative">
        {/* Background with blur */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: siteSettings?.heroImage 
                ? `url(${siteSettings.heroImage})`
                : 'url(/uploads/bg-pubg.jpg)',
              filter: 'blur(8px)',
              transform: 'scale(1.1)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-[#12151a]" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Top Navigation */}
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Ana Sayfa</span>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-8">
              <Link href="/" className="text-white/50 hover:text-white transition-colors">
                Anasayfa
              </Link>
              <ChevronRight className="w-4 h-4 text-white/30" />
              <span className="text-white/50">Kurumsal/Künye</span>
              <ChevronRight className="w-4 h-4 text-white/30" />
              <span className="text-blue-400">{page.title}</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {page.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/50">
              {page.effectiveDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Yürürlük Tarihi: {new Date(page.effectiveDate).toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
              {page.updatedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Son Güncelleme: {new Date(page.updatedAt).toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 -mt-8">
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-[#1e2229] rounded-2xl border border-white/10 p-8 md:p-12 shadow-2xl">
            <article className="prose prose-invert max-w-none">
              {renderContent(page.content)}
            </article>
          </div>
        </div>
      </div>

      {/* Full Footer */}
      <footer className="bg-[#0a0c0f] border-t border-white/10 pt-12 pb-6">
        <div className="max-w-6xl mx-auto px-4">
          {/* Kurumsal Bilgiler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 pb-8 border-b border-white/10">
            {/* Vergi / Ticaret Sicil */}
            <div className="space-y-2">
              <h4 className="text-cyan-400 text-xs font-medium tracking-wide">Ticaret Sicil No</h4>
              <p className="text-white/80 text-sm font-semibold">541409</p>
              <p className="text-white/50 text-xs">Vergi No: 7300897060</p>
              <p className="text-white/50 text-xs">Mersis No: 0730089706000001</p>
            </div>

            {/* Unvan */}
            <div className="space-y-2">
              <h4 className="text-cyan-400 text-xs font-medium tracking-wide">Unvan</h4>
              <p className="text-white/80 text-sm font-semibold leading-snug">
                PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ
              </p>
            </div>

            {/* Adres */}
            <div className="space-y-2">
              <h4 className="text-cyan-400 text-xs font-medium tracking-wide">Adres</h4>
              <p className="text-white/80 text-sm leading-snug">
                Kızılırmak Mah. Dumlupınar Bul.<br/>
                No: 3C-1 İç Kapı No: 160<br/>
                Çankaya / ANKARA
              </p>
            </div>

            {/* İletişim */}
            <div className="space-y-2">
              <h4 className="text-cyan-400 text-xs font-medium tracking-wide">İletişim</h4>
              <div className="space-y-1">
                <p className="text-white/80 text-sm">E-Posta: info@pinly.com.tr</p>
                <p className="text-white/80 text-sm">Tel: 0850 346 9671</p>
              </div>
            </div>
          </div>

          {/* Ödeme Yöntemleri */}
          <div className="py-8 border-b border-white/10">
            <p className="text-white/30 text-xs text-center mb-4 tracking-widest">ÖDEME YÖNTEMLERİ</p>
            <div className="flex flex-wrap justify-center items-center gap-6">
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-yellow-400 font-bold text-sm">SSL</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-white font-bold text-xs">BKM</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">iyzico</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-orange-500 font-bold text-sm">MC</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">VISA</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-xs">AMEX</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 h-10 flex items-center justify-center">
                <span className="text-blue-500 font-bold text-sm">troy</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs">© 2026 PINLY. Tüm hakları saklıdır.</p>
            <p className="text-white/30 text-xs text-center">PİNLY ELEKTRONİK HİZMETLER TİCARET A.Ş.</p>
            <p className="text-white/30 text-xs text-right">PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
