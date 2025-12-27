'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const legalPages = {
  'terms': {
    title: 'Hizmet Şartları',
    content: `# Hizmet Şartları

Bu web sitesini kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.

## 1. Genel Koşullar

Bu site üzerinden sunulan tüm hizmetler, yürürlükteki yasalara uygun olarak sunulmaktadır. Kullanıcılar, siteyi kullanırken tüm yasal düzenlemelere uymayı kabul ederler.

## 2. Hizmet Kullanımı

Sitemizdeki hizmetleri kullanabilmek için 18 yaşından büyük olmanız veya yasal vasi onayı almanız gerekmektedir.

## 3. Ödeme Koşulları

Tüm ödemeler güvenli ödeme altyapısı üzerinden gerçekleştirilir. Ödeme işlemi tamamlandıktan sonra siparişiniz işleme alınır.

## 4. Teslimat

Dijital ürünler, ödeme onayının ardından otomatik olarak teslim edilir.

## 5. Değişiklikler

Bu şartlar önceden haber verilmeksizin değiştirilebilir. Güncel şartları takip etmek kullanıcının sorumluluğundadır.

Son güncelleme: Ocak 2025`
  },
  'user-agreement': {
    title: 'Kullanıcı Sözleşmesi',
    content: `# Kullanıcı Sözleşmesi

Bu sözleşme, site ile kullanıcı arasındaki hak ve yükümlülükleri düzenler.

## 1. Taraflar

Bu sözleşme, web sitesi işletmecisi ve siteyi kullanan kullanıcı arasında yapılmıştır.

## 2. Kullanıcı Yükümlülükleri

- Doğru ve güncel bilgi vermek
- Hesap güvenliğini sağlamak
- Yasalara uygun hareket etmek
- Başkalarının haklarına saygı göstermek

## 3. Site Yükümlülükleri

- Güvenli hizmet sunmak
- Kişisel verileri korumak
- Siparişleri zamanında teslim etmek
- Müşteri desteği sağlamak

## 4. Sözleşme Süresi

Bu sözleşme, kullanıcının siteye üye olduğu andan itibaren geçerlidir.

Son güncelleme: Ocak 2025`
  },
  'rules': {
    title: 'Kurallar Politikası ve Davranış İlkeleri',
    content: `# Kurallar Politikası ve Davranış İlkeleri

Platformumuzu kullanan tüm kullanıcıların uyması gereken kurallar ve davranış ilkeleri aşağıda belirtilmiştir.

## 1. Genel Kurallar

- Yasalara uygun hareket edin
- Diğer kullanıcılara saygılı olun
- Spam ve yanıltıcı içerik paylaşmayın
- Güvenlik açıklarını kötüye kullanmayın

## 2. Hesap Kullanımı

- Her kullanıcı tek bir hesap açabilir
- Hesap bilgilerini başkalarıyla paylaşmayın
- Şüpheli aktiviteleri bildirin

## 3. Ödeme Kuralları

- Sadece kendi adınıza ödeme yapın
- Sahte veya çalıntı kart kullanmayın
- Geri ödeme talepleri için müşteri hizmetleriyle iletişime geçin

## 4. Yaptırımlar

Kurallara uymayan kullanıcıların hesapları askıya alınabilir veya kapatılabilir.

Son güncelleme: Ocak 2025`
  },
  'privacy': {
    title: 'Gizlilik Politikası',
    content: `# Gizlilik Politikası

Kişisel verilerinizin korunması bizim için önemlidir. Bu politika, verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.

## 1. Toplanan Veriler

- Ad, soyad ve e-posta adresi
- Ödeme bilgileri (güvenli şekilde işlenir)
- IP adresi ve tarayıcı bilgileri
- Sipariş geçmişi

## 2. Verilerin Kullanımı

Topladığımız veriler şu amaçlarla kullanılır:
- Siparişlerinizi işlemek
- Müşteri desteği sağlamak
- Hizmetlerimizi geliştirmek
- Yasal yükümlülükleri yerine getirmek

## 3. Veri Güvenliği

- SSL şifreleme kullanılır
- Veriler güvenli sunucularda saklanır
- Erişim yetkileri sınırlıdır

## 4. Üçüncü Taraflar

Verileriniz, yalnızca hizmet sunumu için gerekli olan üçüncü taraflarla (ödeme işlemcileri gibi) paylaşılır.

## 5. Haklarınız

Verilerinize erişim, düzeltme veya silme talep edebilirsiniz.

Son güncelleme: Ocak 2025`
  },
  'cookies': {
    title: 'Çerez Politikası',
    content: `# Çerez Politikası

Bu site, deneyiminizi geliştirmek için çerezler kullanmaktadır.

## 1. Çerez Nedir?

Çerezler, web sitelerinin tarayıcınıza kaydettiği küçük metin dosyalarıdır.

## 2. Kullandığımız Çerezler

### Zorunlu Çerezler
- Oturum yönetimi
- Güvenlik
- Sepet işlemleri

### Analitik Çerezler
- Site kullanım istatistikleri
- Performans ölçümü

### Tercih Çerezleri
- Dil tercihleri
- Tema ayarları

## 3. Çerez Yönetimi

Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz. Ancak bu, bazı site özelliklerinin çalışmamasına neden olabilir.

## 4. Üçüncü Taraf Çerezleri

Ödeme ve analitik hizmetleri için üçüncü taraf çerezleri kullanılabilir.

Son güncelleme: Ocak 2025`
  },
  'kvkk': {
    title: 'KVKK Aydınlatma Metni',
    content: `# KVKK Aydınlatma Metni

6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında aydınlatma yükümlülüğümüzü yerine getirmek amacıyla bu metni hazırladık.

## 1. Veri Sorumlusu

Kişisel verileriniz, veri sorumlusu sıfatıyla şirketimiz tarafından işlenmektedir.

## 2. İşlenen Kişisel Veriler

- Kimlik bilgileri (ad, soyad)
- İletişim bilgileri (e-posta, telefon)
- Finansal bilgiler (ödeme bilgileri)
- İşlem güvenliği bilgileri (IP adresi, log kayıtları)

## 3. Veri İşleme Amaçları

- Sözleşmesel yükümlülüklerin yerine getirilmesi
- Müşteri ilişkileri yönetimi
- Yasal yükümlülüklerin yerine getirilmesi
- Güvenliğin sağlanması

## 4. Veri İşleme Hukuki Sebepleri

- Sözleşmenin ifası
- Kanuni yükümlülük
- Meşru menfaat

## 5. Veri Aktarımı

Kişisel verileriniz, yurt içindeki iş ortaklarımıza ve yasal mercilere aktarılabilir.

## 6. Haklarınız

KVKK'nın 11. maddesi kapsamında:
- Kişisel verilerinizin işlenip işlenmediğini öğrenme
- İşlenmişse bilgi talep etme
- İşlenme amacını öğrenme
- Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme
- Eksik veya yanlış işlenmişse düzeltilmesini isteme
- Silinmesini veya yok edilmesini isteme
- Otomatik sistemlerle analiz sonucu aleyhe bir sonuç çıkmasına itiraz etme
- Zarara uğramanız halinde zararın giderilmesini talep etme

## 7. Başvuru

Haklarınızı kullanmak için destek@site.com adresine başvurabilirsiniz.

Son güncelleme: Ocak 2025`
  },
  'refund': {
    title: 'İade Politikası',
    content: `# İade Politikası

Dijital ürünlerin iade koşulları aşağıda belirtilmiştir.

## 1. Genel İade Kuralları

Dijital ürünler, doğası gereği teslim edildikten sonra iade edilemez. Ancak aşağıdaki durumlarda iade yapılabilir:

## 2. İade Yapılabilecek Durumlar

- Ürün teslim edilmemişse
- Teknik bir sorun nedeniyle ürün kullanılamıyorsa
- Yanlış ürün gönderilmişse

## 3. İade Süreci

1. Müşteri hizmetleriyle iletişime geçin
2. Sipariş numaranızı ve sorunu belirtin
3. Ekibimiz durumu inceleyecektir
4. Onaylanan iadeler 5-10 iş günü içinde hesabınıza yansır

## 4. İade Yapılamayacak Durumlar

- Ürün kullanıldıktan sonra
- Sipariş tamamlandıktan 7 gün sonra
- Kullanıcı hatası nedeniyle oluşan sorunlarda

## 5. İletişim

İade talepleriniz için: destek@site.com

Son güncelleme: Ocak 2025`
  },
  'aml': {
    title: 'Kara Paranın Aklanmasının Önlenmesi Politikası',
    content: `# Kara Paranın Aklanmasının Önlenmesi Politikası

Şirketimiz, kara para aklama ve terörün finansmanı ile mücadele konusunda yasal düzenlemelere tam uyum sağlamaktadır.

## 1. Amaç

Bu politika, kara para aklama ve terörün finansmanı faaliyetlerini önlemek amacıyla oluşturulmuştur.

## 2. Yasal Çerçeve

- 5549 sayılı Suç Gelirlerinin Aklanmasının Önlenmesi Hakkında Kanun
- İlgili yönetmelikler ve tebliğler

## 3. Müşteri Tanıma (KYC)

- Müşteri kimlik doğrulaması yapılır
- Risk değerlendirmesi yapılır
- Şüpheli işlemler takip edilir

## 4. İşlem İzleme

- Olağandışı işlemler tespit edilir
- Büyük tutarlı işlemler incelenir
- Şüpheli aktiviteler raporlanır

## 5. Raporlama

Şüpheli işlemler, yetkili mercilere (MASAK) bildirilir.

## 6. Eğitim

Çalışanlarımız düzenli olarak AML eğitimi almaktadır.

## 7. Kayıt Tutma

Tüm işlem kayıtları yasal süre boyunca saklanır.

Son güncelleme: Ocak 2025`
  }
};

export default function LegalPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  
  const page = legalPages[slug];
  
  if (!page) {
    return (
      <div className="min-h-screen bg-[#12151a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sayfa Bulunamadı</h1>
          <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700">
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    );
  }

  // Simple markdown-like rendering
  const renderContent = (content) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-3xl font-bold text-white mt-8 mb-4">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-semibold text-white mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-medium text-white mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="text-white/70 ml-4 mb-1">{line.slice(2)}</li>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="text-white/70 mb-2">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-[#12151a]">
      {/* Header */}
      <header className="bg-[#1e2229] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ana Sayfa
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#1e2229] rounded-xl p-6 md:p-10">
          {renderContent(page.content)}
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center text-white/30 text-sm">
          © 2025 PUBG UC Store. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
