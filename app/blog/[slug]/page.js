'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Calendar, 
  Eye, 
  ArrowLeft,
  Home,
  User,
  Tag,
  Share2,
  Clock
} from 'lucide-react'

const CATEGORIES = {
  'genel': { label: 'Genel', color: 'bg-blue-600' },
  'guncelleme': { label: 'PUBG Güncelleme', color: 'bg-green-600' },
  'etkinlik': { label: 'Etkinlik', color: 'bg-purple-600' },
  'duyuru': { label: 'Duyuru', color: 'bg-red-600' },
  'rehber': { label: 'Rehber', color: 'bg-yellow-600' }
}

export default function BlogPostPage() {
  const params = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (params.slug) {
      fetchPost()
    }
  }, [params.slug])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/blog/${params.slug}`)
      const data = await response.json()
      
      if (data.success) {
        setPost(data.data)
      } else {
        setError(data.error || 'Yazı bulunamadı')
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      setError('Bir hata oluştu')
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

  const calculateReadTime = (content) => {
    const text = content.replace(/<[^>]*>/g, '')
    const words = text.split(/\s+/).length
    const minutes = Math.ceil(words / 200)
    return `${minutes} dk okuma`
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link kopyalandı!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Yazı Bulunamadı</h1>
          <p className="text-slate-400 mb-6">{error || 'Bu sayfa mevcut değil.'}</p>
          <Link href="/blog">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Blog'a Dön
            </Button>
          </Link>
        </div>
      </div>
    )
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
              <Link href="/blog" className="text-slate-400 hover:text-white transition-colors">
                Blog
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-slate-500 hover:text-white">Ana Sayfa</Link>
            <span className="text-slate-600">/</span>
            <Link href="/blog" className="text-slate-500 hover:text-white">Blog</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 truncate max-w-xs">{post.title}</span>
          </div>
        </div>
      </div>

      {/* Article */}
      <article className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Cover Image */}
          {post.coverImage && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8">
              <img 
                src={post.coverImage} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Badge className={CATEGORIES[post.category]?.color || 'bg-blue-600'}>
              {CATEGORIES[post.category]?.label || post.category}
            </Badge>
            
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Calendar className="w-4 h-4" />
              {formatDate(post.publishedAt)}
            </div>
            
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Eye className="w-4 h-4" />
              {post.views || 0} görüntülenme
            </div>
            
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Clock className="w-4 h-4" />
              {calculateReadTime(post.content)}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Author & Share */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{post.authorName || 'Admin'}</p>
                <p className="text-slate-500 text-sm">Yazar</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Paylaş
            </Button>
          </div>

          {/* Content */}
          <div 
            className="prose prose-invert prose-lg max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-p:text-slate-300 prose-p:leading-relaxed
              prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-white
              prose-ul:text-slate-300 prose-ol:text-slate-300
              prose-li:marker:text-purple-500
              prose-blockquote:border-purple-500 prose-blockquote:bg-slate-800/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded
              prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-purple-400
              prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700
              prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="mt-12 pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-slate-500" />
                {post.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-sm hover:bg-slate-700 transition-colors cursor-pointer">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="mt-12 pt-6 border-t border-slate-800">
            <Link href="/blog">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tüm Yazılar
              </Button>
            </Link>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500">
          <p>&copy; {new Date().getFullYear()} PINLY. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}
