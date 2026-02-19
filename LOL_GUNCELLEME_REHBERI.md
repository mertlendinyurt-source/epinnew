# LOL RP Kategorisi Güncelleme Rehberi

## 📥 İndirme Linki
**ZIP Dosyası:** https://payyeen-api-dev.preview.emergentagent.com/lol_update.zip

---

## 📁 Dosyaların cPanel'de Yükleneceği Yerler

### ZIP içindeki dosyalar ve hedef konumları:

| ZIP'teki Dosya | cPanel'deki Hedef Konum |
|----------------|-------------------------|
| `route.js` | `/app/api/[[...path]]/route.js` |
| `admin_site_settings_page.js` | `/app/admin/settings/site/page.js` |
| `homepage_page.js` | `/app/page.js` |
| `valorant_page.js` | `/app/valorant/page.js` |
| `mlbb_page.js` | `/app/mlbb/page.js` |
| `lol_page.js` | `/app/lol/page.js` |

---

## 🔧 Kurulum Adımları

### 1. ZIP'i İndir ve Çıkart
- Yukarıdaki linkten `lol_update.zip` dosyasını indirin
- Bilgisayarınızda ZIP'i çıkartın

### 2. cPanel File Manager'a Giriş Yapın
- cPanel'e giriş yapın
- "File Manager" açın

### 3. Dosyaları Yükleyin

**route.js:**
```
Hedef: public_html/app/api/[[...path]]/route.js
```
- ZIP'ten `route.js` dosyasını alın
- cPanel'de `public_html/app/api/[[...path]]/` klasörüne gidin
- Mevcut `route.js` dosyasının yerine yükleyin (overwrite)

**admin_site_settings_page.js:**
```
Hedef: public_html/app/admin/settings/site/page.js
```
- ZIP'ten `admin_site_settings_page.js` dosyasını alın
- Dosya adını `page.js` olarak değiştirin
- cPanel'de `public_html/app/admin/settings/site/` klasörüne yükleyin

**homepage_page.js:**
```
Hedef: public_html/app/page.js
```
- ZIP'ten `homepage_page.js` dosyasını alın
- Dosya adını `page.js` olarak değiştirin
- cPanel'de `public_html/app/` klasörüne yükleyin

**valorant_page.js:**
```
Hedef: public_html/app/valorant/page.js
```
- ZIP'ten `valorant_page.js` dosyasını alın
- Dosya adını `page.js` olarak değiştirin
- cPanel'de `public_html/app/valorant/` klasörüne yükleyin

**mlbb_page.js:**
```
Hedef: public_html/app/mlbb/page.js
```
- ZIP'ten `mlbb_page.js` dosyasını alın
- Dosya adını `page.js` olarak değiştirin
- cPanel'de `public_html/app/mlbb/` klasörüne yükleyin

**lol_page.js:**
```
Hedef: public_html/app/lol/page.js
```
- ZIP'ten `lol_page.js` dosyasını alın
- Dosya adını `page.js` olarak değiştirin
- cPanel'de `public_html/app/lol/` klasörüne yükleyin

### 4. Build ve Restart
cPanel Terminal veya SSH ile:
```bash
cd ~/public_html
npm run build
# veya pm2 kullanıyorsanız:
pm2 restart all
```

---

## ✅ Güncelleme Sonrası Kontrol Listesi

1. ✅ Ana sayfada LoL linki aktif mi? ("Yakında" kaldırılmış olmalı)
2. ✅ `/lol` sayfası açılıyor mu?
3. ✅ Admin Panel > Site Ayarları'nda "LoL Hero Banner" alanı var mı?
4. ✅ Navigasyonda tüm sayfalarda LoL linki çalışıyor mu?

---

## 📝 Notlar

- **LoL klasörü yoksa:** `/app/lol/` klasörünü oluşturun ve `lol_page.js` dosyasını `page.js` olarak içine koyun
- **Mevcut dosyaları yedekleyin:** Güncelleme öncesi mevcut dosyalarınızı yedeklemenizi öneririm
