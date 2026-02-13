const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'pinly_store';

const legalPages = [
  {
    id: uuidv4(),
    title: 'Gizlilik Politikası',
    slug: 'gizlilik-politikasi',
    content: `# Gizlilik Politikası

**Son Güncelleme:** Şubat 2026

PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ ("PINLY", "biz", "bizim") olarak, kişisel verilerinizin korunmasını son derece önemsiyoruz. Bu Gizlilik Politikası, pinly.com.tr web sitesi ("Site") üzerinden toplanan kişisel verilerin nasıl işlendiğini açıklamaktadır.

## 1. Veri Sorumlusu

**Unvan:** PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ  
**Adres:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA  
**Mersis No:** 0730089706000001  
**Ticaret Sicil No:** 541409

## 2. Toplanan Kişisel Veriler

Sitemiz üzerinden aşağıdaki kişisel verileriniz toplanmaktadır:

### 2.1. Kimlik Bilgileri
- Ad ve soyad

### 2.2. İletişim Bilgileri
- E-posta adresi
- Telefon numarası

### 2.3. İşlem Güvenliği Bilgileri
- IP adresi
- Tarayıcı bilgileri
- Çerez verileri
- İşlem tarihi ve saati

### 2.4. Finansal Bilgiler
- Ödeme işlem kayıtları (kart bilgileri tarafımızca saklanmaz)

### 2.5. Oyun Hesap Bilgileri
- Oyuncu ID (PUBG, Valorant, vb.)

## 3. Kişisel Verilerin İşlenme Amaçları

Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:

- Üyelik işlemlerinin gerçekleştirilmesi
- Sipariş ve ödeme işlemlerinin yürütülmesi
- Dijital ürün teslimatının sağlanması
- Müşteri hizmetleri desteğinin sunulması
- Yasal yükümlülüklerin yerine getirilmesi
- Dolandırıcılık ve suistimal önleme
- Hizmet kalitesinin artırılması

## 4. Kişisel Verilerin Aktarılması

Kişisel verileriniz, yasal zorunluluklar çerçevesinde:

- Ödeme kuruluşları (banka, sanal POS sağlayıcıları)
- Yasal merciler ve düzenleyici kurumlar
- Oyun yayıncıları (ürün teslimatı için gerekli minimum bilgi)

ile paylaşılabilmektedir.

## 5. Kişisel Verilerin Saklanma Süresi

Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve yasal saklama süreleri (vergi mevzuatı kapsamında 5 yıl, tüketici mevzuatı kapsamında 3 yıl) boyunca saklanmaktadır.

## 6. Veri Güvenliği

Kişisel verilerinizin güvenliği için:

- SSL/TLS şifreleme kullanılmaktadır
- Veritabanları şifreli olarak saklanmaktadır
- Düzenli güvenlik denetimleri yapılmaktadır
- Erişim yetkileri sınırlandırılmıştır

## 7. Haklarınız

6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsiniz:

- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenmişse buna ilişkin bilgi talep etme
- İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme
- Aktarıldığı üçüncü kişileri bilme
- Eksik veya yanlış işlenen verilerin düzeltilmesini isteme
- Verilerin silinmesini veya yok edilmesini isteme
- İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhine bir sonucun ortaya çıkmasına itiraz etme

## 8. İletişim

Gizlilik politikamız hakkında sorularınız için:

**E-posta:** info@pinly.com.tr  
**Adres:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA

Bu politika, PINLY tarafından önceden bildirimde bulunmaksızın güncellenebilir.`,
    isActive: true,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Kullanıcı Sözleşmesi',
    slug: 'kullanici-sozlesmesi',
    content: `# Kullanıcı Sözleşmesi

**Son Güncelleme:** Şubat 2026

Bu Kullanıcı Sözleşmesi ("Sözleşme"), PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ ("PINLY") ile pinly.com.tr web sitesini ("Site") kullanan gerçek veya tüzel kişiler ("Kullanıcı") arasındaki hak ve yükümlülükleri düzenlemektedir.

## 1. Taraflar

**Satıcı/Hizmet Sağlayıcı:**  
PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ  
Adres: Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA  
Mersis No: 0730089706000001  
Ticaret Sicil No: 541409

**Kullanıcı:**  
Siteye üye olan ve/veya alışveriş yapan gerçek veya tüzel kişi

## 2. Sözleşmenin Konusu

Bu sözleşme, PINLY tarafından sunulan dijital oyun içi para birimleri, oyun kodları ve dijital pin satış hizmetlerinin kullanım koşullarını düzenler.

## 3. Üyelik Koşulları

### 3.1. Üyelik Şartları
- 18 yaşından büyük olmak
- Geçerli ve doğru bilgiler sağlamak
- Türkiye'de ikamet etmek veya Türk vatandaşı olmak

### 3.2. Hesap Güvenliği
- Kullanıcı, hesap bilgilerinin gizliliğinden sorumludur
- Şifre paylaşımı yasaktır
- Şüpheli aktivite derhal bildirilmelidir

## 4. Hizmetlerin Kapsamı

PINLY aşağıdaki dijital ürünleri satmaktadır:

- PUBG Mobile UC (Unknown Cash)
- Valorant VP (Valorant Points)
- Mobile Legends Diamonds
- League of Legends RP
- Diğer dijital oyun para birimleri ve kodlar

## 5. Sipariş ve Teslimat

### 5.1. Sipariş Süreci
- Kullanıcı, ürünü seçer ve oyuncu ID'sini girer
- Ödeme işlemi tamamlanır
- Dijital ürün otomatik olarak teslim edilir

### 5.2. Teslimat Süresi
- Stokta bulunan ürünler: Anında - 30 dakika
- Stok dışı ürünler: 24-48 saat (kullanıcı bilgilendirilir)

### 5.3. Teslimat Garantisi
- Hatalı teslimat durumunda tam iade veya yeniden teslimat yapılır
- Kullanıcı hatası (yanlış ID girişi) durumunda sorumluluk kullanıcıya aittir

## 6. Ödeme Koşulları

### 6.1. Kabul Edilen Ödeme Yöntemleri
- Kredi kartı / Banka kartı
- Banka havalesi / EFT
- Site bakiyesi

### 6.2. Fiyatlandırma
- Tüm fiyatlar KDV dahildir
- Fiyatlar önceden haber verilmeksizin değiştirilebilir
- Sipariş anındaki fiyat geçerlidir

## 7. Kullanıcı Yükümlülükleri

Kullanıcı:

- Doğru ve güncel bilgi sağlamayı
- Siteyi yasalara uygun kullanmayı
- Üçüncü şahısların haklarını ihlal etmemeyi
- Dolandırıcılık faaliyetlerinde bulunmamayı
- Otomatik bot veya script kullanmamayı

kabul ve taahhüt eder.

## 8. PINLY'nin Hakları

PINLY:

- Şüpheli işlemleri askıya alma
- Hesapları kapatma veya kısıtlama
- Hizmet şartlarını değiştirme
- Fiyatları güncelleme

haklarını saklı tutar.

## 9. Fikri Mülkiyet

Site içeriği, tasarım, logo ve markalar PINLY'ye aittir. İzinsiz kullanım yasaktır.

## 10. Sorumluluk Sınırlaması

PINLY:

- Oyun yayıncılarının politika değişikliklerinden
- Kullanıcı hatalarından
- Mücbir sebeplerden
- Üçüncü taraf hizmet kesintilerinden

kaynaklanan zararlardan sorumlu tutulamaz.

## 11. Uyuşmazlık Çözümü

Bu sözleşmeden doğan uyuşmazlıklarda Ankara Mahkemeleri ve İcra Daireleri yetkilidir.

## 12. Yürürlük

Bu sözleşme, kullanıcının siteye üye olması veya alışveriş yapmasıyla yürürlüğe girer.

**İletişim:** info@pinly.com.tr`,
    isActive: true,
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Mesafeli Satış Sözleşmesi',
    slug: 'satis-sozlesmesi',
    content: `# Mesafeli Satış Sözleşmesi

**Son Güncelleme:** Şubat 2026

## 1. TARAFLAR

### 1.1. SATICI BİLGİLERİ

**Unvan:** PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ  
**Adres:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA  
**E-posta:** info@pinly.com.tr  
**Mersis No:** 0730089706000001  
**Ticaret Sicil No:** 541409

### 1.2. ALICI BİLGİLERİ

Sipariş sırasında beyan edilen ad-soyad, adres, e-posta ve telefon bilgileri geçerlidir.

## 2. SÖZLEŞMENİN KONUSU

İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince, SATICI'nın ALICI'ya dijital ürün satışına ilişkin tarafların hak ve yükümlülüklerini düzenler.

## 3. SÖZLEŞME KONUSU ÜRÜN BİLGİLERİ

### 3.1. Ürün Türü
Dijital oyun içi para birimleri, oyun kodları ve dijital pinler (PUBG UC, Valorant VP, Mobile Legends Diamonds vb.)

### 3.2. Ürün Özellikleri
- Ürün türü: Dijital içerik
- Teslimat şekli: Elektronik (oyun hesabına anında yükleme veya kod gönderimi)
- Ürün miktarı ve birim fiyatı: Sipariş detayında belirtildiği şekildedir

### 3.3. Toplam Fiyat
Sipariş özet sayfasında ve onay e-postasında belirtilen KDV dahil tutardır.

## 4. GENEL HÜKÜMLER

4.1. ALICI, satışa konu ürünün temel nitelikleri, satış fiyatı, ödeme şekli ve teslimat ile cayma hakkına ilişkin bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda satış için gerekli onayı verdiğini kabul eder.

4.2. SATICI, sözleşme konusu ürünü eksiksiz, siparişte belirtilen niteliklere uygun teslim etmeyi kabul ve taahhüt eder.

4.3. Ürün bedeli, ALICI tarafından seçilen ödeme yöntemiyle tahsil edilir.

## 5. TESLİMAT

### 5.1. Teslimat Şekli
- **Otomatik Yükleme:** Oyuncu ID'sine direkt yükleme (PUBG UC, Valorant VP vb.)
- **Kod Gönderimi:** E-posta ve/veya hesap paneli üzerinden kod teslimi

### 5.2. Teslimat Süresi
- Stokta bulunan ürünler: Ödeme onayından itibaren anında - 30 dakika
- Stok beklenen ürünler: 24-48 saat içinde (ALICI önceden bilgilendirilir)

### 5.3. Teslimat Yeri
ALICI tarafından sipariş sırasında belirtilen oyuncu ID'si ve/veya e-posta adresi

## 6. CAYMA HAKKI

### 6.1. Cayma Hakkının İstisnaları

6502 sayılı Kanun'un 15. maddesi ve Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, **dijital içerik satışlarında** tüketicinin cayma hakkı bulunmamaktadır.

ALICI, dijital ürünün (oyun içi para birimi, kod vb.) tesliminden sonra cayma hakkını kullanamayacağını bildiğini ve onay verdiğini kabul eder.

### 6.2. Gerekçe

Satışa konu ürünler, elektronik ortamda anında teslim edilen veya tüketiciye anında indirilmek/kullanılmak üzere sunulan dijital içeriklerdir. Bu ürünler, teslim edildiği anda tüketilmiş sayılır.

## 7. ÖDEME YÖNTEMLERİ

- Kredi Kartı / Banka Kartı (Visa, MasterCard, Troy)
- Havale / EFT
- Site Bakiyesi

## 8. GÜVENLİK

8.1. Kredi kartı bilgileri SATICI tarafından saklanmaz. Ödeme işlemleri, güvenli ödeme altyapısı üzerinden gerçekleştirilir.

8.2. Site, SSL sertifikası ile korunmaktadır.

## 9. YETKİLİ MAHKEME

İşbu sözleşmeden doğacak uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Parasal sınırlar, T.C. Gümrük ve Ticaret Bakanlığı tarafından belirlenen değerlere tabidir.

## 10. YÜRÜRLÜK

ALICI, bu sözleşmenin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini, sipariş vererek elektronik ortamda onay verdiğini beyan eder.

**Sözleşme Tarihi:** Sipariş tarihi itibariyle geçerlidir.`,
    isActive: true,
    order: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'İptal ve İade Koşulları',
    slug: 'iptal-iade',
    content: `# İptal ve İade Koşulları

**Son Güncelleme:** Şubat 2026

PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ olarak müşteri memnuniyetini ön planda tutmaktayız. Bu sayfa, dijital ürün satışlarımıza ilişkin iptal ve iade politikamızı açıklamaktadır.

## 1. DİJİTAL ÜRÜNLERDE CAYMA HAKKI

### 1.1. Yasal Düzenleme

6502 sayılı Tüketicinin Korunması Hakkında Kanun'un 15. maddesi ve Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi gereğince;

> "Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayri maddi mallara ilişkin sözleşmelerde" 

cayma hakkı kullanılamaz.

### 1.2. Ürünlerimizin Niteliği

PINLY'de satılan ürünler (PUBG UC, Valorant VP, Mobile Legends Diamonds, oyun kodları vb.) dijital içerik niteliğindedir. Bu ürünler:

- Ödeme onayı alındıktan sonra anında teslim edilir
- Oyun hesabına yüklendikten sonra geri alınamaz
- Kullanıldıktan sonra iade edilemez

## 2. İADE YAPILMAYAN DURUMLAR

Aşağıdaki durumlarda iade yapılmaz:

- Ürün başarıyla teslim edildikten sonra
- Yanlış oyuncu ID'si girilmesi (kullanıcı hatası)
- Ürün kullanıldıktan sonra
- Sipariş onaylandıktan ve işleme alındıktan sonra

## 3. İADE YAPILAN DURUMLAR

Aşağıdaki durumlarda **tam iade** yapılır:

- Ödeme alınmasına rağmen ürün teslim edilememesi
- Teknik sorun nedeniyle teslimat yapılamaması
- Stok yetersizliği nedeniyle siparişin iptal edilmesi
- PINLY kaynaklı hata durumları

## 4. İADE SÜRECİ

### 4.1. İade Talebi Oluşturma

İade hakkı doğan durumlarda:

1. Hesabınıza giriş yapın
2. "Siparişlerim" bölümüne gidin
3. İlgili siparişi seçin
4. "Destek Talebi Oluştur" butonuna tıklayın
5. Durumu açıklayın

### 4.2. İade Süresi

- İade talepleri 24-48 saat içinde değerlendirilir
- Onaylanan iadeler, ödeme yöntemine göre:
  - **Kredi Kartı:** 5-10 iş günü
  - **Banka Kartı:** 5-10 iş günü
  - **Site Bakiyesi:** Anında

### 4.3. İade Tutarı

İade, sipariş tutarının tamamı üzerinden yapılır. Kısmi iade uygulanmaz.

## 5. SİPARİŞ İPTALİ

### 5.1. İptal Edilebilen Siparişler

- Ödeme bekleyen siparişler
- Henüz işleme alınmamış siparişler

### 5.2. İptal Edilemeyen Siparişler

- Ödeme tamamlanmış ve işleme alınmış siparişler
- Teslim edilmiş siparişler

## 6. HATALI TESLİMAT

### 6.1. PINLY Hatası

PINLY kaynaklı hatalı teslimat durumunda (yanlış ürün, eksik miktar vb.):

- Doğru ürün/miktar ücretsiz olarak teslim edilir
- Veya tam iade yapılır

### 6.2. Kullanıcı Hatası

Kullanıcı kaynaklı hatalar (yanlış ID girişi vb.) için:

- PINLY sorumluluk kabul etmez
- Ancak mümkünse çözüm için yardımcı olunmaya çalışılır

## 7. CHARGEBACK (TERS İBRAZ) POLİTİKASI

### 7.1. Uyarı

Ürün teslim edildikten sonra yapılan chargeback talepleri:

- Dolandırıcılık girişimi olarak değerlendirilir
- Yasal işlem başlatılır
- Hesap kalıcı olarak kapatılır

### 7.2. Sorun Çözümü

Herhangi bir sorun yaşadığınızda öncelikle müşteri hizmetlerimizle iletişime geçmenizi rica ederiz.

## 8. İLETİŞİM

İade ve iptal konularında:

**E-posta:** info@pinly.com.tr  
**Destek:** Hesabınız üzerinden destek talebi oluşturabilirsiniz

---

**PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ**  
Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA  
Mersis No: 0730089706000001`,
    isActive: true,
    order: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'KVKK Aydınlatma Metni',
    slug: 'kvkk',
    content: `# KVKK Aydınlatma Metni

**Son Güncelleme:** Şubat 2026

PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ ("PINLY") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla, kişisel verilerinizin işlenmesine ilişkin sizleri aydınlatmak istiyoruz.

## 1. VERİ SORUMLUSU

**Unvan:** PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ  
**Adres:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA  
**Mersis No:** 0730089706000001  
**Ticaret Sicil No:** 541409  
**E-posta:** kvkk@pinly.com.tr

## 2. İŞLENEN KİŞİSEL VERİLER

### 2.1. Kimlik Bilgileri
- Ad ve soyad

### 2.2. İletişim Bilgileri
- E-posta adresi
- Telefon numarası

### 2.3. Müşteri İşlem Bilgileri
- Sipariş bilgileri
- Ödeme kayıtları
- İşlem geçmişi

### 2.4. İşlem Güvenliği Bilgileri
- IP adresi
- Log kayıtları
- Tarayıcı bilgileri
- Çerez verileri

### 2.5. Pazarlama Bilgileri
- Tercihler ve ilgi alanları (onay verilmesi halinde)

## 3. KİŞİSEL VERİLERİN İŞLENME AMAÇLARI

Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:

### 3.1. Hukuki Yükümlülüklerin Yerine Getirilmesi
- Yasal düzenlemelere uyum
- Vergi mevzuatı gereklilikleri
- 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun yükümlülükleri

### 3.2. Sözleşmenin İfası
- Üyelik işlemlerinin gerçekleştirilmesi
- Sipariş ve ödeme işlemleri
- Dijital ürün teslimatı
- Müşteri hizmetleri

### 3.3. Meşru Menfaatler
- Dolandırıcılık önleme
- Risk değerlendirmesi
- Hizmet kalitesinin artırılması
- İstatistiksel analizler

### 3.4. Açık Rıza (Onay Verilmesi Halinde)
- Pazarlama ve promosyon iletişimi
- Kişiselleştirilmiş içerik sunumu

## 4. KİŞİSEL VERİLERİN AKTARILMASI

Kişisel verileriniz, yukarıda belirtilen amaçlarla sınırlı olmak üzere:

### 4.1. Yurt İçi Aktarım
- Ödeme kuruluşları ve bankalar
- Hukuk müşavirleri
- Denetim şirketleri
- Yetkili kamu kurum ve kuruluşları

### 4.2. Yurt Dışı Aktarım
- Oyun yayıncıları (teslimat için gerekli minimum bilgi)
- Ödeme altyapı sağlayıcıları

Yurt dışı aktarımlar, KVKK'nın 9. maddesi kapsamında yeterli koruma bulunan ülkelere veya açık rızanızın alınması suretiyle gerçekleştirilir.

## 5. KİŞİSEL VERİLERİN TOPLANMA YÖNTEMİ VE HUKUKİ SEBEBİ

Kişisel verileriniz:

- Web sitesi üzerinden elektronik ortamda
- Müşteri hizmetleri iletişimi yoluyla
- Çerezler aracılığıyla

otomatik ve otomatik olmayan yöntemlerle toplanmaktadır.

**Hukuki Sebepler:**
- Kanunlarda açıkça öngörülmesi (KVKK m.5/2-a)
- Sözleşmenin kurulması veya ifası (KVKK m.5/2-c)
- Hukuki yükümlülüğün yerine getirilmesi (KVKK m.5/2-ç)
- Veri sorumlusunun meşru menfaati (KVKK m.5/2-f)
- Açık rıza (pazarlama faaliyetleri için)

## 6. KİŞİSEL VERİLERİN SAKLANMA SÜRESİ

Kişisel verileriniz:

- **Üyelik bilgileri:** Üyelik süresince ve sonrasında 3 yıl
- **Sipariş ve ödeme bilgileri:** 10 yıl (vergi mevzuatı)
- **Log kayıtları:** 2 yıl
- **Pazarlama verileri:** Onay geri çekilene kadar

## 7. İLGİLİ KİŞİNİN HAKLARI

KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:

a) Kişisel verilerinizin işlenip işlenmediğini öğrenme  
b) İşlenmişse buna ilişkin bilgi talep etme  
c) İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme  
d) Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme  
e) Eksik veya yanlış işlenmişse düzeltilmesini isteme  
f) KVKK'nın 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme  
g) Düzeltme, silme veya yok etme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme  
h) İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme  
i) Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme

## 8. BAŞVURU YÖNTEMİ

Yukarıda belirtilen haklarınızı kullanmak için:

**E-posta:** kvkk@pinly.com.tr  
**Posta:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA

adreslerine kimliğinizi tespit edici belgelerle birlikte başvurabilirsiniz.

Başvurularınız en geç 30 gün içinde ücretsiz olarak sonuçlandırılacaktır.

---

**PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ**`,
    isActive: true,
    order: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    title: 'Çerez Politikası',
    slug: 'cerez-politikasi',
    content: `# Çerez Politikası

**Son Güncelleme:** Şubat 2026

PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ ("PINLY") olarak, pinly.com.tr web sitesinde ("Site") çerezleri nasıl kullandığımızı açıklamak istiyoruz.

## 1. ÇEREZ NEDİR?

Çerezler, web sitelerinin bilgisayarınıza, telefonunuza veya tabletinize yerleştirdiği küçük metin dosyalarıdır. Bu dosyalar, siteyi ziyaretiniz sırasında ve sonraki ziyaretlerinizde sizi tanımamıza yardımcı olur.

## 2. KULLANILAN ÇEREZ TÜRLERİ

### 2.1. Zorunlu Çerezler

Sitenin çalışması için gerekli çerezlerdir.

| Çerez Adı | Amacı | Süresi |
|-----------|-------|--------|
| session_id | Oturum yönetimi | Oturum |
| auth_token | Kullanıcı kimlik doğrulama | 7 gün |
| csrf_token | Güvenlik | Oturum |

### 2.2. İşlevsellik Çerezleri

Tercihlerinizi hatırlamamıza yardımcı olan çerezlerdir.

| Çerez Adı | Amacı | Süresi |
|-----------|-------|--------|
| language | Dil tercihi | 1 yıl |
| currency | Para birimi tercihi | 1 yıl |
| theme | Tema tercihi | 1 yıl |

### 2.3. Performans Çerezleri

Site performansını ölçmemize yardımcı olan çerezlerdir.

| Çerez Adı | Amacı | Süresi |
|-----------|-------|--------|
| _ga | Google Analytics - Ziyaretçi istatistikleri | 2 yıl |
| _gid | Google Analytics - Oturum tanımlama | 24 saat |

### 2.4. Pazarlama Çerezleri (İsteğe Bağlı)

Reklam ve pazarlama amaçlı çerezlerdir. Bu çerezler yalnızca onayınızla kullanılır.

## 3. ÇEREZ TERCİHLERİNİZİ YÖNETİN

### 3.1. Tarayıcı Ayarları

Tarayıcınızın ayarlarından çerezleri yönetebilirsiniz:

- **Chrome:** Ayarlar > Gizlilik ve güvenlik > Çerezler
- **Firefox:** Ayarlar > Gizlilik ve Güvenlik > Çerezler
- **Safari:** Tercihler > Gizlilik > Çerezler
- **Edge:** Ayarlar > Çerezler ve site izinleri

### 3.2. Çerez Banner'ı

Siteyi ilk ziyaretinizde görüntülenen çerez banner'ından tercihlerinizi belirleyebilirsiniz.

## 4. ÇEREZ REDDİNİN SONUÇLARI

Zorunlu çerezleri reddetmeniz durumunda:
- Siteye giriş yapamayabilirsiniz
- Alışveriş sepeti çalışmayabilir
- Bazı özellikler kullanılamaz olabilir

## 5. ÜÇÜNCÜ TARAF ÇEREZLERİ

Sitemizde aşağıdaki üçüncü taraf hizmetlerinin çerezleri kullanılabilir:

| Servis | Amacı | Gizlilik Politikası |
|--------|-------|---------------------|
| Google Analytics | İstatistik | policies.google.com/privacy |
| Crisp Chat | Canlı destek | crisp.chat/privacy |

## 6. GÜNCELLEMELER

Bu Çerez Politikası, gerekli görüldüğünde güncellenebilir. Önemli değişiklikler sitede duyurulacaktır.

## 7. İLETİŞİM

Çerez politikamız hakkında sorularınız için:

**E-posta:** info@pinly.com.tr  
**Adres:** Kızılırmak Mah. Dumlupınar Bul. No: 3C-1 İç Kapı No: 160 Çankaya / ANKARA

---

**PİNLY ELEKTRONİK HİZMETLER TİCARET ANONİM ŞİRKETİ**  
Mersis No: 0730089706000001`,
    isActive: true,
    order: 6,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createLegalPages() {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL);
    const db = client.db(DB_NAME);
    
    console.log('Creating legal pages...');
    
    for (const page of legalPages) {
      // Check if page already exists
      const existing = await db.collection('legal_pages').findOne({ slug: page.slug });
      
      if (existing) {
        // Update existing
        await db.collection('legal_pages').updateOne(
          { slug: page.slug },
          { $set: { ...page, id: existing.id, updatedAt: new Date() } }
        );
        console.log('Updated:', page.title);
      } else {
        // Insert new
        await db.collection('legal_pages').insertOne(page);
        console.log('Created:', page.title);
      }
    }
    
    console.log('All legal pages created/updated successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

createLegalPages();
