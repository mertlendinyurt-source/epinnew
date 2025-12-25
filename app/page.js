'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Search, User, Check, X, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
        // Redirect to mock payment page
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-900/20 bg-slate-950/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-bold text-white">
                UC
              </div>
              <span className="text-xl font-bold text-white">PUBG UC Store</span>
            </div>
            
            <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input 
                  placeholder="Ürün ara..."
                  className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                <ShoppingCart className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-slate-800"
                onClick={() => window.location.href = '/admin/login'}
              >
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            En Ucuz <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">PUBG Mobile UC</span>
          </h1>
          <p className="text-slate-400 text-lg">Anında teslimat, güvenli ödeme</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-600/40 px-4 py-2">
              🇹🇷 Türkiye
            </Badge>
            <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700 px-4 py-2">
              Tüm Paketler
            </Badge>
          </div>
          <div className="text-sm text-slate-400">
            {products.length} ürün bulundu
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="bg-slate-900/50 border-slate-800 hover:border-blue-600/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => handleProductSelect(product)}
              >
                <div className="relative overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.discountPercent > 0 && (
                    <Badge className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white">
                      {product.discountPercent}% İndirim
                    </Badge>
                  )}
                </div>
                
                <CardHeader>
                  <CardTitle className="text-white text-2xl">{product.title}</CardTitle>
                  <CardDescription className="text-slate-400">
                    PUBG Mobile Unknown Cash
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {product.discountPrice < product.price && (
                        <span className="text-slate-500 line-through text-lg">
                          {product.price.toFixed(2)} ₺
                        </span>
                      )}
                      <span className="text-3xl font-bold text-blue-400">
                        {product.discountPrice.toFixed(2)} ₺
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <Check className="w-4 h-4" />
                      <span>Bölgenizde kullanılabilir</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProductSelect(product)
                    }}
                  >
                    Satın Al
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Siparişi Tamamla</DialogTitle>
            <DialogDescription className="text-slate-400">
              Oyuncu bilgilerinizi girin ve ödemeye geçin
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left: Player Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="playerId" className="text-white mb-2 block">
                  Oyuncu ID
                </Label>
                <div className="relative">
                  <Input
                    id="playerId"
                    placeholder="Oyuncu ID'nizi girin"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white pr-10"
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
                <p className="text-xs text-slate-400 mt-1">
                  Oyuncu ID'nizi PUBG Mobile oyununuzdan bulabilirsiniz
                </p>
              </div>

              {playerName && (
                <div className="p-4 rounded-lg bg-green-900/20 border border-green-800">
                  <div className="flex items-center gap-2 text-green-400 mb-1">
                    <Check className="w-4 h-4" />
                    <span className="font-semibold">Oyuncu Bulundu</span>
                  </div>
                  <p className="text-white font-bold text-lg">{playerName}</p>
                </div>
              )}
            </div>

            {/* Right: Order Summary */}
            {selectedProduct && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                  <h3 className="font-semibold mb-3 text-white">Sipariş Özeti</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Ürün</span>
                      <span className="text-white font-medium">{selectedProduct.title}</span>
                    </div>
                    {selectedProduct.discountPrice < selectedProduct.price && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Liste Fiyatı</span>
                          <span className="text-slate-500 line-through">{selectedProduct.price.toFixed(2)} ₺</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">İndirim</span>
                          <span className="text-green-400">-{(selectedProduct.price - selectedProduct.discountPrice).toFixed(2)} ₺</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-slate-700 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-white">Toplam</span>
                        <span className="font-bold text-2xl text-blue-400">
                          {selectedProduct.discountPrice.toFixed(2)} ₺
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-400 p-3 rounded-lg bg-blue-900/20 border border-blue-800">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    UC'ler ödeme onaylandıktan sonra 5-10 dakika içinde hesabınıza yüklenecektir.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutOpen(false)}
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              İptal
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={!playerValid || orderProcessing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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
      <footer className="border-t border-slate-800 bg-slate-950 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-slate-400 text-sm">
            <p>© 2024 PUBG UC Store. Tüm hakları saklıdır.</p>
            <p className="mt-2 text-xs text-slate-500">
              Bu site PUBG Mobile ile resmi bir bağlantısı yoktur.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}