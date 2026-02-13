// Hakkımızda sayfası ekleme scripti
// mongosh pinly_store /app/scripts/insert-hakkimizda.js

const hakkimizdaPage = {
  id: UUID().toString('hex'),
  title: 'Hakkımızda',
  slug: 'hakkimizda',
  content: `# Hakkımızda

## PINLY Nedir?

**PINLY**, Türkiye merkezli güvenilir dijital oyun içi para ve kod satış platformudur. 2024 yılında kurulan şirketimiz, oyunseverlere en hızlı ve en güvenli şekilde dijital ürün temin etmeyi amaçlamaktadır.

## Misyonumuz

Oyun tutkunlarına:
- **En uygun fiyatlarla** dijital ürün sunmak
- **Anında teslimat** ile zaman kaybettirmemek
- **7/24 destek** ile her an yanlarında olmak
- **Güvenli ödeme** altyapısı ile huzurlu alışveriş sağlamak

## Vizyonumuz

Türkiye ve çevre ülkelerde dijital oyun ürünleri satışında **lider platform** olmak ve oyunseverlerin ilk tercihi haline gelmek.

## Neden PINLY?

### Güvenilirlik
- Resmi olarak tescilli şirket
- Binlerce mutlu müşteri
- Şeffaf ve dürüst ticaret anlayışı

### Hız
- Siparişleriniz anında işleme alınır
- Otomatik teslimat sistemi
- Stokta bulunan ürünlerde saniyeler içinde teslimat

### Uygun Fiyat
- Piyasanın en rekabetçi fiyatları
- Düzenli kampanya ve indirimler
- Sadakat programı ile ekstra avantajlar

### Destek
- 7/24 canlı destek
- Hızlı sorun çözümü
- Müşteri memnuniyeti odaklı yaklaşım

## Ürünlerimiz

PINLY olarak sunduğumuz başlıca ürünler:

- **PUBG Mobile UC** - Unknown Cash
- **Valorant VP** - Valorant Points
- **Mobile Legends Diamonds**
- **League of Legends RP**
- **Steam Cüzdan Kodu**
- **Google Play Hediye Kartı**
- **App Store Hediye Kartı**
- Ve daha fazlası...

## Şirket Bilgilerimiz

**Unvan:** PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ

**Adres:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA

**Mersis No:** 0730089706000001

**Ticaret Sicil No:** 541409

## İletişim

Bizimle iletişime geçmek için:

**E-posta:** info@pinly.com.tr

**Web:** www.pinly.com.tr

**Destek:** Hesabınız üzerinden destek talebi oluşturabilirsiniz

---

PINLY'yi tercih ettiğiniz için teşekkür ederiz!`,
  isActive: true,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mevcut varsa sil
db.legal_pages.deleteOne({ slug: 'hakkimizda' });

// Yeni ekle
db.legal_pages.insertOne(hakkimizdaPage);

print('✅ Hakkımızda sayfası eklendi!');
print('   Slug: /legal/hakkimizda');
