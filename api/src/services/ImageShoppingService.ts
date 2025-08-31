import axios from 'axios'
import { LensItem } from './GoogleLensService'
import { ExtractedItem } from './ItemExtractionService'
import config from '../config'

export interface ShoppingResult {
  title: string
  price?: string
  currency?: string
  url: string
  retailer: string
  imageUrl?: string
  rating?: number
  availability?: string
}

export interface ItemShoppingResults {
  itemId: string
  pieceType: string
  results: ShoppingResult[]
  searchMethod: string
  confidence: number
}

export class ImageShoppingService {
  private googleCustomSearchApiKey?: string
  private googleSearchEngineId?: string

  constructor() {
    this.googleCustomSearchApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID
  }

  async findShoppingLinksForItems(
    lensItems: LensItem[], 
    flatLayImageUrl: string
  ): Promise<ItemShoppingResults[]> {
    const results: ItemShoppingResults[] = []

    for (const item of lensItems) {
      try {
        console.log(`🛍️ Searching for shopping links for ${item.pieceType}...`)
        
        // Method 1: Use Google Custom Search API with image search
        let shoppingResults = await this.searchByImageAndText(flatLayImageUrl, item)
        
        // Method 2: Fallback to text-based search if image search fails
        if (shoppingResults.length === 0) {
          shoppingResults = await this.searchByTextDescription(item)
        }

        // Method 3: Use affiliate shopping APIs as additional source
        const affiliateResults = await this.searchAffiliateShoppingAPIs(item)
        shoppingResults = [...shoppingResults, ...affiliateResults]

        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          results: shoppingResults.slice(0, 5), // Limit to top 5 results
          searchMethod: shoppingResults.length > 0 ? 'api_search' : 'fallback',
          confidence: item.confidenceScore
        })

        console.log(`✅ Found ${shoppingResults.length} shopping results for ${item.pieceType}`)
      } catch (error) {
        console.error(`❌ Error finding shopping links for ${item.pieceType}:`, error)
        
        // Add fallback mock results for failed searches
        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          results: this.generateFallbackShoppingResults(item),
          searchMethod: 'fallback_mock',
          confidence: item.confidenceScore
        })
      }
    }

    return results
  }

  async findShoppingLinksForExtractedItems(
    extractedItems: ExtractedItem[]
  ): Promise<ItemShoppingResults[]> {
    const results: ItemShoppingResults[] = []

    for (const item of extractedItems) {
      try {
        console.log(`🛍️ Searching for shopping links for extracted ${item.pieceType}...`)
        
        // Use the detailed description from Gemini extraction
        let shoppingResults = await this.searchByExtractedItemDescription(item)
        
        // Fallback to general search if no results
        if (shoppingResults.length === 0) {
          shoppingResults = await this.searchByGeneralQuery(item.pieceType, item.color)
        }

        // Add enhanced results based on extracted item details
        const enhancedResults = await this.generateEnhancedResultsForExtractedItem(item)
        shoppingResults = [...shoppingResults, ...enhancedResults]

        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          results: shoppingResults.slice(0, 5), // Limit to top 5 results
          searchMethod: shoppingResults.length > 0 ? 'extracted_item_search' : 'fallback',
          confidence: item.confidence
        })

        console.log(`✅ Found ${shoppingResults.length} shopping results for ${item.pieceType}`)
      } catch (error) {
        console.error(`❌ Error finding shopping links for ${item.pieceType}:`, error)
        
        // Add fallback mock results for failed searches
        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          results: this.generateFallbackShoppingResultsForExtracted(item),
          searchMethod: 'fallback_mock',
          confidence: item.confidence
        })
      }
    }

    return results
  }

  private async searchByImageAndText(imageUrl: string, item: LensItem): Promise<ShoppingResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
      console.log('Google Custom Search API not configured')
      return []
    }

    try {
      // Create search query combining item description and type
      const searchQuery = this.buildSearchQuery(item)
      
      // Use Google Custom Search API with image search
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          searchType: 'image',
          imgType: 'photo',
          rights: 'cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived',
          safe: 'active',
          num: 10,
          // Additional parameters for shopping focus
          cr: 'countryUS',
          lr: 'lang_en',
          fileType: 'jpg,png'
        },
        timeout: 10000
      })

      if (response.data.items && response.data.items.length > 0) {
        return this.processGoogleSearchResults(response.data.items, item.pieceType)
      }

      return []
    } catch (error) {
      console.error('Google Custom Search API error:', error)
      return []
    }
  }

  private async searchByTextDescription(item: LensItem): Promise<ShoppingResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
      return []
    }

    try {
      const searchQuery = this.buildShoppingSearchQuery(item)
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          num: 8,
          safe: 'active',
          cr: 'countryUS',
          lr: 'lang_en'
        },
        timeout: 10000
      })

      if (response.data.items) {
        return this.processTextSearchResults(response.data.items, item.pieceType)
      }

      return []
    } catch (error) {
      console.error('Text search API error:', error)
      return []
    }
  }

  private async searchAffiliateShoppingAPIs(item: LensItem): Promise<ShoppingResult[]> {
    // This is where you could integrate with affiliate shopping APIs like:
    // - Amazon Product Advertising API
    // - eBay API
    // - Shopify Partner API
    // - Commission Junction API
    // - ShareASale API
    
    // For now, we'll return enhanced mock results based on the item
    return this.generateEnhancedShoppingResults(item)
  }

  private buildSearchQuery(item: LensItem): string {
    const parts = []
    
    if (item.description) {
      parts.push(item.description)
    } else {
      parts.push(item.pieceType)
    }

    if (item.productInfo?.brand) {
      parts.push(item.productInfo.brand)
    }

    if (item.productInfo?.title) {
      parts.push(item.productInfo.title)
    }

    parts.push('buy online', 'fashion', 'clothing')
    
    return parts.join(' ')
  }

  private buildShoppingSearchQuery(item: LensItem): string {
    const parts = []
    
    parts.push(`${item.pieceType} buy online`)
    
    if (item.productInfo?.brand) {
      parts.push(item.productInfo.brand)
    }
    
    if (item.description && item.description !== item.pieceType) {
      parts.push(item.description)
    }

    parts.push('shop', 'fashion', 'clothing store')
    
    return parts.join(' ')
  }

  private processGoogleSearchResults(items: any[], pieceType: string): ShoppingResult[] {
    return items
      .filter(item => item.link && item.title)
      .map(item => ({
        title: this.cleanTitle(item.title),
        url: item.link,
        retailer: this.extractRetailer(item.link),
        imageUrl: item.image?.thumbnailLink,
        availability: 'unknown'
      }))
      .filter(result => this.isRelevantShoppingResult(result, pieceType))
  }

  private processTextSearchResults(items: any[], pieceType: string): ShoppingResult[] {
    return items
      .filter(item => 
        item.link && 
        item.title && 
        this.isShoppingSite(item.link)
      )
      .map(item => ({
        title: this.cleanTitle(item.title),
        url: item.link,
        retailer: this.extractRetailer(item.link),
        price: this.extractPriceFromSnippet(item.snippet),
        availability: 'available'
      }))
      .filter(result => this.isRelevantShoppingResult(result, pieceType))
  }

  private generateEnhancedShoppingResults(item: LensItem): ShoppingResult[] {
    const retailers = ['Amazon', 'Zara', 'H&M', 'ASOS', 'Target', 'Nordstrom', 'Macy\'s']
    const results: ShoppingResult[] = []

    for (let i = 0; i < Math.min(3, retailers.length); i++) {
      const retailer = retailers[i]
      const basePrice = this.generateRealisticPrice(item.pieceType)
      
      results.push({
        title: `${item.description || `${item.pieceType.charAt(0).toUpperCase()}${item.pieceType.slice(1)}`} - Similar Style`,
        price: `$${basePrice + (i * 10)}.99`,
        currency: 'USD',
        url: this.generateShoppingUrl(retailer, item),
        retailer: retailer,
        rating: 4.0 + (Math.random() * 1.0),
        availability: 'in_stock'
      })
    }

    return results
  }

  private generateFallbackShoppingResults(item: LensItem): ShoppingResult[] {
    return [{
      title: `${item.pieceType.charAt(0).toUpperCase()}${item.pieceType.slice(1)} - Find Similar`,
      price: `$${this.generateRealisticPrice(item.pieceType)}.99`,
      currency: 'USD',
      url: `https://www.google.com/search?q=${encodeURIComponent(item.pieceType + ' buy online')}`,
      retailer: 'Google Search',
      availability: 'search_required'
    }]
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\s*-\s*(Amazon\.com|eBay|Etsy|Zara|H&M|ASOS).*$/i, '')
      .replace(/^\s*Buy\s+/i, '')
      .replace(/\s*\|\s*Free.*$/i, '')
      .substring(0, 80)
      .trim()
  }

  private extractRetailer(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      
      const retailers: { [key: string]: string } = {
        'amazon.com': 'Amazon',
        'amazon.co.uk': 'Amazon UK',
        'zara.com': 'Zara',
        'hm.com': 'H&M',
        'asos.com': 'ASOS',
        'target.com': 'Target',
        'nordstrom.com': 'Nordstrom',
        'macys.com': 'Macy\'s',
        'ebay.com': 'eBay',
        'etsy.com': 'Etsy',
        'shopify.com': 'Shopify Store'
      }

      for (const [domain, name] of Object.entries(retailers)) {
        if (hostname.includes(domain)) {
          return name
        }
      }

      // Extract domain name as fallback
      return hostname.replace('www.', '').split('.')[0]
        .charAt(0).toUpperCase() + hostname.slice(1)
    } catch {
      return 'Unknown Retailer'
    }
  }

  private extractPriceFromSnippet(snippet: string): string | undefined {
    const priceRegex = /\$[\d,]+\.?\d*/g
    const matches = snippet.match(priceRegex)
    return matches ? matches[0] : undefined
  }

  private isShoppingSite(url: string): boolean {
    const shoppingSites = [
      'amazon', 'ebay', 'etsy', 'shopify', 'zara', 'hm.com', 'asos',
      'target', 'walmart', 'nordstrom', 'macys', 'saks', 'zappos'
    ]
    
    return shoppingSites.some(site => url.toLowerCase().includes(site))
  }

  private isRelevantShoppingResult(result: ShoppingResult, pieceType: string): boolean {
    const title = result.title.toLowerCase()
    const type = pieceType.toLowerCase()
    
    // Basic relevance check
    return title.includes(type) || 
           title.includes('clothing') || 
           title.includes('fashion') ||
           title.includes('apparel')
  }

  private async searchByExtractedItemDescription(item: ExtractedItem): Promise<ShoppingResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
      return []
    }

    try {
      // First try image search if we have an extracted item image
      if (item.extractedImageUrl) {
        console.log(`🔍 Using extracted image for search: ${item.extractedImageUrl}`)
        const imageResults = await this.searchByExtractedItemImage(item)
        if (imageResults.length > 0) {
          return imageResults
        }
      }

      // Fallback to text-based search with detailed query
      console.log(`🔍 Using text search for ${item.pieceType}`)
      const searchQuery = this.buildExtractedItemSearchQuery(item)
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          num: 8,
          safe: 'active',
          cr: 'countryUS',
          lr: 'lang_en'
        },
        timeout: 10000
      })

      if (response.data.items) {
        return this.processTextSearchResults(response.data.items, item.pieceType)
      }

      return []
    } catch (error) {
      console.error('Extracted item search API error:', error)
      return []
    }
  }

  private async searchByExtractedItemImage(item: ExtractedItem): Promise<ShoppingResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId || !item.extractedImageUrl) {
      return []
    }

    try {
      // Use Google Custom Search API with image URL for reverse image search
      const searchQuery = `${item.pieceType} ${item.color || ''} buy online shop`.trim()
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          searchType: 'image',
          imgType: 'photo',
          safe: 'active',
          num: 10,
          cr: 'countryUS',
          lr: 'lang_en',
          // Use the extracted image as reference for similar image search
          imgUrl: item.extractedImageUrl
        },
        timeout: 15000
      })

      if (response.data.items && response.data.items.length > 0) {
        console.log(`✅ Found ${response.data.items.length} image search results for ${item.pieceType}`)
        return this.processImageSearchResults(response.data.items, item.pieceType)
      }

      return []
    } catch (error) {
      console.error('Image search API error:', error)
      return []
    }
  }

  private processImageSearchResults(items: any[], pieceType: string): ShoppingResult[] {
    return items
      .filter(item => item.link && item.title && this.isShoppingSite(item.link))
      .map(item => ({
        title: this.cleanTitle(item.title),
        url: item.link,
        retailer: this.extractRetailer(item.link),
        imageUrl: item.image?.thumbnailLink,
        price: this.extractPriceFromSnippet(item.snippet || ''),
        availability: 'available'
      }))
      .filter(result => this.isRelevantShoppingResult(result, pieceType))
      .slice(0, 5) // Limit to top 5 results
  }

  private async searchByGeneralQuery(pieceType: string, color?: string): Promise<ShoppingResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
      return []
    }

    try {
      const searchTerms = [pieceType, 'buy online', 'fashion']
      if (color && color !== 'various' && color !== 'unknown') {
        searchTerms.unshift(color)
      }
      
      const searchQuery = searchTerms.join(' ')
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          num: 5,
          safe: 'active',
          cr: 'countryUS',
          lr: 'lang_en'
        },
        timeout: 10000
      })

      if (response.data.items) {
        return this.processTextSearchResults(response.data.items, pieceType)
      }

      return []
    } catch (error) {
      console.error('General query search API error:', error)
      return []
    }
  }

  private buildExtractedItemSearchQuery(item: ExtractedItem): string {
    const parts = []
    
    // Add color if specific
    if (item.color && item.color !== 'various' && item.color !== 'unknown') {
      parts.push(item.color)
    }
    
    // Add pattern if not solid
    if (item.pattern && item.pattern !== 'solid' && item.pattern !== 'unknown') {
      parts.push(item.pattern)
    }
    
    // Add item type
    parts.push(item.pieceType)
    
    // Add style characteristics
    if (item.style && item.style !== 'unknown') {
      parts.push(item.style)
    }
    
    // Add shopping context
    parts.push('buy online', 'shop', 'fashion')
    
    // Use the enhanced description if available
    if (item.description && item.description !== `${item.pieceType} item`) {
      return `${item.description} buy online shop fashion`
    }
    
    return parts.join(' ')
  }

  private async generateEnhancedResultsForExtractedItem(item: ExtractedItem): Promise<ShoppingResult[]> {
    const retailers = ['Amazon', 'Zara', 'H&M', 'ASOS', 'Target', 'Nordstrom']
    const results: ShoppingResult[] = []

    for (let i = 0; i < Math.min(3, retailers.length); i++) {
      const retailer = retailers[i]
      const basePrice = this.generateRealisticPrice(item.pieceType)
      
      // Create more realistic titles based on extracted item details
      let title = this.generateRealisticTitle(item)
      
      results.push({
        title: title,
        price: `$${basePrice + (i * 15)}.99`,
        currency: 'USD',
        url: this.generateShoppingUrlForExtracted(retailer, item),
        retailer: retailer,
        rating: 4.0 + (Math.random() * 1.0),
        availability: 'in_stock'
      })
    }

    return results
  }

  private generateRealisticTitle(item: ExtractedItem): string {
    const parts = []
    
    if (item.color && item.color !== 'various' && item.color !== 'unknown') {
      parts.push(item.color.charAt(0).toUpperCase() + item.color.slice(1))
    }
    
    if (item.pattern && item.pattern !== 'solid' && item.pattern !== 'unknown') {
      parts.push(item.pattern.charAt(0).toUpperCase() + item.pattern.slice(1))
    }
    
    parts.push(item.pieceType.charAt(0).toUpperCase() + item.pieceType.slice(1))
    
    if (item.style && item.style !== 'unknown') {
      parts.push(`- ${item.style.charAt(0).toUpperCase() + item.style.slice(1)} Style`)
    }
    
    return parts.join(' ')
  }

  private generateShoppingUrlForExtracted(retailer: string, item: ExtractedItem): string {
    const query = encodeURIComponent(this.buildExtractedItemSearchQuery(item))
    
    const urls: { [key: string]: string } = {
      'Amazon': `https://www.amazon.com/s?k=${query}`,
      'Zara': `https://www.zara.com/us/en/search?searchTerm=${query}`,
      'H&M': `https://www2.hm.com/en_us/search-results.html?q=${query}`,
      'ASOS': `https://www.asos.com/search/?q=${query}`,
      'Target': `https://www.target.com/s?searchTerm=${query}`,
      'Nordstrom': `https://www.nordstrom.com/sr?keyword=${query}`
    }

    return urls[retailer] || `https://www.google.com/search?q=${query}+buy+online`
  }

  private generateFallbackShoppingResultsForExtracted(item: ExtractedItem): ShoppingResult[] {
    const query = encodeURIComponent(`${item.color || ''} ${item.pieceType} ${item.style || ''} buy online`.trim())
    
    return [{
      title: `${item.color ? item.color + ' ' : ''}${item.pieceType.charAt(0).toUpperCase()}${item.pieceType.slice(1)} - Find Similar`,
      price: `$${this.generateRealisticPrice(item.pieceType)}.99`,
      currency: 'USD',
      url: `https://www.google.com/search?q=${query}`,
      retailer: 'Google Search',
      availability: 'search_required'
    }]
  }

  private generateRealisticPrice(pieceType: string): number {
    const priceRanges: { [key: string]: [number, number] } = {
      'dress': [25, 150],
      'shirt': [15, 80],
      'pants': [20, 120],
      'shoes': [30, 200],
      'jacket': [40, 250],
      'bag': [25, 180],
      'sunglasses': [15, 150],
      'watch': [50, 300],
      'jewelry': [20, 200]
    }

    const [min, max] = priceRanges[pieceType] || [20, 100]
    return Math.floor(Math.random() * (max - min) + min)
  }

  private generateShoppingUrl(retailer: string, item: LensItem): string {
    const query = encodeURIComponent(`${item.pieceType} ${item.description || ''}`.trim())
    
    const urls: { [key: string]: string } = {
      'Amazon': `https://www.amazon.com/s?k=${query}`,
      'Zara': `https://www.zara.com/us/en/search?searchTerm=${query}`,
      'H&M': `https://www2.hm.com/en_us/search-results.html?q=${query}`,
      'ASOS': `https://www.asos.com/search/?q=${query}`,
      'Target': `https://www.target.com/s?searchTerm=${query}`,
      'Nordstrom': `https://www.nordstrom.com/sr?keyword=${query}`,
      'Macy\'s': `https://www.macys.com/shop/search?keyword=${query}`
    }

    return urls[retailer] || `https://www.google.com/search?q=${query}+buy+online`
  }

  // Test method
  async testConnection(): Promise<boolean> {
    try {
      if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
        console.log('Google Custom Search API not configured - will use mock data')
        return false
      }
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: 'test',
          num: 1
        },
        timeout: 5000
      })
      
      return response.status === 200
    } catch (error) {
      console.error('Shopping service connection test failed:', error)
      return false
    }
  }
}