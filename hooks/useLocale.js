'use client'

import { useState, useEffect, useCallback } from 'react'
import translations from '@/lib/translations'

// GeoIP-based locale detection hook
// Turkey -> tr (TRY), International -> en (USD)
export default function useLocale() {
  const [locale, setLocale] = useState('tr') // default Turkish
  const [currency, setCurrency] = useState('TRY')
  const [countryCode, setCountryCode] = useState('TR')
  const [geoLoaded, setGeoLoaded] = useState(false)

  useEffect(() => {
    detectLocale()
  }, [])

  const detectLocale = async () => {
    try {
      // Always call GeoIP fresh - no long cache (IP can change with VPN etc.)
      const response = await fetch('/api/geo')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const cc = data.data.countryCode || 'TR'
          applyLocale(cc)
        }
      }
    } catch (error) {
      console.error('GeoIP detection error:', error)
      // Default to Turkish on error
      applyLocale('TR')
    } finally {
      setGeoLoaded(true)
    }
  }

  const applyLocale = (cc) => {
    setCountryCode(cc)
    if (cc === 'TR') {
      setLocale('tr')
      setCurrency('TRY')
    } else {
      setLocale('en')
      setCurrency('USD')
    }
  }

  // Translation function
  const t = useCallback((key, fallback) => {
    const entry = translations[key]
    if (!entry) return fallback || key
    return entry[locale] || entry['tr'] || fallback || key
  }, [locale])

  // Price formatting function
  // For TRY: ₺19,99  |  For USD: $0.55
  const formatPrice = useCallback((priceTRY, priceUSD) => {
    if (currency === 'USD' && priceUSD !== undefined && priceUSD !== null && priceUSD > 0) {
      return `$${priceUSD.toFixed(2)}`
    }
    if (currency === 'TRY' || !priceUSD || priceUSD <= 0) {
      return `₺${(priceTRY || 0).toFixed(2).replace('.', ',')}`
    }
    return `$${(priceUSD || 0).toFixed(2)}`
  }, [currency])

  // Get the appropriate price value based on locale
  const getPrice = useCallback((product) => {
    if (!product) return 0
    if (currency === 'USD' && product.priceUSD > 0) {
      return product.priceUSD
    }
    return product.price || 0
  }, [currency])

  const getDiscountPrice = useCallback((product) => {
    if (!product) return 0
    if (currency === 'USD' && product.discountPriceUSD > 0) {
      return product.discountPriceUSD
    }
    return product.discountPrice || 0
  }, [currency])

  // Currency symbol
  const currencySymbol = currency === 'USD' ? '$' : '₺'

  // Format date based on locale
  const formatDate = useCallback((dateStr) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }, [locale])

  return {
    locale,
    currency,
    currencySymbol,
    countryCode,
    geoLoaded,
    t,
    formatPrice,
    getPrice,
    getDiscountPrice,
    formatDate,
    isTurkey: countryCode === 'TR',
    isInternational: countryCode !== 'TR'
  }
}
