# 🚀 PINLY - cPanel Deployment Rehberi

## 📦 Projeniz Hakkında

Bu Next.js full-stack e-ticaret uygulaması **Shopier V2** ödeme sistemi entegrasyonu ile birlikte gelir.

### ✨ Özellikler
- **Shopier V2 Iframe** tabanlı ödeme sistemi
- **OSB Webhook** entegrasyonu (HMAC-SHA256 güvenlik)
- **Admin Paneli** (Shopier V2 ayarları yönetimi)
- **Real-time Status Polling** (ödeme durumu takibi)
- **MongoDB** veritabanı
- **Google OAuth** entegrasyonu
- **SMS** bildirimleri (opsiyonel)

---

## 📋 Gereksinimler

### cPanel Gereksinimleri
- ✅ **Node.js 18.x veya üzeri** (cPanel'de Node.js uygulaması kurulumu)
- ✅ **MongoDB veritabanı** erişimi (uzak MongoDB veya cPanel MongoDB)
- ✅ **SSL Sertifikası** (HTTPS - OAuth ve Shopier için zorunlu)
- ✅ **Domain** veya subdomain

### Shopier V2 API Bilgileri
Shopier V2 entegrasyonu için aşağıdaki bilgilere ihtiyacınız var:
- API Key (JWT token formatında)
- OSB Username
- OSB Key (Webhook imza doğrulama için)

Bu bilgileri Shopier yönetim panelinden alabilirsiniz.

---

## 🔧 Kurulum Adımları

### 1️⃣ Dosyaları cPanel'e Yükleme

#### Yöntem A: File Manager ile
1. cPanel'e giriş yapın
2. **File Manager** açın
3. `public_html` klasörüne gidin (veya alt domain klasörü)
4. **Upload** butonuna tıklayın
5. `pinly-app.zip` dosyasını yükleyin
6. Dosyaya sağ tıklayın → **Extract** seçin
7. Zip dosyasını silin

#### Yöntem B: FTP ile
1. FileZilla veya başka bir FTP istemcisi kullanın
2. cPanel FTP bilgilerinizle bağlanın
3. `public_html` klasörüne tüm dosyaları yükleyin

### 2️⃣ Node.js Uygulaması Kurulumu

1. cPanel'de **Setup Node.js App** açın
2. **Create Application** tıklayın
3. Ayarları yapın:
   ```
   Node.js Version: 18.x veya üzeri
   Application Mode: Production
   Application Root: /home/username/public_html  (dosyaların olduğu klasör)
   Application URL: yourdomain.com (veya subdomain)
   Application Startup File: server.js
   ```
4. **Create** tıklayın

### 3️⃣ Environment Variables (.env) Yapılandırması

cPanel Node.js App ayarlarında **Environment Variables** bölümüne aşağıdaki değişkenleri ekleyin:

#### Zorunlu Değişkenler

```bash
# MongoDB Bağlantısı
MONGO_URL=mongodb://localhost:27017
# VEYA uzak MongoDB kullanıyorsanız:
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net

DB_NAME=pinly_store

# Domain Ayarı (HTTPS ile)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# JWT Secret (güçlü bir şifre oluşturun)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Master Encryption Key (güçlü bir şifre oluşturun)
MASTER_ENCRYPTION_KEY=your-master-encryption-key-change-this

# CORS
CORS_ORIGINS=*

# Shopier V2 Ayarları
SHOPIER_V2_API_KEY=your_shopier_api_key_jwt_token
SHOPIER_V2_OSB_USERNAME=your_osb_username
SHOPIER_V2_OSB_KEY=your_osb_key
SHOPIER_V2_REFERENCE_PREFIX=SV2
SHOPIER_V2_LINK_TTL=900
SHOPIER_V2_CLOSE_DELAY=60
SHOPIER_V2_API_URL=https://payment.shopier.com/v2
```

#### Opsiyonel Değişkenler (Google OAuth için)

```bash
# Google OAuth (kullanıyorsanız)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

⚠️ **ÖNEMLİ:** 
- `NEXT_PUBLIC_BASE_URL` mutlaka HTTPS olmalı (örn: `https://pinly.com.tr`)
- `JWT_SECRET` ve `MASTER_ENCRYPTION_KEY` için güçlü, benzersiz değerler kullanın
- Shopier bilgilerinizi Shopier panelinden alın

### 4️⃣ Bağımlılıkları Yükleme

1. cPanel Node.js App sayfasında **Stop App** tıklayın
2. Alttaki **Terminal** butonuna tıklayın (veya SSH ile bağlanın)
3. Uygulama klasörüne gidin:
   ```bash
   cd /home/username/public_html
   ```
4. Bağımlılıkları yükleyin:
   ```bash
   npm install
   # VEYA yarn kullanıyorsanız:
   yarn install
   ```
5. Production build alın:
   ```bash
   npm run build
   # VEYA
   yarn build
   ```

### 5️⃣ MongoDB Kurulumu

#### Yöntem A: cPanel MongoDB (varsa)
1. cPanel'de **MongoDB** açın
2. Yeni veritabanı oluşturun: `pinly_store`
3. Kullanıcı oluşturun ve yetkilendirin
4. Connection string'i `.env` dosyasına ekleyin

#### Yöntem B: MongoDB Atlas (Uzak)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) ücretsiz hesap açın
2. Cluster oluşturun
3. Database user oluşturun
4. Network Access'te cPanel sunucu IP'sini whitelist'e ekleyin
5. Connection string'i alın ve `.env` dosyasına ekleyin:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net
   ```

### 6️⃣ Shopier V2 Webhook Ayarları

1. [Shopier Yönetim Paneli](https://www.shopier.com) giriş yapın
2. **Geliştirici** → **API** bölümüne gidin
3. **OSB Webhook URL** ayarlayın:
   ```
   https://yourdomain.com/api/payment/shopierv2/osb
   ```
4. API Key, OSB Username ve OSB Key bilgilerini kopyalayın
5. Bu bilgileri `.env` dosyasına ekleyin (yukarıda gösterildiği gibi)

### 7️⃣ Uygulamayı Başlatma

1. cPanel Node.js App sayfasına dönün
2. **Restart App** veya **Start App** tıklayın
3. Uygulama başlamalı (yeşil durum göstergesi)
4. **Open Application** tıklayarak sitenizi açın

---

## 🔐 Shopier V2 Admin Paneli Kurulumu

### İlk Admin Hesabı Oluşturma

1. MongoDB'ye bağlanın (MongoDB Compass veya cPanel MongoDB)
2. `pinly_store` veritabanını seçin
3. `admins` collection'ına yeni kayıt ekleyin:

```json
{
  "id": "admin-001",
  "username": "admin",
  "password": "$2b$10$YourBcryptHashedPasswordHere",
  "email": "admin@yourdomain.com",
  "role": "admin",
  "createdAt": new Date()
}
```

💡 **Şifre Hash'leme:** bcrypt kullanarak şifrenizi hash'leyin.
Online araç: https://bcrypt-generator.com (rounds: 10)

### Shopier V2 Ayarlarını Yapma

1. Admin paneline giriş yapın: `https://yourdomain.com/admin/login`
2. **Ayarlar** → **Shopier V2** bölümüne gidin
3. Shopier bilgilerinizi girin:
   - API Key
   - OSB Username
   - OSB Key
   - Reference Prefix: `SV2`
   - Link TTL: `900` (15 dakika)
   - Close Delay: `60` (60 saniye)
4. **Kaydet** tıklayın

---

## 🧪 Test Etme

### 1. Site Erişimi Testi
```
https://yourdomain.com
```
Ana sayfa açılmalı.

### 2. Admin Paneli Testi
```
https://yourdomain.com/admin/login
```
Admin girişi yapabilmeli.

### 3. Shopier V2 Webhook Testi
```
https://yourdomain.com/api/payment/shopierv2/osb
```
POST isteği ile test edin (Shopier'den gelen webhook'lar bu endpoint'e gelecek).

### 4. Test Sipariş Oluşturma
1. Siteye kullanıcı olarak giriş yapın
2. Bir ürün sepete ekleyin
3. Ödeme sayfasına gidin
4. Shopier iframe açılmalı
5. Test ödeme yapın (Shopier test ortamı varsa)

---

## 📁 Dosya Yapısı

```
public_html/
├── app/                    # Next.js app klasörü
│   ├── api/               # Backend API routes
│   │   └── [[...path]]/   # Ana API router
│   ├── admin/             # Admin paneli sayfaları
│   │   └── settings/
│   │       └── shopierv2/ # Shopier V2 ayarları
│   ├── checkout/          # Ödeme sayfaları
│   └── page.js            # Ana sayfa
├── lib/                   # Yardımcı kütüphaneler
│   └── shopierv2/         # Shopier V2 client & service
├── components/            # React bileşenleri
├── public/                # Statik dosyalar
├── .env                   # Ortam değişkenleri (GİZLİ!)
├── package.json           # Node.js bağımlılıkları
├── next.config.js         # Next.js yapılandırması
└── server.js              # Sunucu başlangıç dosyası
```

---

## 🛠️ Sorun Giderme

### Uygulama Başlamıyor
1. **Hata loglarını kontrol edin:**
   ```bash
   cat logs/nodejs.log
   ```
2. **Node.js versiyonunu kontrol edin:**
   ```bash
   node -v  # 18.x veya üzeri olmalı
   ```
3. **Bağımlılıkları tekrar yükleyin:**
   ```bash
   rm -rf node_modules
   npm install
   npm run build
   ```

### MongoDB Bağlantı Hatası
- `MONGO_URL` değişkenini kontrol edin
- MongoDB servisinin çalıştığını doğrulayın
- Network/firewall ayarlarını kontrol edin (MongoDB Atlas için IP whitelist)

### Shopier Webhook Çalışmıyor
1. **Webhook URL'yi kontrol edin:**
   ```
   https://yourdomain.com/api/payment/shopierv2/osb
   ```
2. **SSL sertifikası aktif mi?** (HTTPS olmalı)
3. **OSB Key doğru mu?** (HMAC imza doğrulama için)
4. Shopier panelde webhook URL'nin doğru girildiğinden emin olun

### Admin Paneli 401 Hatası
- JWT_SECRET değişkeninin doğru ayarlandığından emin olun
- Admin hesabının `admins` collection'ında olduğunu kontrol edin
- Browser'da localStorage'ı temizleyin ve tekrar giriş yapın

### Sayfa 404 Hatası
- Next.js build'in tamamlandığından emin olun: `npm run build`
- Rewrite rules doğru ayarlanmış mı? (cPanel Node.js App otomatik ayarlar)
- `.htaccess` dosyasını kontrol edin

---

## 🔒 Güvenlik Önerileri

1. **SSL Sertifikası Kullanın:** Her zaman HTTPS (zorunlu)
2. **Güçlü Şifreler:** JWT_SECRET ve MASTER_ENCRYPTION_KEY için
3. **.env Dosyasını Gizleyin:** `.htaccess` ile koruyun
4. **Admin Şifrelerini Değiştirin:** İlk kurulumdan sonra
5. **MongoDB Erişimini Kısıtlayın:** Sadece güvenilir IP'lerden
6. **Regular Backups:** Veritabanı ve dosya yedekleri alın
7. **Update Dependencies:** Düzenli olarak `npm update` çalıştırın

### .htaccess Güvenlik Kuralları

`.env` dosyanızı korumak için kök dizine `.htaccess` ekleyin:

```apache
# .env dosyasını koru
<Files ".env">
    Order allow,deny
    Deny from all
</Files>

# Node.js için rewrite rules (otomatik oluşturulur)
```

---

## 📞 Destek ve Kaynaklar

### Shopier Dokümantasyonu
- [Shopier V2 API Docs](https://www.shopier.com/api/v2)
- [OSB Webhook Guide](https://www.shopier.com/osb)

### Next.js Dokümantasyonu
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [cPanel Node.js Apps](https://docs.cpanel.net/cpanel/software/application-manager/)

### MongoDB
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [MongoDB Compass](https://www.mongodb.com/products/compass)

---

## ✅ Kurulum Checklist

- [ ] Dosyalar cPanel'e yüklendi
- [ ] Node.js uygulaması oluşturuldu
- [ ] Environment variables (.env) ayarlandı
- [ ] `npm install` ve `npm run build` çalıştırıldı
- [ ] MongoDB bağlantısı yapılandırıldı
- [ ] Shopier V2 webhook URL'si ayarlandı
- [ ] SSL sertifikası aktif (HTTPS)
- [ ] Admin hesabı oluşturuldu
- [ ] Shopier V2 ayarları admin panelden yapıldı
- [ ] Test sipariş oluşturuldu ve ödeme testi yapıldı
- [ ] .htaccess güvenlik kuralları eklendi

---

## 🎉 Tebrikler!

PINLY uygulamanız başarıyla cPanel'de yayında! 

**Admin Panel:** `https://yourdomain.com/admin`  
**Ana Site:** `https://yourdomain.com`

Herhangi bir sorun yaşarsanız yukarıdaki "Sorun Giderme" bölümüne bakın.

---

**Not:** Bu rehber genel cPanel kurulumu için hazırlanmıştır. Hosting sağlayıcınıza özgü farklılıklar olabilir.
