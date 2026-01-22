'use client';

import { useEffect } from 'react';

export default function CrispChat() {
  useEffect(() => {
    // Crisp'i yükle
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "a12ff9e6-9855-45b3-8d75-227252b9c05d";
    
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
    
    // Crisp butonu görünür mü
    const isCrispButtonVisible = () => {
      const crispClient = document.querySelector('.crisp-client');
      if (!crispClient) return false;
      
      // Crisp client'ın style'ını kontrol et
      const style = window.getComputedStyle(crispClient);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      
      // İç buton elementini kontrol et
      const button = crispClient.querySelector('[class*="cc-"] > [class*="cc-"]');
      if (button) {
        const btnStyle = window.getComputedStyle(button);
        if (btnStyle.display === 'none' || btnStyle.visibility === 'hidden') {
          return false;
        }
      }
      
      return true;
    };
    
    // Etiket görünürlüğünü güncelle
    const updateLabel = () => {
      const label = document.getElementById('crisp-support-label');
      
      // Etiket yoksa oluştur
      if (!label && window.innerWidth < 768) {
        createMobileLabel();
        return setTimeout(updateLabel, 100);
      }
      
      if (!label) return;
      
      // Masaüstünde gizle
      if (window.innerWidth >= 768) {
        label.style.display = 'none';
        return;
      }
      
      // Crisp görünür değilse gizle
      const crispVisible = isCrispButtonVisible();
      if (!crispVisible) {
        label.style.display = 'none';
        return;
      }
      
      // Chat açık mı
      let isOpen = false;
      try {
        if (window.$crisp && window.$crisp.is) {
          isOpen = window.$crisp.is("chat:opened");
        }
      } catch (e) {}
      
      // Göster veya gizle
      label.style.display = isOpen ? 'none' : 'flex';
    };
    
    // MutationObserver - Crisp DOM değişikliklerini izle
    let observer = null;
    const setupObserver = () => {
      const crispClient = document.querySelector('.crisp-client');
      if (!crispClient || observer) return;
      
      observer = new MutationObserver(() => {
        setTimeout(updateLabel, 50);
      });
      
      observer.observe(crispClient, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
      });
    };
    
    // Body'yi izle - Crisp eklendiğinde
    let bodyObserver = null;
    const setupBodyObserver = () => {
      bodyObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length) {
            const crisp = document.querySelector('.crisp-client');
            if (crisp) {
              setupObserver();
              updateLabel();
            }
          }
        }
      });
      
      bodyObserver.observe(document.body, {
        childList: true,
        subtree: false
      });
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
      setupBodyObserver();
      setupObserver();
      updateLabel();
    };
    
    // 1.5 saniye sonra başlat
    const initTimer = setTimeout(init, 1500);
    
    // Yedek: Her 1 saniyede kontrol
    const checkInterval = setInterval(() => {
      if (window.innerWidth < 768) {
        updateLabel();
        setupObserver(); // Observer'ı tekrar kur (Crisp yeniden yüklendiyse)
      }
    }, 1000);
    
    // Resize
    window.addEventListener('resize', updateLabel);
    
    // Cleanup
    return () => {
      clearTimeout(initTimer);
      clearInterval(checkInterval);
      window.removeEventListener('resize', updateLabel);
      if (observer) observer.disconnect();
      if (bodyObserver) bodyObserver.disconnect();
    };
  }, []);
  
  return (
    <style jsx global>{`
      .crisp-client .cc-1brb6 .cc-1yy0g .cc-1m2mf {
        width: 54px !important;
        height: 54px !important;
      }
      
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
