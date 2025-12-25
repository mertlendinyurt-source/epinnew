'use client'

import { useState, useEffect } from 'react'
import { User, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerValid, setPlayerValid] = useState(null)
  const [orderProcessing, setOrderProcessing] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Ürünler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setCheckoutOpen(true)
    setPlayerId('')
    setPlayerName('')
    setPlayerValid(null)
  }

  const resolvePlayerName = async (id) => {
    if (!id || id.length < 6) {
      setPlayerValid(false)
      setPlayerName('')
      return
    }

    setPlayerLoading(true)
    try {
      const response = await fetch(`/api/player/resolve?id=${id}`)
      const data = await response.json()
      
      if (data.success) {
        setPlayerName(data.data.playerName)
        setPlayerValid(true)
        toast.success('Oyuncu bulundu!')
      } else {
        setPlayerName('')
        setPlayerValid(false)
        toast.error(data.error || 'Oyuncu bulunamadı')
      }
    } catch (error) {
      console.error('Error resolving player:', error)
      setPlayerName('')
      setPlayerValid(false)
      toast.error('Oyuncu adı alınırken hata oluştu')
    } finally {
      setPlayerLoading(false)
    }
  }

  useEffect(() => {
    if (playerId) {
      const timer = setTimeout(() => {
        resolvePlayerName(playerId)
      }, 600)
      return () => clearTimeout(timer)
    } else {
      setPlayerName('')
      setPlayerValid(null)
    }
  }, [playerId])

  const handleCheckout = async () => {
    if (!playerValid || !playerName) {
      toast.error('Lütfen geçerli bir Oyuncu ID girin')
      return
    }

    setOrderProcessing(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          playerId,
          playerName
        })
      })

      const data = await response.json()
      
      if (data.success) {
        window.location.href = data.data.paymentUrl
      } else {
        toast.error(data.error || 'Sipariş oluşturulamadı')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Sipariş oluşturulurken hata oluştu')
    } finally {
      setOrderProcessing(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1d23' }}>
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#12151a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-black text-xs text-white">
              UC
            </div>
            <span className="text-white font-semibold text-lg">PUBG UC</span>
          </div>
            
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/60 hover:text-white hover:bg-white/10 w-9 h-9"
              onClick={() => window.location.href = '/admin/login'}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero - Larger like reference */}
      <div className="relative h-[45vh] flex flex-col justify-center overflow-hidden" style={{ backgroundColor: '#0f1217' }}>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/5380620/pexels-photo-5380620.jpeg?auto=compress&cs=tinysrgb&w=1920)'
          }}
        />
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to bottom, rgba(15,18,23,0.6), rgba(15,18,23,0.9))'
          }} 
        />
        
        <div className="relative z-10 px-6 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center font-black text-2xl text-white">
              P
            </div>
            <div>
              <div className="text-xs text-white/50 mb-1">Anasayfa &gt; Oyunlar</div>
              <h1 className="text-3xl font-bold text-white">PUBG Mobile</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className="text-yellow-400">★★★★★ 5 / 5</span>
            <span>(2008) yorum</span>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Filter */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-24 rounded-lg p-4" style={{ backgroundColor: '#1e2229', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                </svg>
                <span className="font-semibold text-sm uppercase tracking-wide">Filtrele</span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-white text-sm font-semibold mb-3">Bölge</h3>
                  <div className="mb-2">
                    <input 
                      type="text" 
                      placeholder="Ara"
                      className="w-full px-3 py-1.5 text-sm bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <label className="flex items-center gap-2 text-sm text-white/80 hover:text-white cursor-pointer">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-lg">🇹🇷</span>
                      <span>Türkiye</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white/80 hover:text-white cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-lg">🌍</span>
                      <span>Küresel</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white/80 hover:text-white cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-lg">🇩🇪</span>
                      <span>Almanya</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white/80 hover:text-white cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-lg">🇫🇷</span>
                      <span>Fransa</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-white text-sm font-semibold mb-3">Fiyat Aralığı</h3>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="En Az"
                      className="w-full px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                    />
                    <input 
                      type="number" 
                      placeholder="En Çok"
                      className="w-full px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  Filtreleri Uygula
                </Button>
              </div>
            </div>
          </div>

          {/* Right Content - Products */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="group relative rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/50"
                    style={{ 
                      backgroundColor: '#25282e',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    {/* Discount Badge */}
                    {product.discountPercent > 0 && (
                      <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
                        -{product.discountPercent}%
                      </div>
                    )}

                    {/* UC Coin Image */}
                    <div className="relative h-40 overflow-hidden flex items-center justify-center bg-gradient-to-br from-zinc-900/50 to-zinc-950/50">
                      <img 
                        src="https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=200&h=200&fit=crop"
                        alt="UC"
                        className="w-24 h-24 object-contain opacity-80 group-hover:scale-110 transition-transform"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      {/* Label */}
                      <div className="text-[11px] text-white/40 font-medium uppercase tracking-wide">MOBILE</div>
                      
                      {/* UC Amount */}
                      <div className="text-xl font-bold text-white">
                        {product.ucAmount} UC
                      </div>

                      {/* Region */}
                      <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                        <span>🇹🇷 TÜRKİYE</span>
                      </div>
                      
                      <div className="text-xs text-green-400">Bölgenizde kullanılabilir</div>

                      {/* Prices */}
                      <div className="pt-2">
                        {product.discountPrice < product.price && (
                          <div className="text-sm text-white/40 line-through">
                            ₺ {product.price.toFixed(2)}
                          </div>
                        )}
                        <div className="text-2xl font-bold text-white">
                          ₺ {product.discountPrice.toFixed(2)}
                        </div>
                        {product.discountPercent > 0 && (
                          <div className="text-xs text-green-400 mt-1">
                            {product.discountPercent}% indirim
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Checkout Dialog - Plyr style */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden" style={{ backgroundColor: '#1F232A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DialogHeader className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <DialogTitle className="text-lg font-bold text-white uppercase tracking-wide">ÖDEME TÜRÜNÜ SEÇİN</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/5">
            {/* Left: Player Info & Payment Methods */}
            <div className="p-5 space-y-5">
              <div>
                <Label className="text-xs text-white/60 mb-2 block uppercase tracking-wide">Oyuncu ID</Label>
                <div className="relative">
                  <Input
                    placeholder="Oyuncu ID Girin"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    className="h-10 px-3 text-sm text-white placeholder:text-white/30 border-white/10 focus:border-blue-500"
                    style={{ backgroundColor: '#12161D' }}
                  />
                  {playerLoading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
                  )}
                  {!playerLoading && playerValid === true && (
                    <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                  {!playerLoading && playerValid === false && (
                    <X className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              {playerName && (
                <div className="px-3 py-2.5 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div className="flex items-center gap-1.5 text-green-400 mb-0.5 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Oyuncu Bulundu</span>
                  </div>
                  <p className="text-white text-sm font-bold">{playerName}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-white/60 mb-3 block uppercase tracking-wide">Ödeme yöntemleri</Label>
                <div className="space-y-2.5">
                  <div className="px-4 py-3 rounded flex items-center justify-between cursor-pointer" style={{ backgroundColor: '#12161D', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#1F232A' }}>
                        💳
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Kredi / Banka Kartı</div>
                        <div className="text-xs text-white/50">Anında teslimat</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            {selectedProduct && (
              <div className="p-5 space-y-4">
                <div>
                  <Label className="text-xs text-white/60 mb-3 block uppercase tracking-wide">Ürün</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded flex items-center justify-center" style={{ backgroundColor: '#12161D' }}>
                      <img 
                        src="https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=100&h=100&fit=crop"
                        alt="UC"
                        className="w-8 h-8 object-contain opacity-70"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{selectedProduct.title}</div>
                      <div className="text-xs text-white/50 flex items-center gap-1.5">
                        🇹🇷 TÜRKİYE
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-white/60 mb-2 block uppercase tracking-wide">Fiyat detayları</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Orjinal Fiyat</span>
                      <span className="text-white/80">₺ {selectedProduct.price.toFixed(2)}</span>
                    </div>
                    {selectedProduct.discountPrice < selectedProduct.price && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400 font-semibold">Size Özel Fiyat</span>
                        <span className="text-green-400 font-semibold">₺ {selectedProduct.discountPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-sm text-white/60 uppercase tracking-wide">Ödenecek Tutar</span>
                    <span className="text-2xl font-black text-green-400">
                      ₺ {selectedProduct.discountPrice.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={!playerValid || orderProcessing}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wide"
                  >
                    {orderProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        İşleniyor...
                      </>
                    ) : (
                      'Ödemeye Git'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-20 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', backgroundColor: '#0d1015' }}>
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="text-center text-white/30 text-xs leading-relaxed">
            <p>© 2024 PUBG UC Store. Tüm hakları saklıdır.</p>
            <p className="mt-1 text-white/20 text-[11px]">
              Bu site PUBG Mobile ile resmi bir bağlantısı yoktur.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
