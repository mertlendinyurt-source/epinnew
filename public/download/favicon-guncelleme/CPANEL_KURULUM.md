# 🔧 PINLY Favicon Kurulum Rehberi (cPanel)

## 📋 Yapılan Değişiklikler

Bu güncelleme ile Google Search Console ve tarayıcılarda favicon'unuzun düzgün görünmesi için gerekli tüm ayarlar yapılmıştır.

### Eklenen Özellikler:
- ✅ Standard favicon (16x16, 32x32, 48x48)
- ✅ Büyük boyutlu icon (192x192, 512x512) - Google Search için gerekli
- ✅ Apple Touch Icon (iOS cihazlar için)
- ✅ Web App Manifest (PWA desteği)
- ✅ msapplication-TileImage (Windows için)
- ✅ mask-icon (Safari için)

---

## 📁 Dosya Yapısı

```
Yüklemeniz Gereken Dosyalar:
├── app/
│   ├── layout.js                 → /app/layout.js'i değiştirin
│   └── manifest.json/
│       └── route.js              → /app/manifest.json/route.js oluşturun
```

---

## 🚀 cPanel Kurulum Adımları

### 1. Dosya Yöneticisini Açın
- cPanel'e giriş yapın
- "File Manager" (Dosya Yöneticisi) seçin

### 2. layout.js Dosyasını Güncelleyin
- `/app/layout.js` dosyasına gidin
- Mevcut dosyayı yedekleyin (ör: layout.js.backup)
- Yeni `layout.js` dosyasını yükleyin

### 3. manifest.json Route Oluşturun
- `/app/` klasöründe `manifest.json` adında yeni bir **KLASÖR** oluşturun
- Bu klasörün içine `route.js` dosyasını yükleyin

Son yapı şöyle olmalı:
```
/app/
├── layout.js (güncellendi)
└── manifest.json/
    └── route.js (yeni)
```

### 4. Favicon Dosyasını Kontrol Edin
Favicon dosyanızın şu yolda erişilebilir olduğundan emin olun:
```
/uploads/favicon/2bbe8446-e4c4-47bd-9cf1-1d5eedea2b32.png
```

Eğer farklı bir dosya adınız varsa, `layout.js` ve `manifest.json/route.js` dosyalarındaki `FAVICON_PATH` değişkenini güncelleyin.

---

## 🔄 Önbellek Temizleme

### Sunucu Önbelleği
SSH erişiminiz varsa:
```bash
pm2 restart all
# veya
npm run build && npm run start
```

### Tarayıcı Önbelleği
- Chrome: Ctrl+Shift+R (Windows) veya Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5

---

## 🔍 Google Search Console Ayarları

1. **Google Search Console'a gidin**: https://search.google.com/search-console
2. **Sitenizi seçin**: pinly.com.tr
3. **Sol menüden "URL Denetimi" seçin**
4. **Ana URL'yi girin**: https://pinly.com.tr
5. **"Canlı URL'yi Test Et" tıklayın**
6. **"Dizine Ekleme İste" tıklayın**

### Favicon Değişikliği Ne Zaman Görünür?
- Google, favicon'ları **yeniden dizine aldığında** günceller
- Bu işlem **birkaç gün ile birkaç hafta** sürebilir
- URL Denetimi aracıyla süreci hızlandırabilirsiniz

---

## ✅ Kontrol Listesi

Yüklemeden sonra şunları kontrol edin:

1. [ ] `https://pinly.com.tr/uploads/favicon/2bbe8446-e4c4-47bd-9cf1-1d5eedea2b32.png` erişilebilir mi?
2. [ ] `https://pinly.com.tr/manifest.json` JSON döndürüyor mu?
3. [ ] Sayfa kaynağında `<link rel="icon"` tagları görünüyor mu?
4. [ ] Tarayıcı sekmesinde favicon görünüyor mu?

---

## 🆘 Sorun Giderme

### Favicon görünmüyorsa:
1. Dosya yolunun doğru olduğundan emin olun
2. Dosya izinlerini kontrol edin (644 olmalı)
3. Tarayıcı önbelleğini temizleyin
4. next.config.js'de images ayarlarını kontrol edin

### manifest.json çalışmıyorsa:
1. `/app/manifest.json/route.js` dosyasının doğru yerde olduğundan emin olun
2. Sunucuyu yeniden başlatın

---

## 📞 Destek

Herhangi bir sorun yaşarsanız, lütfen iletişime geçin.

---

*Bu dosya Emergent AI tarafından oluşturulmuştur.*
*Tarih: $(date +%Y-%m-%d)*
