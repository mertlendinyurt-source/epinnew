'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Calendar, 
  Eye, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Home,
  Tag
} from 'lucide-react'

const CATEGORIES = {
  'genel': { label: 'Genel', color: 'bg-blue-600' },
  'guncelleme': { label: 'PUBG Güncelleme', color: 'bg-green-600' },
  'etkinlik': { label: 'Etkinlik', color: 'bg-purple-600' },
  'duyuru': { label: 'Duyuru', color: 'bg-red-600' },
  'rehber': { label: 'Rehber', color: 'bg-yellow-600' }
}

export default function BlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [category, setCategory] = useState('')

  useEffect(() => {
    fetchPosts()
  }, [page, category])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '9'
      })
      if (category) params.append('category', category)

      const response = await fetch(`/api/blog?${params}`)
      const data = await response.json()
      if (data.success) {
        setPosts(data.data)
        setTotalPages(data.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                PINLY
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                Ana Sayfa
              </Link>
              <Link href="/blog" className="text-white font-medium">
                Blog
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 border-b border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm">Blog & Haberler</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            PUBG Haberleri & Güncellemeler
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            En son PUBG güncellemeleri, etkinlikler ve rehberler hakkında bilgi edinin
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 border-b border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <Button
              variant={category === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCategory(''); setPage(1); }}
              className={category === '' ? 'bg-blue-600' : ''}
            >
              Tümü
            </Button>
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <Button
                key={key}
                variant={category === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setCategory(key); setPage(1); }}
                className={category === key ? val.color : ''}
              >
                {val.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Henüz yazı yok</h3>
              <p className="text-slate-400">Bu kategoride henüz yazı bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link href={`/blog/${post.slug}`} key={post.id}>
                  <Card className="bg-slate-900/50 border-slate-800 hover:border-purple-500/50 transition-all duration-300 overflow-hidden group h-full">
                    {/* Cover Image */}
                    <div className="aspect-video bg-slate-800 relative overflow-hidden">
                      {post.coverImage ? (
                        <img 
                          src={post.coverImage} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-12 h-12 text-slate-700" />
                        </div>
                      )}
                      <Badge className={`absolute top-3 left-3 ${CATEGORIES[post.category]?.color || 'bg-blue-600'}`}>
                        {CATEGORIES[post.category]?.label || post.category}
                      </Badge>
                    </div>
                    
                    <CardContent className="p-5">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(post.publishedAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {post.views || 0}
                        </div>
                      </div>
                      
                      {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Önceki
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(p)}
                    className={page === p ? 'bg-purple-600' : ''}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Sonraki
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} PINLY. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}
