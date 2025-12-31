# 🔐 PINLY - Yüksek Tutarlı Sipariş Doğrulama Sistemi
## Dosya İndirme ve Kurulum Rehberi

---

## 📥 İNDİRME LİNKLERİ

### 1. Backend API (Ana Dosya)
**Dosya:** `route.js`
**İndirme:** Aşağıdaki komutu terminalinizde çalıştırın:
```bash
# route.js dosyasını kopyalayın
cat /app/app/api/[[...path]]/route.js
```
**cPanel Yolu:** `epin-app/app/api/[[...path]]/route.js`

---

### 2. File Upload Utility
**Dosya:** `fileUpload.js`
**Kod:**
```javascript
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for verification documents
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp', 'application/pdf'];

// ... (rest of the file)
```
**cPanel Yolu:** `epin-app/lib/fileUpload.js`

---

### 3. Payment Success Page
**Dosya:** `success/page.js`
**cPanel Yolu:** `epin-app/app/payment/success/page.js`

---

### 4. Order Detail Page
**Dosya:** `orders/[orderId]/page.js`
**cPanel Yolu:** `epin-app/app/account/orders/[orderId]/page.js`

---

### 5. Verification Upload Page (YENİ)
**Dosya:** `verification/page.js`
**cPanel Yolu:** `epin-app/app/account/orders/[orderId]/verification/page.js`
**NOT:** Bu klasör yeni oluşturulacak: `[orderId]/verification/`

---

### 6. Admin Verification Panel (YENİ)
**Dosya:** `admin/verification/page.js`
**cPanel Yolu:** `epin-app/app/admin/verification/page.js`

---

### 7. Admin Sidebar
**Dosya:** `AdminSidebar.js`
**cPanel Yolu:** `epin-app/components/admin/AdminSidebar.js`

---

## 🛠️ cPANEL KURULUM ADIMLARI

### Adım 1: Klasör Oluşturma
```bash
# File Manager'da şu klasörleri oluşturun:
1. epin-app/app/account/orders/[orderId]/verification/
2. epin-app/app/admin/verification/
3. epin-app/public/uploads/verifications/

# İzinler:
- verifications/ klasörü: 755
```

### Adım 2: Dosyaları Yükleme
1. Her dosyayı yukarıdaki cPanel yoluna yükleyin
2. Mevcut dosyaları (`route.js`, `page.js` vb.) üzerine yazın
3. Yeni dosyaları (`verification/page.js`) oluşturun

### Adım 3: Build
```bash
cd ~/epin-app
rm -rf .next
npm run build
pm2 restart all
```

### Adım 4: Test
1. 3000 TL+ sipariş oluşturun
2. Ödeme yapın
3. Doğrulama sayfasına yönlendirilmelisiniz

---

## 🧪 TEST SENARYOLARI

### Test 1: Normal Sipariş (< 3000 TL)
- 1500 TL sipariş → Stok otomatik atanmalı ✅

### Test 2: Yüksek Tutarlı Sipariş (>= 3000 TL)
- 3500 TL sipariş → Doğrulama sayfasına yönlendirme ✅
- Kimlik + dekont yükle
- Admin panelde görünmeli

### Test 3: Admin Onay
- `/admin/verification` → Sipariş listesi
- "İncele" → Fotoğrafları gör
- "Onayla" → Stok atanmalı, dosyalar silinmeli

### Test 4: Admin Red
- "Reddet" + sebep yaz
- Sipariş iptal, dosyalar silinmeli
- Müşteriye email gitmeli

---

## ⚙️ TEKNİK DETAYLAR

### API Endpoints
- `POST /api/account/orders/:orderId/verification` - Belge yükleme
- `GET /api/account/orders/:orderId/verification` - Durum sorgulama
- `GET /api/admin/orders/pending-verification` - Admin listesi
- `PUT /api/admin/orders/:orderId/verify` - Onay/Red

### Database Collections
- `orders.verification` - Doğrulama bilgileri
- `audit_logs` - Tüm işlemler

### Email Templates
- `sendVerificationRequiredEmail()` - Doğrulama gerekli
- `sendVerificationRejectedEmail()` - Red bildirimi

---

## 📞 DESTEK

Sorun olursa:
1. Build loglarını kontrol edin
2. Browser console'da hata var mı bakın
3. MongoDB'de `orders` collection'ında `verification` alanı var mı kontrol edin

