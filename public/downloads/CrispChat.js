'use client';

import { useEffect } from 'react';

export default function CrispChat() {
  useEffect(() => {
    // Crisp'i yükle
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "a12ff9e6-9855-45b3-8d75-227252b9c05d";
    
    // Script zaten yüklü mü kontrol et
    if (!document.getElementById('crisp-script')) {
      const script = document.createElement('script');
      script.id = 'crisp-script';
      script.src = 'https://client.crisp.chat/l.js';
      script.async = true;
      document.head.appendChild(script);
    }
    
    // Mobil etiket oluştur
    const createMobileLabel = () => {
      if (window.innerWidth >= 768) return;
      if (document.getElementById('crisp-support-label')) return;
      
      const label = document.createElement('div');
      label.id = 'crisp-support-label';
      label.innerHTML = '💬 Destek';
      Object.assign(label.style, {
        display: 'none',
        position: 'fixed',
        bottom: '65px',
        right: '10px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 2px 10px rgba(102, 126, 234, 0.4)',
        zIndex: '999998',
        cursor: 'pointer',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'system-ui, sans-serif'
      });
      
      label.onclick = () => {
        if (window.$crisp) {
          window.$crisp.push(["do", "chat:open"]);
        }
      };
      
      document.body.appendChild(label);
    };
    
    // Crisp butonu görünür mü kontrol et (DOM bazlı)
    const isCrispButtonVisible = () => {
      // Tüm olası Crisp buton seçicilerini kontrol et
      const selectors = [
        '.crisp-client .cc-1brb6 .cc-1yy0g',
        '.crisp-client .cc-kxkl',
        '.crisp-client [data-id="crisp-chatbox"]',
        '.crisp-client'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          
          // Element görünür mü kontrol et
          const isVisible = 
            style.display !== 'none' && 
            style.visibility !== 'hidden' && 
            style.opacity !== '0' &&
            rect.width > 0 && 
            rect.height > 0;
          
          if (isVisible) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Etiket görünürlüğünü güncelle
    const updateLabel = () => {
      const label = document.getElementById('crisp-support-label');
      if (!label) return;
      
      // Masaüstünde gizle
      if (window.innerWidth >= 768) {
        label.style.display = 'none';
        return;
      }
      
      // Crisp butonu görünür değilse etiketi de gizle
      if (!isCrispButtonVisible()) {
        label.style.display = 'none';
        return;
      }
      
      // Chat açık mı kontrol et
      let isOpen = false;
      try {
        if (window.$crisp && window.$crisp.is) {
          isOpen = window.$crisp.is("chat:opened");
        }
      } catch (e) {}
      
      label.style.display = isOpen ? 'none' : 'flex';
    };
    
    // Crisp event'leri
    const setupEvents = () => {
      if (!window.$crisp) return;
      
      try {
        window.$crisp.push(["on", "chat:opened", () => {
          const label = document.getElementById('crisp-support-label');
          if (label) label.style.display = 'none';
        }]);
        
        window.$crisp.push(["on", "chat:closed", () => {
          setTimeout(updateLabel, 100);
        }]);
      } catch (e) {}
    };
    
    // Başlat
    const init = () => {
      createMobileLabel();
      setupEvents();
      updateLabel();
    };
    
    // 2 saniye sonra başlat
    const initTimer = setTimeout(init, 2000);
    
    // Her 2 saniyede kontrol (daha sık)
    const checkInterval = setInterval(() => {
      if (window.innerWidth < 768) {
        if (!document.getElementById('crisp-support-label')) {
          createMobileLabel();
        }
        updateLabel();
      }
    }, 2000);
    
    // Resize event
    const handleResize = () => updateLabel();
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      clearTimeout(initTimer);
      clearInterval(checkInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <style jsx global>{`
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
        
        .crisp-client .cc-1brb6 .cc-unoo,
        .crisp-client .cc-1brb6 .cc-nsge {
          display: none !important;
        }
        
        .crisp-client .cc-1brb6[data-full-view="true"] .cc-1yy0g {
          bottom: 65px !important;
          right: 8px !important;
          left: 8px !important;
          width: auto !important;
          max-height: 60vh !important;
          border-radius: 12px !important;
        }
      }
    `}</style>
  );
}
