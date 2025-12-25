'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, User, Check, X, Loader2, Info, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
    <div className="min-h-screen bg-black">
      <Toaster position="top-center" richColors />
      
      {/* Header - Minimal like Plyr */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center font-black text-xs text-white">
              UC
            </div>
            <span className="text-white font-semibold text-lg">PUBG UC</span>
          </div>
            
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/60 hover:text-white hover:bg-white/5 w-9 h-9"
              onClick={() => window.location.href = '/admin/login'}
            >
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero - PUBG Gaming Background */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden pt-16">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/5380620/pexels-photo-5380620.jpeg?auto=compress&cs=tinysrgb&w=1920)',
            backgroundColor: '#0a0a0a'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            PUBG MOBILE UC
          </h1>
          <p className="text-lg md:text-xl text-white/70 font-medium">Anında teslimat • Güvenli ödeme</p>
        </div>
      </div>

      {/* Products Section - Plyr Style Grid */}
      <main className="max-w-[1400px] mx-auto px-6 py-16">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className="group relative bg-zinc-950 rounded-lg border border-white/5 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden"
              >
                {/* Discount Badge */}
                {product.discountPercent > 0 && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
                    -{product.discountPercent}%
                  </div>
                )}

                {/* UC Coin Image */}
                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1645690364326-1f80098eca66?w=300&h=300&fit=crop"
                    alt="UC Coin"
                    className="w-24 h-24 object-contain opacity-80 group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  {/* UC Amount - Most Prominent */}
                  <div className="text-3xl font-black text-white tracking-tight">
                    {product.ucAmount}
                    <span className="text-lg text-white/40 ml-1 font-normal">UC</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    {product.discountPrice < product.price && (
                      <span className="text-sm text-white/30 line-through font-medium">
                        ₺{product.price.toFixed(0)}
                      </span>
                    )}
                    <span className="text-xl font-bold text-white">
                      ₺{product.discountPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Buy Button */}
                  <button 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded text-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProductSelect(product)
                    }}
                  >
                    Satın Al
                  </button>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="absolute inset-0 bg-blue-500/5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Siparişi Tamamla</DialogTitle>
            <DialogDescription className="text-white/50">
              Oyuncu bilgilerinizi girin
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left: Player Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="playerId" className="text-white/70 mb-2 block text-sm">
                  Oyuncu ID
                </Label>
                <div className="relative">
                  <Input
                    id="playerId"
                    placeholder="Oyuncu ID'nizi girin"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    className="bg-zinc-900 border-white/10 text-white placeholder:text-white/30 pr-10 focus:border-blue-500"
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
                <div className="p-4 rounded bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-400 mb-1 text-sm">
                    <Check className="w-4 h-4" />
                    <span className="font-semibold">Oyuncu Bulundu</span>
                  </div>
                  <p className="text-white font-bold">{playerName}</p>
                </div>
              )}
            </div>

            {/* Right: Order Summary */}
            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-4 rounded bg-zinc-900 border border-white/10">
                  <h3 className="font-semibold mb-3 text-white text-sm">Sipariş Özeti</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Ürün</span>
                      <span className="text-white font-semibold">{selectedProduct.title}</span>
                    </div>
                    {selectedProduct.discountPrice < selectedProduct.price && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Liste Fiyatı</span>
                          <span className="text-white/30 line-through">{selectedProduct.price.toFixed(2)} ₺</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">İndirim</span>
                          <span className="text-green-400">-{(selectedProduct.price - selectedProduct.discountPrice).toFixed(2)} ₺</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-white">Toplam</span>
                        <span className="font-black text-2xl text-white">
                          {selectedProduct.discountPrice.toFixed(2)} ₺
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-white/40 p-3 rounded bg-blue-500/5 border border-blue-500/10">
                  <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    UC'ler ödeme onayından sonra 5-10 dakika içinde hesabınıza yüklenecektir.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              İptal
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={!playerValid || orderProcessing}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black mt-32">
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <div className="text-center text-white/30 text-sm">
            <p>© 2024 PUBG UC Store. Tüm hakları saklıdır.</p>
            <p className="mt-2 text-xs text-white/20">
              Bu site PUBG Mobile ile resmi bir bağlantısı yoktur.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}