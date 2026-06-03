# 📥 DOSYA İNDİRME TALİMATLARI

## Yöntem 1: Emergent Platform Üzerinden İndirme (ÖNERİLEN)

### Chat Arayüzü Üzerinden:
1. Chat penceresinin **sağ üst köşesinde** veya **üst menüde** şu butonlardan birini arayın:
   - 📁 **"Download Files"** 
   - 💾 **"Download Workspace"**
   - ⬇️ **"Export Project"**
   - 🗂️ **"Files"** veya **"Assets"**

2. Eğer bulamıyorsanız:
   - Sohbet penceresinin **yan menüsüne** bakın
   - **"···" (üç nokta)** menüsüne tıklayın
   - **"Settings"** veya **"Project Settings"** bölümüne gidin

3. Alternatif: **"Save to GitHub"** özelliğini kullanarak projeyi GitHub'a aktarabilir, oradan zip indirebilirsiniz.

---

## Yöntem 2: Doğrudan Dosya Erişimi

Eğer platform'da **Terminal** veya **File Browser** erişiminiz varsa:

### Dosya Konumu:
```
/app/pinly-app.zip
```

**Dosya Boyutu:** 13 MB

---

## Yöntem 3: Manuel Paket Oluşturma

Eğer yukarıdaki yöntemler işe yaramazsa, projenin kaynak kodlarına erişiminiz varsa:

1. Workspace'teki tüm dosyaları indirin
2. Kendi bilgisayarınızda zip oluşturun

**Önemli Dosyalar:**
- `app/` klasörü (tüm Next.js kodu)
- `lib/` klasörü (Shopier V2 kütüphaneleri)
- `components/` klasörü
- `public/` klasörü
- `package.json`
- `next.config.js`
- `server.js` ⭐ (yeni oluşturuldu)
- `.env.example` ⭐ (yeni oluşturuldu)
- `CPANEL_DEPLOYMENT_GUIDE.md` ⭐ (yeni oluşturuldu)
- `HIZLI_KURULUM.md` ⭐ (yeni oluşturuldu)
- `README.md` ⭐ (güncellendi)

**HARİÇ bırakılacak klasörler:**
- `node_modules/`
- `.next/`
- `.git/`
- `.emergent/`
- `memory/`

---

## Yöntem 4: GitHub'a Kaydetme (TAVSİYE EDİLEN)

Emergent platformunun **"Save to GitHub"** özelliğini kullanın:

1. Chat arayüzünde **"Save to GitHub"** butonunu bulun
2. GitHub hesabınıza bağlayın
3. Proje otomatik push edilir
4. GitHub'dan ZIP indirebilirsiniz: **Code → Download ZIP**

---

## 🆘 Hala Erişemiyorsanız

Lütfen aşağıdaki bilgileri kontrol edin:

1. **Platform arayüzünde şu butonları arayın:**
   - Download, Export, Save, Files, Assets
   
2. **Destek ekibine sorun:**
   - "Workspace'imdeki dosyaları nasıl indirebilirim?"
   - "pinly-app.zip dosyasına nasıl erişirim?"

3. **Alternatif çözüm:**
   - GitHub'a save edin ve oradan indirin
   - Veya Files bölümünden dosya dosya indirin

---

## ✅ İndirdikten Sonra

1. `pinly-app.zip` dosyasını bilgisayarınıza indirin
2. ZIP'i extract edin
3. `HIZLI_KURULUM.md` dosyasını açın
4. Adım adım talimatları takip edin
5. cPanel'e yükleyin

**Kurulum süresi:** 15-25 dakika

---

## 📞 Acil Destek

Eğer indirme konusunda sorun yaşamaya devam ediyorsanız:

1. Emergent platform desteğine mesaj atın
2. Veya bana şunu söyleyin: "Dosyaları tek tek indirmek istiyorum"
   - Size hangi dosyaların gerekli olduğunu listeleyeyim

---

**Not:** Bu bir bulut geliştirme ortamıdır (Kubernetes container). Dosyalar container içinde `/app/pinly-app.zip` konumunda hazır bekliyor.
