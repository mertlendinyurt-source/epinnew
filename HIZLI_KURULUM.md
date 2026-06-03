# 🚀 HIZLI KURULUM REHBERİ - PINLY cPanel

## 📦 İndirme

**Dosya:** `pinly-app.zip` (13 MB)

## ⚡ 5 Adımda Kurulum

### 1️⃣ Dosyaları Yükle (2 dakika)
```
cPanel → File Manager → public_html
Upload: pinly-app.zip
Extract (sağ tık → Extract)
```

### 2️⃣ Node.js App Oluştur (3 dakika)
```
cPanel → Setup Node.js App → Create Application
Node Version: 18+
Application Root: /home/username/public_html
Application URL: yourdomain.com
Startup File: server.js
```

### 3️⃣ Ortam Değişkenlerini Ayarla (5 dakika)
Node.js App → Environment Variables:

```bash
# Zorunlu - Domain (HTTPS olmalı!)
NEXT_PUBLIC_BASE_URL=https://pinly.com.tr

# Zorunlu - MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=pinly_store

# Zorunlu - Güvenlik (güçlü şifreler!)
JWT_SECRET=super-secret-key-123456789
MASTER_ENCRYPTION_KEY=master-key-987654321

# Zorunlu - Shopier V2 (Shopier panelinden alın)
SHOPIER_V2_API_KEY=eyJ0eXAiOiJKV1Qi...
SHOPIER_V2_OSB_USERNAME=232036e...
SHOPIER_V2_OSB_KEY=b4bfe50c...
SHOPIER_V2_REFERENCE_PREFIX=SV2
SHOPIER_V2_LINK_TTL=900
SHOPIER_V2_CLOSE_DELAY=60
SHOPIER_V2_API_URL=https://payment.shopier.com/v2

# Opsiyonel
CORS_ORIGINS=*
```

### 4️⃣ Bağımlılıkları Yükle ve Build Al (5-10 dakika)
Node.js App → Terminal (veya SSH):

```bash
cd /home/username/public_html
npm install
npm run build
```

### 5️⃣ Uygulamayı Başlat (1 dakika)
```
Node.js App → Start App
Open Application → Test et
```

---

## 🔧 Shopier V2 Webhook Ayarı

**Kritik Adım!** Shopier panelinde webhook URL'nizi ayarlayın:

1. [Shopier Panel](https://www.shopier.com) → Geliştirici → API
2. **OSB Webhook URL:**
   ```
   https://pinly.com.tr/api/payment/shopierv2/osb
   ```
3. Kaydet

---

## 👤 Admin Hesabı Oluşturma

MongoDB'de `admins` collection'ına ekleyin:

```json
{
  "id": "admin-001",
  "username": "admin",
  "password": "$2b$10$...", 
  "email": "admin@pinly.com.tr",
  "role": "admin",
  "createdAt": new Date()
}
```

💡 **Şifre hash:** https://bcrypt-generator.com (rounds: 10)

---

## ✅ Test Kontrolleri

- [ ] `https://pinly.com.tr` açılıyor mu?
- [ ] `https://pinly.com.tr/admin` giriş yapabiliyor musunuz?
- [ ] Admin → Ayarlar → Shopier V2 ayarlarınız görünüyor mu?
- [ ] Test sipariş oluşturduğunuzda Shopier iframe açılıyor mu?

---

## 🆘 Sorun mu Yaşıyorsunuz?

### Uygulama Başlamıyor
```bash
# Logları kontrol et
cat logs/nodejs.log

# Bağımlılıkları tekrar yükle
rm -rf node_modules .next
npm install
npm run build
```

### MongoDB Bağlantı Hatası
- `MONGO_URL` değişkenini kontrol edin
- MongoDB Atlas kullanıyorsanız IP whitelist'e sunucu IP'sini ekleyin

### Shopier Webhook Çalışmıyor
- SSL (HTTPS) aktif mi?
- Webhook URL doğru girilmiş mi?
- OSB Key doğru mu?

### Admin Girişi Yapamıyor
- Admin hesabı MongoDB'de oluşturuldu mu?
- Şifre bcrypt hash'li mi?
- JWT_SECRET değişkeni ayarlı mı?

---

## 📖 Detaylı Dokümantasyon

- **Tam Kurulum Rehberi:** `CPANEL_DEPLOYMENT_GUIDE.md`
- **Proje Dökümantasyonu:** `README.md`
- **Ortam Değişkenleri:** `.env.example`

---

## 🎯 Sonraki Adımlar

1. ✅ Admin panele giriş yap
2. ✅ Ayarlar → Shopier V2 bilgilerini doğrula
3. ✅ Test ürünleri ekle
4. ✅ Test sipariş oluştur ve ödeme yap
5. ✅ Webhook çalışıyor mu kontrol et
6. ✅ Production'a al!

---

**Toplam Süre:** ~15-20 dakika  
**Sonuç:** Tamamen çalışır Shopier V2 entegrasyonlu e-ticaret sitesi! 🎉
