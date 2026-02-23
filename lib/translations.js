// Comprehensive TR/EN Translation Dictionary for Pinly
// Used for IP-based localization: Turkey -> TR, International -> EN

const translations = {
  // Header - Trust Badges
  'header.sslSecure': { tr: 'SSL Güvenli', en: 'SSL Secure' },
  'header.instantDelivery': { tr: 'Anında Teslimat', en: 'Instant Delivery' },
  'header.support247': { tr: '7/24 Destek', en: '24/7 Support' },
  'header.happyCustomers': { tr: '10.000+ Mutlu Müşteri', en: '10,000+ Happy Customers' },
  'header.happyCustomersShort': { tr: '10K+', en: '10K+' },
  'header.ssl': { tr: 'SSL', en: 'SSL' },
  'header.instant': { tr: 'Anında', en: 'Instant' },
  'header.support': { tr: '7/24', en: '24/7' },

  // Auth Buttons
  'auth.login': { tr: 'Giriş Yap', en: 'Sign In' },
  'auth.register': { tr: 'Kayıt Ol', en: 'Sign Up' },
  'auth.myAccount': { tr: 'Hesabım', en: 'My Account' },
  'auth.logout': { tr: 'Çıkış Yap', en: 'Sign Out' },
  'auth.loginSuccess': { tr: 'Giriş başarılı!', en: 'Login successful!' },
  'auth.logoutSuccess': { tr: 'Çıkış yapıldı', en: 'Signed out' },
  'auth.sessionExpired': { tr: 'Oturumunuz sonlandı. Lütfen tekrar giriş yapın', en: 'Your session has expired. Please sign in again' },
  'auth.loginRequired': { tr: 'Sipariş vermek için giriş yapmalısınız', en: 'Please sign in to place an order' },

  // User Menu
  'menu.myOrders': { tr: 'Siparişlerim', en: 'My Orders' },
  'menu.supportTickets': { tr: 'Destek Taleplerim', en: 'Support Tickets' },
  'menu.liveSupport': { tr: 'Canlı Destek', en: 'Live Support' },
  'menu.liveSupportClosed': { tr: 'Canlı Destek Kapalı', en: 'Live Support Offline' },
  'menu.liveSupportHoursOpen': { tr: 'arası açık', en: 'hours' },
  'menu.createSupportTicket': { tr: 'Destek Talebi Oluştur', en: 'Create Support Ticket' },

  // Categories
  'nav.categories': { tr: 'Kategoriler', en: 'Categories' },
  'nav.gameCategories': { tr: 'Oyun Kategorileri', en: 'Game Categories' },
  'nav.home': { tr: 'Anasayfa', en: 'Home' },
  'nav.games': { tr: 'Oyunlar', en: 'Games' },
  'nav.breadcrumb': { tr: 'Anasayfa > Oyunlar', en: 'Home > Games' },

  // Banner
  'banner.dailyPrices': { tr: 'Bugüne Özel Fiyatlar', en: 'Today\'s Special Prices' },
  'banner.campaignEnds': { tr: 'Kampanya bitimine', en: 'Campaign ends in' },
  'banner.dailyCampaign': { tr: 'Günlük Kampanya', en: 'Daily Campaign' },

  // Sidebar Filters
  'filter.gameType': { tr: 'Oyun Türü', en: 'Game Type' },
  'filter.region': { tr: 'Bölge', en: 'Region' },

  // Product Cards
  'product.mobile': { tr: 'MOBİLE', en: 'MOBILE' },
  'product.ucChance': { tr: 'UC Yükleme Şansı', en: 'UC Top-Up' },
  'product.availableInRegion': { tr: 'Bölgenizde kullanılabilir', en: 'Available in your region' },
  'product.discount': { tr: 'indirim', en: 'discount' },
  'product.mostPopular': { tr: 'EN ÇOK TERCİH EDİLEN', en: 'MOST POPULAR' },

  // Live Support Button
  'support.liveSupport': { tr: 'Canlı Destek', en: 'Live Support' },
  'support.liveSupportClosed': { tr: 'Canlı Destek Kapalı', en: 'Live Support Offline' },
  'support.openHours': { tr: 'arası açık', en: 'hours' },

  // Tabs
  'tab.description': { tr: 'Açıklama', en: 'Description' },
  'tab.reviews': { tr: 'Değerlendirmeler', en: 'Reviews' },

  // Description defaults
  'desc.ucInfo': {
    tr: 'PUBG Mobile UC (Unknown Cash), oyun içi premium para birimidir. UC ile özel kostümler, silah skinleri, Royale Pass ve daha birçok özel içeriğe erişebilirsiniz.',
    en: 'PUBG Mobile UC (Unknown Cash) is the in-game premium currency. With UC, you can access exclusive costumes, weapon skins, Royale Pass, and many more premium contents.'
  },
  'desc.instantDelivery': { tr: 'Anında Teslimat', en: 'Instant Delivery' },
  'desc.instantDeliveryDesc': {
    tr: 'Ödemeniz onaylandıktan sonra UC\'ler anında hesabınıza yüklenir.',
    en: 'UC will be loaded to your account instantly after payment confirmation.'
  },
  'desc.securePayment': { tr: 'Güvenli Ödeme', en: 'Secure Payment' },
  'desc.securePaymentDesc': {
    tr: '256-bit SSL şifreleme ile tüm ödemeleriniz güvende.',
    en: 'All your payments are secure with 256-bit SSL encryption.'
  },
  'desc.showLess': { tr: 'Daha az göster', en: 'Show less' },
  'desc.showMore': { tr: 'Devamını göster', en: 'Show more' },
  'desc.ucPackages': { tr: 'UC Paketleri', en: 'UC Packages' },
  'desc.faq': { tr: 'Sıkça Sorulan Sorular', en: 'Frequently Asked Questions' },

  // Reviews
  'review.count': { tr: 'değerlendirme', en: 'reviews' },
  'review.noReviews': { tr: 'Henüz değerlendirme bulunmuyor.', en: 'No reviews yet.' },
  'review.loadMore': { tr: 'Daha fazla görüntüle', en: 'Load more' },
  'review.loading': { tr: 'Yükleniyor...', en: 'Loading...' },
  'review.guest': { tr: 'Misafir', en: 'Guest' },
  'review.comments': { tr: 'yorum', en: 'reviews' },

  // Checkout Dialog
  'checkout.selectPaymentType': { tr: 'ÖDEME TÜRÜNÜ SEÇİN', en: 'SELECT PAYMENT METHOD' },
  'checkout.playerId': { tr: 'Oyuncu ID', en: 'Player ID' },
  'checkout.enterPlayerId': { tr: 'Oyuncu ID Girin', en: 'Enter Player ID' },
  'checkout.playerFound': { tr: 'Oyuncu Bulundu', en: 'Player Found' },
  'checkout.change': { tr: 'Değiştir', en: 'Change' },
  'checkout.enterYourPlayerId': { tr: 'Oyuncu ID\'nizi girin', en: 'Enter your Player ID' },
  'checkout.paymentMethods': { tr: 'Ödeme yöntemleri', en: 'Payment Methods' },
  'checkout.payWithBalance': { tr: 'Bakiye ile Öde', en: 'Pay with Balance' },
  'checkout.instantDelivery': { tr: 'Anında teslimat', en: 'Instant delivery' },
  'checkout.currentBalance': { tr: 'Mevcut Bakiye', en: 'Current Balance' },
  'checkout.sufficientBalance': { tr: 'Yeterli bakiye', en: 'Sufficient balance' },
  'checkout.creditDebitCard': { tr: 'Kredi / Banka Kartı', en: 'Credit / Debit Card' },
  'checkout.securePayment': { tr: 'Güvenli Ödeme', en: 'Secure Payment' },
  'checkout.product': { tr: 'Ürün', en: 'Product' },
  'checkout.topUpChance': { tr: 'Yükleme Şansı', en: 'Top-Up' },
  'checkout.priceDetails': { tr: 'Fiyat detayları', en: 'Price Details' },
  'checkout.originalPrice': { tr: 'Orjinal Fiyat', en: 'Original Price' },
  'checkout.specialPrice': { tr: 'Size Özel Fiyat', en: 'Your Special Price' },
  'checkout.totalAmount': { tr: 'Ödenecek Tutar', en: 'Total Amount' },
  'checkout.termsAccept': { tr: 'okudum ve kabul ediyorum.', en: 'I have read and accept.' },
  'checkout.salesTerms': { tr: 'Satış koşullarını', en: 'Terms of sale' },
  'checkout.proceedToPayment': { tr: 'Ödemeye Git', en: 'Proceed to Payment' },
  'checkout.processing': { tr: 'İşleniyor...', en: 'Processing...' },
  'checkout.selectPaymentMethod': { tr: 'Lütfen bir ödeme yöntemi seçin', en: 'Please select a payment method' },
  'checkout.insufficientBalance': { tr: 'Yetersiz bakiye. Eksik:', en: 'Insufficient balance. Missing:' },
  'checkout.paymentPageError': { tr: 'Ödeme sayfası oluşturulamadı', en: 'Payment page could not be created' },
  'checkout.orderError': { tr: 'Sipariş oluşturulamadı', en: 'Order could not be created' },
  'checkout.orderProcessError': { tr: 'Sipariş işlemi sırasında bir hata oluştu', en: 'An error occurred during the order process' },
  'checkout.orderSuccess': { tr: 'Sipariş başarıyla oluşturuldu! Kodlarınız hesabınıza yükleniyor...', en: 'Order placed successfully! Your codes are being loaded...' },

  // Player ID Modal
  'player.error': { tr: 'Hata', en: 'Error' },
  'player.title': { tr: 'Oyuncu ID', en: 'Player ID' },
  'player.enterLabel': { tr: 'Oyuncu ID\'nizi girin', en: 'Enter your Player ID' },
  'player.placeholder': { tr: 'Oyuncu ID', en: 'Player ID' },
  'player.verifying': { tr: 'Doğrulanıyor...', en: 'Verifying...' },
  'player.confirm': { tr: 'Onayla', en: 'Confirm' },
  'player.minChars': { tr: 'Oyuncu ID en az 6 karakter olmalıdır', en: 'Player ID must be at least 6 characters' },
  'player.notFound': { tr: 'Oyuncu bulunamadı', en: 'Player not found' },
  'player.connectionError': { tr: 'Bağlantı hatası. Lütfen tekrar deneyin.', en: 'Connection error. Please try again.' },
  'player.found': { tr: 'Oyuncu bulundu', en: 'Player found' },

  // Footer
  'footer.description': { tr: 'Güvenli ve hızlı UC satın alma platformu', en: 'Secure and fast UC purchase platform' },
  'footer.quickAccess': { tr: 'Hızlı Erişim', en: 'Quick Access' },
  'footer.popularCategories': { tr: 'Popüler Kategoriler', en: 'Popular Categories' },
  'footer.corporate': { tr: 'Kurumsal/Künye', en: 'Corporate' },
  'footer.aboutUs': { tr: 'Hakkımızda', en: 'About Us' },
  'footer.privacyPolicy': { tr: 'Gizlilik Politikası', en: 'Privacy Policy' },
  'footer.userAgreement': { tr: 'Kullanıcı Sözleşmesi', en: 'User Agreement' },
  'footer.distanceSales': { tr: 'Mesafeli Satış Sözleşmesi', en: 'Distance Sales Agreement' },
  'footer.cancellationRefund': { tr: 'İptal ve İade Koşulları', en: 'Cancellation & Refund Policy' },
  'footer.kvkk': { tr: 'KVKK Aydınlatma Metni', en: 'Data Protection Notice' },
  'footer.cookiePolicy': { tr: 'Çerez Politikası', en: 'Cookie Policy' },
  'footer.tradeRegistry': { tr: 'Ticaret Sicil No', en: 'Trade Registry No' },
  'footer.taxNo': { tr: 'Vergi No', en: 'Tax No' },
  'footer.mersisNo': { tr: 'Mersis No', en: 'Mersis No' },
  'footer.companyTitle': { tr: 'Unvan', en: 'Company Title' },
  'footer.address': { tr: 'Adres', en: 'Address' },
  'footer.contact': { tr: 'İletişim', en: 'Contact' },
  'footer.email': { tr: 'E-Posta', en: 'Email' },
  'footer.phone': { tr: 'Tel', en: 'Phone' },
  'footer.paymentMethods': { tr: 'Ödeme Yöntemleri', en: 'Payment Methods' },
  'footer.allRightsReserved': { tr: 'Tüm hakları saklıdır.', en: 'All rights reserved.' },
  'footer.digitalDelivery': {
    tr: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir.',
    en: 'In-game codes and digital pins are delivered instantly via PINLY.'
  },

  // Phone Modal
  'phone.title': { tr: 'Telefon Numarası Gerekli', en: 'Phone Number Required' },
  'phone.description': { tr: 'Siparişleriniz için telefon numaranıza ihtiyacımız var', en: 'We need your phone number for your orders' },
  'phone.label': { tr: 'Telefon Numarası', en: 'Phone Number' },
  'phone.saving': { tr: 'Kaydediliyor...', en: 'Saving...' },
  'phone.confirmContinue': { tr: 'Onayla ve Devam Et', en: 'Confirm and Continue' },

  // Terms Modal
  'terms.title': { tr: 'Satış Koşulları ve Kullanım Şartları', en: 'Terms of Sale and Conditions of Use' },
  'terms.accept': { tr: 'Okudum, Kabul Ediyorum', en: 'I Have Read and Accept' },
  'terms.generalTerms': { tr: 'Genel Hükümler', en: 'General Terms' },
  'terms.generalTermsText': {
    tr: 'Bu satış koşulları, PINLY platformu üzerinden gerçekleştirilen tüm dijital ürün satışlarını kapsamaktadır. Satın alma işlemi gerçekleştirerek bu koşulları kabul etmiş sayılırsınız.',
    en: 'These terms of sale cover all digital product sales made through the PINLY platform. By making a purchase, you are deemed to have accepted these terms.'
  },
  'terms.productDefinitions': { tr: 'Ürün Tanımları ve Özel Koşullar', en: 'Product Definitions and Special Conditions' },
  'terms.productDefinitionsText': {
    tr: 'Platformumuzda satışa sunulan ürünler farklı kategorilerde olabilir:',
    en: 'Products available on our platform may be in different categories:'
  },
  'terms.standardPackages': {
    tr: 'Standart UC Paketleri: Belirtilen miktarda UC içerir.',
    en: 'Standard UC Packages: Contains the specified amount of UC.'
  },
  'terms.chancePackages': {
    tr: 'Şans/Yükleme Şansı Paketleri: Bu ürünler rastgele UC miktarı içermektedir. Ürün başlığında "şans", "yükleme şansı", "rastgele" veya benzeri ifadeler bulunan paketlerde, düşük veya yüksek miktarda UC çıkabilir. Bu tür ürünlerde çıkan UC miktarı garanti edilmemekte olup, tamamen şansa dayalıdır.',
    en: 'Chance/Top-Up Chance Packages: These products contain a random amount of UC. In packages with "chance", "top-up chance", "random" or similar expressions in the title, low or high amounts of UC may be obtained. The amount of UC in such products is not guaranteed and is entirely based on chance.'
  },
  'terms.refundPolicy': { tr: 'İade ve İptal Politikası', en: 'Refund and Cancellation Policy' },
  'terms.refundPolicyText': {
    tr: 'Dijital ürünlerin doğası gereği, teslimat gerçekleştikten sonra iade veya iptal talepleri kabul edilmemektedir. Şans paketlerinde çıkan UC miktarı ne olursa olsun, ürün teslim edilmiş sayılır ve iade talep edilemez.',
    en: 'Due to the nature of digital products, refund or cancellation requests are not accepted after delivery. Regardless of the amount of UC obtained in chance packages, the product is considered delivered and refund cannot be requested.'
  },
  'terms.disclaimer': { tr: 'Sorumluluk Reddi', en: 'Disclaimer' },
  'terms.disclaimerText': {
    tr: 'Şans paketleri satın alan müşteriler, ürünün rastgele içerik barındırdığını ve sonucun önceden bilinemeyeceğini kabul eder. PINLY, şans paketlerinden çıkan UC miktarından dolayı herhangi bir sorumluluk kabul etmez.',
    en: 'Customers who purchase chance packages accept that the product contains random content and the result cannot be known in advance. PINLY does not accept any responsibility for the amount of UC obtained from chance packages.'
  },
  'terms.consent': { tr: 'Onay ve Kabul', en: 'Consent and Acceptance' },
  'terms.consentText': {
    tr: 'Bu koşulları onaylayarak, yukarıda belirtilen tüm maddeleri okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz. Şans paketleri dahil tüm ürünlerin özelliklerinden haberdar olduğunuzu teyit edersiniz.',
    en: 'By accepting these terms, you declare that you have read, understood and accepted all the items stated above. You confirm that you are aware of the features of all products, including chance packages.'
  },
  'terms.lastUpdate': { tr: 'Son güncelleme', en: 'Last updated' },
  'terms.updateNotice': {
    tr: 'Bu koşullar PINLY tarafından önceden haber verilmeksizin güncellenebilir.',
    en: 'These terms may be updated by PINLY without prior notice.'
  },
  'terms.legalWarning': { tr: 'Yasal Uyarı', en: 'Legal Notice' },

  // Balance
  'balance.label': { tr: 'Bakiye', en: 'Balance' },

  // Errors
  'error.loadProducts': { tr: 'Ürünler yüklenirken hata oluştu', en: 'Error loading products' },

  // Auth Modal specific
  'authModal.registerTitle': { tr: 'Kayıt Ol', en: 'Sign Up' },
  'authModal.loginTitle': { tr: 'Giriş Yap', en: 'Sign In' },
  'authModal.firstName': { tr: 'Ad', en: 'First Name' },
  'authModal.lastName': { tr: 'Soyad', en: 'Last Name' },
  'authModal.email': { tr: 'E-posta', en: 'Email' },
  'authModal.phone': { tr: 'Telefon', en: 'Phone' },
  'authModal.password': { tr: 'Şifre', en: 'Password' },
  'authModal.confirmPassword': { tr: 'Şifre Tekrar', en: 'Confirm Password' },
  'authModal.registerButton': { tr: 'Kayıt Ol', en: 'Sign Up' },
  'authModal.loginButton': { tr: 'Giriş Yap', en: 'Sign In' },
  'authModal.orContinueWith': { tr: 'veya', en: 'or' },
  'authModal.googleContinue': { tr: 'Google ile devam et', en: 'Continue with Google' },
  'authModal.registering': { tr: 'Kayıt yapılıyor...', en: 'Signing up...' },
  'authModal.loggingIn': { tr: 'Giriş yapılıyor...', en: 'Signing in...' },
  'authModal.forgotPassword': { tr: 'Şifremi Unuttum', en: 'Forgot Password' },
  'authModal.passwordMismatch': { tr: 'Şifreler eşleşmiyor', en: 'Passwords do not match' },
  'authModal.hasAccount': { tr: 'Zaten hesabınız var mı?', en: 'Already have an account?' },
  'authModal.noAccount': { tr: 'Hesabınız yok mu?', en: 'Don\'t have an account?' },

  // ============================================
  // ORDERS PAGE
  // ============================================
  'orders.title': { tr: 'Siparişlerim', en: 'My Orders' },
  'orders.homepage': { tr: 'Ana Sayfa', en: 'Home' },
  'orders.logout': { tr: 'Çıkış', en: 'Sign Out' },
  'orders.noOrders': { tr: 'Henüz sipariş yok', en: 'No orders yet' },
  'orders.noOrdersDesc': { tr: 'İlk siparişinizi vermek için ana sayfaya dönün', en: 'Return to home page to place your first order' },
  'orders.startShopping': { tr: 'Alışverişe Başla', en: 'Start Shopping' },
  'orders.orderNo': { tr: 'Sipariş No', en: 'Order No' },
  'orders.playerId': { tr: 'Oyuncu ID', en: 'Player ID' },
  'orders.player': { tr: 'Oyuncu', en: 'Player' },
  'orders.date': { tr: 'Tarih', en: 'Date' },
  'orders.amount': { tr: 'Tutar', en: 'Amount' },
  'orders.product': { tr: 'Ürün', en: 'Product' },
  'orders.codeReady': { tr: 'KODUNUZ HAZIR!', en: 'YOUR CODE IS READY!' },
  'orders.code': { tr: 'KOD', en: 'CODE' },
  'orders.copy': { tr: 'KOPYALA', en: 'COPY' },
  'orders.codeCopied': { tr: 'Kod kopyalandı!', en: 'Code copied!' },
  'orders.howToUse': { tr: 'Kodu nasıl kullanacağınızı görmek için tıklayın', en: 'Click to see how to use the code' },
  'orders.verificationRequired': { tr: 'DOĞRULAMA GEREKİYOR!', en: 'VERIFICATION REQUIRED!' },
  'orders.verificationDesc': { tr: 'Siparişe tıklayın, aşağı kaydırın ve kimlik doğrulaması yapın.', en: 'Click the order, scroll down and complete identity verification.' },
  'orders.verificationWarn': { tr: 'Doğrulama yapılmadan siparişiniz tamamlanamaz.', en: 'Your order cannot be completed without verification.' },
  'orders.reviewing': { tr: 'Belgeleriniz inceleniyor. En kısa sürede sonuçlandırılacak.', en: 'Your documents are being reviewed. Will be finalized shortly.' },
  'orders.rejected': { tr: 'Doğrulama reddedildi. Detaylar için tıklayın.', en: 'Verification rejected. Click for details.' },

  // Status badges
  'status.pending': { tr: 'Bekliyor', en: 'Pending' },
  'status.paid': { tr: 'Ödendi', en: 'Paid' },
  'status.failed': { tr: 'Başarısız', en: 'Failed' },
  'status.unknown': { tr: 'Bilinmiyor', en: 'Unknown' },
  'status.delivered': { tr: 'Teslim Edildi', en: 'Delivered' },
  'status.verificationRequired': { tr: 'DOĞRULAMA GEREKLİ', en: 'VERIFICATION REQUIRED' },
  'status.underReview': { tr: 'İnceleniyor', en: 'Under Review' },
  'status.rejectedStatus': { tr: 'Reddedildi', en: 'Rejected' },
  'status.stockPending': { tr: 'Stok Bekleniyor', en: 'Awaiting Stock' },

  // Common
  'common.loading': { tr: 'Yükleniyor...', en: 'Loading...' },
  'common.pleaseLogin': { tr: 'Lütfen giriş yapın', en: 'Please sign in' },
  'common.sessionExpired': { tr: 'Oturumunuz sonlandı', en: 'Session expired' },
  'common.connectionError': { tr: 'Bağlantı hatası', en: 'Connection error' },
  'common.loggedOut': { tr: 'Çıkış yapıldı', en: 'Signed out' },
  'common.save': { tr: 'Kaydet', en: 'Save' },
  'common.cancel': { tr: 'İptal', en: 'Cancel' },
  'common.back': { tr: 'Geri', en: 'Back' },
  'common.send': { tr: 'Gönder', en: 'Send' },
  'common.close': { tr: 'Kapat', en: 'Close' },
  'common.yes': { tr: 'Evet', en: 'Yes' },
  'common.no': { tr: 'Hayır', en: 'No' },

  // Order Detail
  'orderDetail.title': { tr: 'Sipariş Detayı', en: 'Order Detail' },
  'orderDetail.orderInfo': { tr: 'Sipariş Bilgileri', en: 'Order Information' },
  'orderDetail.paymentStatus': { tr: 'Ödeme Durumu', en: 'Payment Status' },
  'orderDetail.deliveryStatus': { tr: 'Teslimat Durumu', en: 'Delivery Status' },
  'orderDetail.playerInfo': { tr: 'Oyuncu Bilgileri', en: 'Player Information' },
  'orderDetail.deliveryCodes': { tr: 'Teslimat Kodları', en: 'Delivery Codes' },
  'orderDetail.deliveryPending': { tr: 'Teslimat Bekliyor', en: 'Delivery Pending' },
  'orderDetail.stockWaiting': { tr: 'Stok bekleniyor', en: 'Waiting for stock' },
  'orderDetail.backToOrders': { tr: 'Siparişlerime Dön', en: 'Back to Orders' },
  'orderDetail.customerInfo': { tr: 'Müşteri Bilgileri', en: 'Customer Information' },
  'orderDetail.paymentInfo': { tr: 'Ödeme Bilgileri', en: 'Payment Information' },

  // Support
  'support.title': { tr: 'Destek Taleplerim', en: 'My Support Tickets' },
  'support.newTicket': { tr: 'Yeni Talep Oluştur', en: 'Create New Ticket' },
  'support.noTickets': { tr: 'Henüz destek talebi yok', en: 'No support tickets yet' },
  'support.subject': { tr: 'Konu', en: 'Subject' },
  'support.category': { tr: 'Kategori', en: 'Category' },
  'support.message': { tr: 'Mesaj', en: 'Message' },
  'support.sendMessage': { tr: 'Mesaj Gönder', en: 'Send Message' },
  'support.waitingAdmin': { tr: 'Admin Yanıtı Bekleniyor', en: 'Waiting for Admin Reply' },
  'support.waitingUser': { tr: 'Yanıtınız Bekleniyor', en: 'Waiting for Your Reply' },
  'support.closed': { tr: 'Kapatıldı', en: 'Closed' },
  'support.categoryPayment': { tr: 'Ödeme', en: 'Payment' },
  'support.categoryDelivery': { tr: 'Teslimat', en: 'Delivery' },
  'support.categoryAccount': { tr: 'Hesap', en: 'Account' },
  'support.categoryOther': { tr: 'Diğer', en: 'Other' },
  'support.adminWaiting': { tr: 'Admin yanıtı bekleniyor. Şu anda mesaj gönderemezsiniz.', en: 'Waiting for admin reply. You cannot send a message at this time.' },
  'support.createTicket': { tr: 'Destek Talebi Oluştur', en: 'Create Support Ticket' },
  'support.ticketCreated': { tr: 'Destek talebi oluşturuldu', en: 'Support ticket created' },

  // Profile
  'profile.title': { tr: 'Profil Bilgilerim', en: 'My Profile' },
  'profile.firstName': { tr: 'Ad', en: 'First Name' },
  'profile.lastName': { tr: 'Soyad', en: 'Last Name' },
  'profile.email': { tr: 'E-posta', en: 'Email' },
  'profile.phone': { tr: 'Telefon', en: 'Phone' },
  'profile.updateSuccess': { tr: 'Profil güncellendi', en: 'Profile updated' },

  // Security
  'security.title': { tr: 'Güvenlik Ayarları', en: 'Security Settings' },
  'security.changePassword': { tr: 'Şifre Değiştir', en: 'Change Password' },
  'security.currentPassword': { tr: 'Mevcut Şifre', en: 'Current Password' },
  'security.newPassword': { tr: 'Yeni Şifre', en: 'New Password' },
  'security.confirmPassword': { tr: 'Yeni Şifre Tekrar', en: 'Confirm New Password' },
  'security.passwordChanged': { tr: 'Şifre başarıyla değiştirildi', en: 'Password changed successfully' },

  // Success/Failed pages
  'payment.success': { tr: 'Ödeme Başarılı!', en: 'Payment Successful!' },
  'payment.successDesc': { tr: 'Siparişiniz başarıyla oluşturuldu.', en: 'Your order has been created successfully.' },
  'payment.failed': { tr: 'Ödeme Başarısız', en: 'Payment Failed' },
  'payment.failedDesc': { tr: 'Ödeme işlemi tamamlanamadı.', en: 'Payment could not be completed.' },
  'payment.tryAgain': { tr: 'Tekrar Dene', en: 'Try Again' },
  'payment.viewOrders': { tr: 'Siparişlerimi Gör', en: 'View My Orders' },
  'payment.goHome': { tr: 'Ana Sayfaya Dön', en: 'Return to Home' },
  'payment.orderCreated': { tr: 'Siparişiniz oluşturuldu', en: 'Your order has been created' },
  'payment.codesLoading': { tr: 'Kodlarınız hesabınıza yükleniyor...', en: 'Your codes are being loaded to your account...' },

  // Reset Password
  'resetPassword.title': { tr: 'Şifremi Unuttum', en: 'Forgot Password' },
  'resetPassword.newPasswordTitle': { tr: 'Yeni Şifre Belirle', en: 'Set New Password' },
  'resetPassword.emailSent': { tr: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi', en: 'Password reset link has been sent to your email' },
  'resetPassword.sendLink': { tr: 'Sıfırlama Bağlantısı Gönder', en: 'Send Reset Link' },
  'resetPassword.resetPassword': { tr: 'Şifreyi Sıfırla', en: 'Reset Password' },
  'resetPassword.backToLogin': { tr: 'Giriş Sayfasına Dön', en: 'Back to Login' },

  // Hesaplar (Accounts for sale)
  'accounts.title': { tr: 'PUBG Hesap Satışı', en: 'PUBG Account Sales' },
  'accounts.buyNow': { tr: 'Satın Al', en: 'Buy Now' },
  'accounts.details': { tr: 'Detaylar', en: 'Details' },
  'accounts.level': { tr: 'Seviye', en: 'Level' },
  'accounts.rank': { tr: 'Rütbe', en: 'Rank' },
  'accounts.legendary': { tr: 'Efsanevi', en: 'Legendary' },
  'accounts.features': { tr: 'Özellikler', en: 'Features' },
  'accounts.sold': { tr: 'SATILDI', en: 'SOLD' },

  // Account menu (sidebar)
  'accountMenu.orders': { tr: 'Siparişlerim', en: 'My Orders' },
  'accountMenu.profile': { tr: 'Profil', en: 'Profile' },
  'accountMenu.security': { tr: 'Güvenlik', en: 'Security' },
  'accountMenu.support': { tr: 'Destek', en: 'Support' },
  'accountMenu.balance': { tr: 'Bakiye', en: 'Balance' },

  // Errors
  'error.ordersLoadFailed': { tr: 'Siparişler yüklenemedi', en: 'Failed to load orders' },
  'error.ticketsLoadFailed': { tr: 'Talepler yüklenemedi', en: 'Failed to load tickets' },
  'error.general': { tr: 'Bir hata oluştu', en: 'An error occurred' },
}

export default translations;
