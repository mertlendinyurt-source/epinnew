import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

// --- AYARLAR ---
// ÖNEMLİ: Yönlendirme hatasını çözmek için buraya gerçek domaini yazdık.
const BASE_URL = 'https://pinly.com.tr';
const RISK_THRESHOLD = 50;

// --- YARDIMCI FONKSİYONLAR ---

// 1. HTML Redirect Fonksiyonu (Kullanıcıyı doğru siteye zorlar)
function htmlRedirect(path) {
  // Gelen path '/payment/...' şeklinde başlar, önüne ana domaini ekleriz.
  const fullUrl = `${BASE_URL}${path}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Yönlendiriliyor...</title>
        <meta http-equiv="refresh" content="0;url=${fullUrl}">
        <script>
          // JavaScript ile kesin yönlendirme
          window.location.href = "${fullUrl}";
        </script>
      </head>
      <body style="background:#12151a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <div style="font-size:40px;margin-bottom:20px;">⏳</div>
          <p>İşlem tamamlandı, Pinly.com.tr'ye yönlendiriliyorsunuz...</p>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// 2. Risk Hesaplama Fonksiyonu
async function calculateOrderRisk(db, order, user) {
  let score = 0;
  const reasons = [];

  if (!user) {
    return { score: 0, status: 'CLEAR', reasons: ['Kullanıcı bulunamadı'], calculatedAt: new Date() };
  }

  // Hesap yaşı kontrolü
  const accountAgeMs = new Date() - new Date(user.createdAt);
  const accountAgeHours = accountAgeMs / (1000 * 60 * 60);
  if (accountAgeHours < 1) {
    score += 25;
    reasons.push('Yeni hesap (1 saatten az)');
  } else if (accountAgeHours < 24) {
    score += 10;
    reasons.push('Hesap 24 saatten yeni');
  }

  // İlk sipariş kontrolü
  const previousOrders = await db.collection('orders').countDocuments({
    userId: user.id,
    status: { $in: ['paid', 'completed'] }
  });
  if (previousOrders === 0) {
    score += 10;
    reasons.push('İlk sipariş');
  }

  // Tutar kontrolü
  if (order.amount > 500) {
    score += 15;
    reasons.push('Yüksek değerli sipariş (' + order.amount + ' TRY)');
  } else if (order.amount > 250) {
    score += 5;
    reasons.push('Orta-yüksek değerli sipariş');
  }

  // Google telefon kontrolü
  if ((user.authMethod === 'google' || user.googleId) && !user.phone) {
    score += 5;
    reasons.push('Google ile giriş, telefon eksik');
  }

  const status = score >= RISK_THRESHOLD ? 'FLAGGED' : 'CLEAR';

  return {
    score: Math.min(score, 100),
    status,
    reasons,
    calculatedAt: new Date()
  };
}

// --- ANA HANDLER ---

async function handleCallback(request) {
  let client;

  try {
    // 1. ADIM: VERİYİ OKUMA (GÜÇLENDİRİLMİŞ)
    let body = {};

    try {
      // Önce FormData olarak okumayı dene (En sağlıklısı)
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
    } catch (err) {
      // FormData çalışmazsa Text/JSON dene
      try {
        const text = await request.text();
        if (text.includes('=')) {
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) body[key] = value;
        } else if (text) {
          body = JSON.parse(text);
        }
      } catch (e) {
        console.error('Body parse failed:', e);
      }
    }

    // Hala body boşsa URL parametrelerine bak (Fallback)
    if (!body.platform_order_id) {
        const { searchParams } = new URL(request.url);
        if (searchParams.get('platform_order_id')) {
            searchParams.forEach((val, key) => body[key] = val);
        }
    }

    console.log('Shopier Callback Data:', JSON.stringify(body));

    // Shopier parametreleri
    const { status, payment_id, platform_order_id, installment } = body;
    const orderId = platform_order_id;

    // ID Kontrolü
    if (!orderId) {
      console.error('HATA: Order ID bulunamadı. Gelen veri:', body);
      return htmlRedirect('/payment/failed?reason=no_order_id');
    }

    // 2. ADIM: VERİTABANI BAĞLANTISI
    client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pinly_store');

    // Siparişi bul
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) {
      await client.close();
      return htmlRedirect('/payment/failed?reason=order_not_found');
    }

    // Zaten ödenmiş mi?
    if (order.status === 'paid') {
      await client.close();
      return htmlRedirect('/payment/success?orderId=' + orderId);
    }

    // 3. ADIM: DURUM BELİRLEME
    // Shopier bazen "success", bazen "1" döndürebilir.
    const statusStr = String(status).toLowerCase();
    const isSuccess = statusStr === 'success' || statusStr === '1';
    const newStatus = isSuccess ? 'paid' : 'failed';

    if (newStatus === 'failed') {
       // Başarısız ise güncelle ve çık
       await db.collection('orders').updateOne(
         { id: orderId },
         { $set: { status: 'failed', updatedAt: new Date() } }
       );
       await client.close();
       return htmlRedirect('/payment/failed?orderId=' + orderId);
    }

    // 4. ADIM: BAŞARILI ÖDEME İŞLEMLERİ
    // Sipariş durumunu güncelle
    await db.collection('orders').updateOne(
      { id: orderId },
      { $set: { status: 'paid', updatedAt: new Date() } }
    );

    // Ödeme kaydını oluştur
    await db.collection('payments').insertOne({
      id: uuidv4(),
      orderId: orderId,
      provider: 'shopier',
      providerTxnId: payment_id?.toString() || uuidv4(),
      status: 'paid',
      amount: order.amount,
      currency: 'TRY',
      installment: parseInt(installment) || 0,
      createdAt: new Date()
    });

    // Risk Analizi ve Stok Düşümü
    try {
        const orderUser = await db.collection('users').findOne({ id: order.userId });
        const riskResult = await calculateOrderRisk(db, order, orderUser);

        console.log('Risk Score:', riskResult.score);

        // Riski kaydet
        await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { risk: riskResult } }
        );

        if (riskResult.status === 'FLAGGED') {
            // RİSKLİ SİPARİŞ: Beklemeye al
            await db.collection('orders').updateOne(
            { id: orderId },
            { $set: { delivery: { status: 'hold', message: 'Güvenlik kontrolü', holdReason: 'risk_flagged', items: [] } } }
            );
        } else {
            // TEMİZ SİPARİŞ: Stok ver
            const stock = await db.collection('stock').findOne({
                productId: order.productId,
                status: 'available'
            });

            if (stock && stock.value) {
                // Stok satıldı olarak işaretle
                await db.collection('stock').updateOne(
                    { id: stock.id },
                    { $set: { status: 'sold', orderId: orderId, soldAt: new Date() } }
                );

                // Siparişe ürünü ekle ve teslim edildi yap
                await db.collection('orders').updateOne(
                    { id: orderId },
                    { $set: { delivery: { status: 'delivered', items: [stock.value], assignedAt: new Date() } } }
                );
            } else {
                // Stok yoksa pending yap
                await db.collection('orders').updateOne(
                    { id: orderId },
                    { $set: { delivery: { status: 'pending', message: 'Stok bekleniyor', items: [] } } }
                );
            }
        }
    } catch (riskErr) {
        console.error("Risk/Stok işlem hatası:", riskErr);
        // Ödeme başarılı olduğu için akışı bozmuyoruz, sadece logluyoruz.
    }

    await client.close();

    // Başarı sayfasına yönlendir
    return htmlRedirect('/payment/success?orderId=' + orderId);

  } catch (error) {
    console.error('Genel Callback Hatası:', error);
    if (client) await client.close();
    return htmlRedirect('/payment/failed?reason=server_error');
  }
}

// Next.js Route Handler Tanımları
export async function POST(request) {
  return handleCallback(request);
}

export async function GET(request) {
  return handleCallback(request);
}
