# 🌍 Lokalizasyon Güncellemesi - cPanel Kurulum Rehberi

## 📥 İndirme Linkleri

Aşağıdaki dosyaları indirin:

1. **translations.js** (YENİ DOSYA - Çeviri sözlüğü)
2. **useLocale.js** (YENİ DOSYA - Dil/para birimi tespit hook'u)
3. **route.js** (GÜNCELLENMİŞ - Backend API)
4. **page.js** (GÜNCELLENMİŞ - Ana sayfa)
5. **admin-products-page.js** (GÜNCELLENMİŞ - Admin ürün sayfası)

---

## 📁 cPanel'de Dosya Yerleşimi

Projenizin kök dizini genellikle: `/home/kullanici/public_html/` veya `/home/kullanici/pinly.com.tr/`

```
proje-kök-dizini/
├── lib/
│   └── translations.js          ← YENİ DOSYA (1) buraya koyun
│
├── hooks/
│   └── useLocale.js             ← YENİ DOSYA (2) buraya koyun
│
├── app/
│   ├── page.js                  ← ESKİ DOSYANIN ÜSTÜNE YAZIN (4)
│   │
│   ├── api/
│   │   └── [[...path]]/
│   │       └── route.js         ← ESKİ DOSYANIN ÜSTÜNE YAZIN (3)
│   │
│   └── admin/
│       └── products/
│           └── page.js          ← ESKİ DOSYANIN ÜSTÜNE YAZIN (5)
│                                   (indirdiğiniz admin-products-page.js
│                                    dosyasını page.js olarak yeniden adlandırın)
```

---

## 🔧 Adım Adım Kurulum

### Adım 1: Yedek Alın!
cPanel File Manager'da şu dosyaları yedekleyin:
- `app/api/[[...path]]/route.js`
- `app/page.js`
- `app/admin/products/page.js`

### Adım 2: Yeni Klasörleri Kontrol Edin
- `lib/` klasörü zaten var (crypto.js vs. içinde)
- `hooks/` klasörü zaten var (use-mobile.jsx vs. içinde)
- Eğer yoksa bu klasörleri oluşturun

### Adım 3: Yeni Dosyaları Yükleyin
1. `translations.js` → `lib/translations.js` olarak yükleyin
2. `useLocale.js` → `hooks/useLocale.js` olarak yükleyin

### Adım 4: Mevcut Dosyaları Güncelleyin
3. `route.js` → `app/api/[[...path]]/route.js` üstüne yazın
4. `page.js` → `app/page.js` üstüne yazın
5. `admin-products-page.js` → `app/admin/products/page.js` olarak yeniden adlandırıp üstüne yazın

### Adım 5: Sunucuyu Yeniden Başlatın
cPanel Terminal veya SSH ile:
```bash
cd /home/kullanici/pinly.com.tr   # proje dizininize gidin
pm2 restart all                     # veya
npm run build && pm2 restart all    # production build yapıyorsanız
```

Eğer Node.js uygulamanız "Setup Node.js App" ile kuruluysa:
- cPanel → Setup Node.js App → uygulamanızı bulun → "Restart" butonuna tıklayın

---

## ⚙️ Admin Panelden USD Fiyat Girme

Kurulumdan sonra:
1. Admin panele giriş yapın (pinly.com.tr/admin)
2. Ürünler sayfasına gidin
3. Her ürünü düzenleyin
4. "🌍 Yurt Dışı Fiyatlandırma (USD)" bölümüne dolar fiyatlarını girin
5. Kaydedin

**Not:** USD fiyat 0 olan ürünler yurt dışı ziyaretçilere TL fiyat olarak gösterilir.

---

## ✅ Test Etme

Kurulumdan sonra test etmek için:
- VPN ile başka bir ülkeden (örn. ABD) bağlanın
- Sitenizi açın → İngilizce arayüz + $ fiyatlar görmelisiniz
- VPN'i kapatın (Türkiye IP) → Türkçe arayüz + ₺ fiyatlar görmelisiniz
