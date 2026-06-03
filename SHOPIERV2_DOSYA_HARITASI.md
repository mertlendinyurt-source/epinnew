# 🗺️ Shopier V2 Dosya Haritası

## 📋 cPanel'de Hangi Dosya Nereye Gidecek?

| Paket İçindeki Dosya | cPanel'deki Hedef Yol |
|---------------------|----------------------|
| `lib/shopierv2/client.js` | `public_html/lib/shopierv2/client.js` |
| `lib/shopierv2/service.js` | `public_html/lib/shopierv2/service.js` |
| `app/checkout/[orderId]/page.js` | `public_html/app/checkout/[orderId]/page.js` |
| `app/admin/settings/shopierv2/page.js` | `public_html/app/admin/settings/shopierv2/page.js` |
| `app/api/[[...path]]/route.js` | `public_html/app/api/[[...path]]/route.js` ⚠️ MEVCUT DOSYAYI DEĞİŞTİR |

⚠️ **DİKKAT:** `route.js` dosyası güncellenmiş versiyonudur, mevcut dosyanızın yerine geçecek!

---

## 🔧 .env Dosyasına Eklenecek Değişkenler

```bash
# Shopier V2 Configuration (Mevcut .env dosyanızın SONUNA ekleyin)
SHOPIER_V2_API_URL=https://payment.shopier.com/v2
SHOPIER_V2_API_KEY=BURAYA_SHOPIER_API_KEY_GİRİN
SHOPIER_V2_OSB_USERNAME=BURAYA_OSB_USERNAME_GİRİN
SHOPIER_V2_OSB_KEY=BURAYA_OSB_SECRET_KEY_GİRİN
SHOPIER_V2_REFERENCE_PREFIX=SV2
SHOPIER_V2_LINK_TTL=900
SHOPIER_V2_CLOSE_DELAY=60
```

---

## 🎯 Klasör Yapısı (cPanel File Manager'da Oluşturulacak)

```
public_html/
│
├── lib/
│   └── shopierv2/              🆕 YENİ KLASÖR
│       ├── client.js           
│       └── service.js          
│
├── app/
│   ├── checkout/
│   │   └── [orderId]/          🆕 YENİ KLASÖR (Köşeli parantezlerle!)
│   │       └── page.js         
│   │
│   ├── admin/
│   │   └── settings/
│   │       └── shopierv2/      🆕 YENİ KLASÖR
│   │           └── page.js     
│   │
│   └── api/
│       └── [[...path]]/
│           └── route.js        ⚠️ GÜNCELLEME (Mevcut dosyayı değiştir)
```

---

## ✅ Kurulum Adım Adım

### 1. İndir ve Aç
- `shopierv2-update.zip` dosyasını indirin
- Zip dosyasını bilgisayarınızda açın

### 2. Klasörleri Oluştur (cPanel File Manager)
```
1. public_html/lib/shopierv2/
2. public_html/app/checkout/[orderId]/
3. public_html/app/admin/settings/shopierv2/
```

### 3. Dosyaları Yükle
- Her dosyayı yukarıdaki tabloda belirtilen yere yükleyin
- `route.js` için mevcut dosyanın yedeğini alın, sonra yeni ile değiştirin

### 4. .env Dosyasını Güncelle
- `public_html/.env` dosyasını düzenleyin
- En alta yeni Shopier V2 değişkenlerini ekleyin
- Shopier panelinden aldığınız gerçek değerleri yazın

### 5. Shopier Paneli Ayarları
- Shopier V2 → Developer → OSB Settings
- Webhook URL: `https://pinly.com.tr/api/payment/shopierv2/osb`

### 6. Uygulamayı Yeniden Başlat
```bash
cPanel → Setup Node.js App → Restart
# VEYA
pm2 restart all
```

---

## 🧪 Test Etme

1. **Admin Panel:** `https://pinly.com.tr/admin/settings/shopierv2`
2. **Sipariş Oluştur:** Shopier V2 ile bir ödeme deneyin
3. **Webhook Test:** Shopier panelinden test webhook gönderin

---

## 📞 Sorun mu Yaşıyorsunuz?

Detaylı sorun giderme için `KURULUM_TALIMATLARI.md` dosyasına bakın.

**Başarılar! 🚀**
