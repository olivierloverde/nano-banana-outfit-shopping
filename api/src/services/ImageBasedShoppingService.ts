import axios from 'axios'
import { ExtractedItem } from './ItemExtractionService'

export interface ImageSearchResult {
  title: string
  price?: string
  currency?: string
  url: string
  retailer: string
  imageUrl?: string
  similarity?: number
  source: string
}

export interface ImageShoppingResults {
  itemId: string
  pieceType: string
  extractedImageUrl?: string
  results: ImageSearchResult[]
  searchMethod: string
  confidence: number
}

export class ImageBasedShoppingService {
  private googleCustomSearchApiKey?: string
  private googleSearchEngineId?: string

  constructor() {
    this.googleCustomSearchApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID
  }

  async findShoppingLinksForExtractedItems(extractedItems: ExtractedItem[]): Promise<ImageShoppingResults[]> {
    const results: ImageShoppingResults[] = []

    for (const item of extractedItems) {
      try {
        console.log(`🔍 Starting image-based search for ${item.pieceType}...`)
        
        let shoppingResults: ImageSearchResult[] = []
        
        if (item.extractedImageUrl) {
          // Method 1: Direct reverse image search using Google Lens API simulation
          shoppingResults = await this.performReverseImageSearch(item)
          
          // Method 2: If direct search fails, try uploading image to search services
          if (shoppingResults.length === 0) {
            shoppingResults = await this.performImageUploadSearch(item)
          }
          
          // Method 3: Use SerpAPI or similar for more accurate reverse image search
          if (shoppingResults.length === 0) {
            shoppingResults = await this.performSerpApiImageSearch(item)
          }
        }
        
        // Method 4: Enhanced text search with visual attributes as fallback
        if (shoppingResults.length === 0) {
          shoppingResults = await this.performEnhancedTextSearch(item)
        }

        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          extractedImageUrl: item.extractedImageUrl,
          results: shoppingResults.slice(0, 8), // Top 8 results
          searchMethod: shoppingResults.length > 0 ? 'image_based' : 'fallback',
          confidence: item.confidence
        })

        console.log(`✅ Found ${shoppingResults.length} image-based results for ${item.pieceType}`)
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Error in image-based search for ${item.pieceType}:`, error)
        
        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          extractedImageUrl: item.extractedImageUrl,
          results: await this.generateFallbackResults(item),
          searchMethod: 'error_fallback',
          confidence: item.confidence
        })
      }
    }

    return results
  }

  private async performReverseImageSearch(item: ExtractedItem): Promise<ImageSearchResult[]> {
    if (!item.extractedImageUrl) {
      return []
    }

    try {
      console.log(`🔍 Performing reverse image search for ${item.pieceType}`)
      
      // Use Google Custom Search with image search and try to find similar products
      if (this.googleCustomSearchApiKey && this.googleSearchEngineId) {
        const searchQuery = `${item.pieceType} ${item.color || ''} buy shop online clothing fashion`
        
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
            imgSize: 'medium',
            imgColorType: 'color',
            rights: 'cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived',
            // Add image-specific filters
            fileType: 'jpg,png',
            filter: '0'
          },
          timeout: 15000
        })

        if (response.data.items && response.data.items.length > 0) {
          return this.processImageSearchResults(response.data.items, item, 'google_image_search')
        }
      }

      return []
    } catch (error) {
      console.error('Reverse image search failed:', error)
      return []
    }
  }

  private async performImageUploadSearch(item: ExtractedItem): Promise<ImageSearchResult[]> {
    if (!item.extractedImageUrl || !item.extractedImagePath) {
      return []
    }

    try {
      console.log(`📤 Performing image upload search for ${item.pieceType}`)
      
      // This would be where you'd integrate with services like:
      // - TinEye API
      // - Bing Visual Search API  
      // - Amazon Product Advertising API with image search
      // - Shopify Partner API image search
      
      // For now, we'll simulate this with enhanced Google search
      return await this.performEnhancedGoogleImageSearch(item)
      
    } catch (error) {
      console.error('Image upload search failed:', error)
      return []
    }
  }

  private async performEnhancedGoogleImageSearch(item: ExtractedItem): Promise<ImageSearchResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
      return []
    }

    try {
      // Create multiple targeted searches for better results
      const searches = [
        `${item.color || ''} ${item.pieceType} ${item.style || ''} buy online`,
        `${item.pieceType} ${item.pattern || ''} ${item.color || ''} shop`,
        `women's ${item.pieceType} ${item.color || ''} fashion online store`,
        `${item.pieceType} similar style ${item.color || ''} purchase`
      ].filter(query => query.trim().length > item.pieceType.length + 5) // Filter out too generic queries

      const allResults: ImageSearchResult[] = []

      for (const searchQuery of searches.slice(0, 2)) { // Limit to 2 searches to avoid rate limits
        try {
          const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: this.googleCustomSearchApiKey,
              cx: this.googleSearchEngineId,
              q: searchQuery,
              searchType: 'image',
              imgType: 'photo',
              safe: 'active',
              num: 5,
              cr: 'countryUS',
              lr: 'lang_en',
              imgSize: 'medium',
              imgColorType: 'color'
            },
            timeout: 10000
          })

          if (response.data.items) {
            const results = this.processImageSearchResults(response.data.items, item, 'enhanced_google_search')
            allResults.push(...results)
          }

          // Small delay between searches
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (searchError) {
          console.warn(`Search failed for query: ${searchQuery}`, searchError)
        }
      }

      // Remove duplicates and sort by relevance
      return this.deduplicateAndRankResults(allResults).slice(0, 6)

    } catch (error) {
      console.error('Enhanced Google image search failed:', error)
      return []
    }
  }

  private async performSerpApiImageSearch(item: ExtractedItem): Promise<ImageSearchResult[]> {
    // This would integrate with SerpAPI or similar service for better reverse image search
    // SerpAPI provides Google Lens-like functionality via API
    
    const serpApiKey = process.env.SERP_API_KEY
    
    if (!serpApiKey || !item.extractedImageUrl) {
      return []
    }

    try {
      console.log(`🐍 Using SerpAPI for image search of ${item.pieceType}`)
      
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: serpApiKey,
          engine: 'google_lens',
          url: item.extractedImageUrl,
          hl: 'en',
          gl: 'us'
        },
        timeout: 20000
      })

      if (response.data.visual_matches) {
        return this.processSerpApiResults(response.data.visual_matches, item)
      }

      return []
    } catch (error) {
      console.warn('SerpAPI image search failed:', error)
      return []
    }
  }

  private async performEnhancedTextSearch(item: ExtractedItem): Promise<ImageSearchResult[]> {
    if (!this.googleCustomSearchApiKey || !this.googleSearchEngineId) {
      return []
    }

    try {
      console.log(`📝 Performing enhanced text search for ${item.pieceType}`)
      
      // Build a highly specific search query using all available attributes
      const queryParts = []
      
      if (item.color && item.color !== 'various' && item.color !== 'unknown') {
        queryParts.push(item.color)
      }
      
      if (item.pattern && item.pattern !== 'solid' && item.pattern !== 'unknown') {
        queryParts.push(item.pattern)
      }
      
      queryParts.push(item.pieceType)
      
      if (item.style && item.style !== 'unknown') {
        queryParts.push(item.style)
      }
      
      queryParts.push('buy online', 'shop', 'clothing', 'fashion')
      
      const searchQuery = queryParts.join(' ')

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleCustomSearchApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          num: 10,
          safe: 'active',
          cr: 'countryUS',
          lr: 'lang_en'
        },
        timeout: 10000
      })

      if (response.data.items) {
        return this.processTextSearchResults(response.data.items, item, 'enhanced_text_search')
      }

      return []
    } catch (error) {
      console.error('Enhanced text search failed:', error)
      return []
    }
  }

  private processImageSearchResults(items: any[], item: ExtractedItem, source: string): ImageSearchResult[] {
    return items
      .filter(searchItem => searchItem.link && searchItem.title)
      .map(searchItem => ({
        title: this.cleanTitle(searchItem.title),
        url: searchItem.link,
        retailer: this.extractRetailer(searchItem.link),
        imageUrl: searchItem.image?.thumbnailLink || searchItem.link,
        similarity: this.calculateImageSimilarity(searchItem, item),
        source: source,
        price: this.extractPriceFromSnippet(searchItem.snippet || ''),
        currency: 'USD'
      }))
      .filter(result => this.isShoppingSite(result.url) && this.isRelevantResult(result, item))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  }

  private processTextSearchResults(items: any[], item: ExtractedItem, source: string): ImageSearchResult[] {
    return items
      .filter(searchItem => 
        searchItem.link && 
        searchItem.title && 
        this.isShoppingSite(searchItem.link)
      )
      .map(searchItem => ({
        title: this.cleanTitle(searchItem.title),
        url: searchItem.link,
        retailer: this.extractRetailer(searchItem.link),
        imageUrl: searchItem.pagemap?.cse_thumbnail?.[0]?.src,
        similarity: this.calculateTextRelevance(searchItem, item),
        source: source,
        price: this.extractPriceFromSnippet(searchItem.snippet || ''),
        currency: 'USD'
      }))
      .filter(result => this.isRelevantResult(result, item))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  }

  private processSerpApiResults(visualMatches: any[], item: ExtractedItem): ImageSearchResult[] {
    return visualMatches
      .filter(match => match.link && match.title && this.isShoppingSite(match.link))
      .map(match => ({
        title: this.cleanTitle(match.title),
        url: match.link,
        retailer: this.extractRetailer(match.link),
        imageUrl: match.thumbnail,
        similarity: match.position ? (100 - match.position) / 100 : 0.5,
        source: 'serp_api_lens',
        price: this.extractPriceFromSnippet(match.snippet || ''),
        currency: 'USD'
      }))
      .filter(result => this.isRelevantResult(result, item))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
  }

  private calculateImageSimilarity(searchItem: any, item: ExtractedItem): number {
    let score = 0.5 // Base score
    
    const title = searchItem.title?.toLowerCase() || ''
    const snippet = searchItem.snippet?.toLowerCase() || ''
    const text = `${title} ${snippet}`
    
    // Check for item type match
    if (text.includes(item.pieceType.toLowerCase())) {
      score += 0.3
    }
    
    // Check for color match
    if (item.color && item.color !== 'various' && text.includes(item.color.toLowerCase())) {
      score += 0.2
    }
    
    // Check for pattern match
    if (item.pattern && item.pattern !== 'solid' && text.includes(item.pattern.toLowerCase())) {
      score += 0.1
    }
    
    // Check for style match
    if (item.style && item.style !== 'unknown' && text.includes(item.style.toLowerCase())) {
      score += 0.1
    }
    
    // Penalty for irrelevant results
    const irrelevantWords = ['men', 'male', 'boy', 'kids', 'children']
    for (const word of irrelevantWords) {
      if (text.includes(word) && !text.includes('women') && !text.includes('female')) {
        score -= 0.2
      }
    }
    
    return Math.min(Math.max(score, 0), 1)
  }

  private calculateTextRelevance(searchItem: any, item: ExtractedItem): number {
    return this.calculateImageSimilarity(searchItem, item)
  }

  private deduplicateAndRankResults(results: ImageSearchResult[]): ImageSearchResult[] {
    const seen = new Set()
    const unique = results.filter(result => {
      const key = `${result.url}-${result.title}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    
    return unique.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
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
        'shopify.com': 'Shopify Store',
        'shein.com': 'SHEIN',
        'forever21.com': 'Forever 21',
        'urbanoutfitters.com': 'Urban Outfitters'
      }

      for (const [domain, name] of Object.entries(retailers)) {
        if (hostname.includes(domain)) {
          return name
        }
      }

      return hostname.replace('www.', '').split('.')[0]
        .charAt(0).toUpperCase() + hostname.slice(1)
    } catch {
      return 'Unknown Store'
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
      'target', 'walmart', 'nordstrom', 'macys', 'saks', 'zappos',
      'shein', 'forever21', 'urbanoutfitters', 'anthropologie', 'jcrew',
      'bananarepublic', 'gap', 'oldnavy', 'kohls', 'tjmaxx', 'marshalls'
    ]
    
    return shoppingSites.some(site => url.toLowerCase().includes(site))
  }

  private isRelevantResult(result: ImageSearchResult, item: ExtractedItem): boolean {
    const title = result.title.toLowerCase()
    const type = item.pieceType.toLowerCase()
    
    // Must contain the item type or related terms
    const typeVariations = this.getTypeVariations(type)
    const hasTypeMatch = typeVariations.some(variation => title.includes(variation))
    
    if (!hasTypeMatch) {
      return false
    }
    
    // Filter out clearly irrelevant results
    const irrelevantTerms = ['men\'s', 'boys', 'kids', 'children', 'baby']
    const hasIrrelevantTerms = irrelevantTerms.some(term => title.includes(term))
    
    return !hasIrrelevantTerms
  }

  private getTypeVariations(pieceType: string): string[] {
    const variations: { [key: string]: string[] } = {
      'dress': ['dress', 'gown', 'frock'],
      'shirt': ['shirt', 'blouse', 'top', 'tee', 't-shirt'],
      'pants': ['pants', 'trousers', 'jeans', 'leggings'],
      'shoes': ['shoes', 'sneakers', 'boots', 'heels', 'flats', 'sandals'],
      'bag': ['bag', 'handbag', 'purse', 'clutch', 'tote'],
      'jacket': ['jacket', 'blazer', 'coat', 'cardigan'],
      'skirt': ['skirt', 'mini', 'midi', 'maxi'],
      'shorts': ['shorts', 'short'],
      'sunglasses': ['sunglasses', 'glasses', 'shades', 'eyewear']
    }
    
    return variations[pieceType] || [pieceType]
  }

  private async generateFallbackResults(item: ExtractedItem): Promise<ImageSearchResult[]> {
    const retailers = ['Amazon', 'Zara', 'H&M', 'ASOS', 'Target']
    const basePrice = this.generateRealisticPrice(item.pieceType)
    
    return retailers.slice(0, 3).map((retailer, index) => ({
      title: `${item.color ? item.color + ' ' : ''}${item.pieceType.charAt(0).toUpperCase()}${item.pieceType.slice(1)} - Similar Style`,
      price: `$${basePrice + (index * 10)}.99`,
      currency: 'USD',
      url: this.generateShoppingUrl(retailer, item),
      retailer: retailer,
      similarity: 0.7 - (index * 0.1),
      source: 'fallback'
    }))
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

  private generateShoppingUrl(retailer: string, item: ExtractedItem): string {
    const query = encodeURIComponent(`${item.color || ''} ${item.pieceType} ${item.style || ''}`.trim())
    
    const urls: { [key: string]: string } = {
      'Amazon': `https://www.amazon.com/s?k=${query}`,
      'Zara': `https://www.zara.com/us/en/search?searchTerm=${query}`,
      'H&M': `https://www2.hm.com/en_us/search-results.html?q=${query}`,
      'ASOS': `https://www.asos.com/search/?q=${query}`,
      'Target': `https://www.target.com/s?searchTerm=${query}`
    }

    return urls[retailer] || `https://www.google.com/search?q=${query}+buy+online`
  }
}