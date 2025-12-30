# cPanel'e Admin Panel Sidebar Kurulum Rehberi

## 📁 Dosya Yapısı

Bu klasörde 3 dosya bulunmaktadır:

1. **AdminSidebar.js** - Basit sidebar (flat menü)
2. **AdminSidebarCollapsible.js** - Açılır/Kapanır (Collapsible) sidebar
3. **globals.css** - CSS animasyonları ve stiller

## 🚀 cPanel'de Kurulum Adımları

### Adım 1: cPanel File Manager'ı Açın

1. cPanel'e giriş yapın (pinly.com.tr/cpanel)
2. Sol menüden **File Manager**'a tıklayın
3. **epin-app** klasörüne gidin

### Adım 2: AdminSidebar.js Dosyasını Yükleyin

1. `epin-app/components/admin/` klasörüne gidin
   - Eğer `components/admin/` klasörü yoksa oluşturun:
     - **+ Folder** butonuna tıklayın
     - `components` yazın → Create
     - `components` içine girin
     - **+ Folder** → `admin` yazın → Create

2. `components/admin/` içindeyken:
   - **Upload** butonuna tıklayın
   - **AdminSidebarCollapsible.js** dosyasını seçin (açılır/kapanır menü için)
   - VEYA **AdminSidebar.js** dosyasını seçin (düz menü için)
   - Yüklendikten sonra dosyayı **AdminSidebar.js** olarak yeniden adlandırın

### Adım 3: globals.css Dosyasını Güncelleyin

1. `epin-app/app/` klasörüne gidin
2. `globals.css` dosyasını bulun
3. Dosyayı seçip **Edit** butonuna tıklayın
4. İndirdiğiniz `globals.css` içeriğini kopyalayıp yapıştırın
5. **Save Changes** butonuna tıklayın

### Adım 4: Uygulamayı Yeniden Başlatın

SSH erişiminiz varsa:
```bash
cd ~/epin-app
pm run build
pm2 restart epin-app
```

VEYA Softaculous üzerinden Node.js uygulamanızı restart edin.

## 📂 Dosya Konumları (cPanel'de)

```
/home/pin38domtr/epin-app/
├── app/
│   ├── globals.css           ← CSS dosyasını buraya koyun
│   └── admin/
│       ├── dashboard/
│       ├── orders/
│       └── ...
├── components/
│   ├── admin/
│   │   └── AdminSidebar.js   ← Sidebar dosyasını buraya koyun
│   └── ui/
└── ...
```

## 🎨 Menü Özelleştirme

### Yeni Menü Öğesi Eklemek

`AdminSidebar.js` dosyasında `menuGroups` dizisini bulun ve yeni öğe ekleyin:

```javascript
{
  href: '/admin/yeni-sayfa',
  icon: YeniIcon,
  label: 'Yeni Sayfa',
  color: 'text-blue-400' // İsteğe bağlı renk
}
```

### Yeni Grup Eklemek

```javascript
{
  id: 'yeni-grup',
  title: 'Yeni Grup',
  icon: FolderIcon,
  iconColor: 'text-green-500',
  items: [
    { href: '/admin/alt-sayfa', icon: Icon, label: 'Alt Sayfa' },
  ]
}
```

## ⚠️ Önemli Notlar

1. **Lucide-React** kütüphanesinin yüklü olduğundan emin olun
2. **@/components/ui/button** dosyasının mevcut olduğundan emin olun
3. Değişikliklerden sonra uygulamayı yeniden başlatmayı unutmayın

## 🆘 Sorun Giderme

### "Module not found" hatası
- `npm install lucide-react` komutunu çalıştırın

### Sidebar görünmüyorsa
- Admin layout dosyasında `<AdminSidebar />` bileşeninin import edildiğinden emin olun

### Stiller uygulanmıyorsa
- `globals.css` dosyasının doğru konumda olduğundan emin olun
- Tailwind CSS'in yapılandırıldığından emin olun
