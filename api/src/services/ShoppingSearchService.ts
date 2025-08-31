import axios from 'axios'
import { GoogleGenAI } from '@google/genai'
import config from '../config'
import { ExtractedItem } from './ItemExtractionService'

export interface ProductResult {
  title: string
  price: string
  currency: string
  url: string
  retailer: string
  imageUrl?: string
  rating?: number
  reviewCount?: number
  availability: string
  source: string
}

export interface ShoppingSearchResults {
  itemId: string
  pieceType: string
  extractedImageUrl?: string
  products: ProductResult[]
  searchMethod: string
  confidence: number
  totalResults: number
}

export class ShoppingSearchService {
  private serpApiKey: string
  private googleSearchApiKey: string
  private googleSearchEngineId: string
  private genAI: GoogleGenAI | null = null

  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY || ''
    this.googleSearchApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || ''
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || ''
    
    // Initialize new Google GenAI client with API key
    if (config.google.geminiApiKey) {
      this.genAI = new GoogleGenAI({
        apiKey: config.google.geminiApiKey
      })
    }
  }

  async searchProductsForExtractedItems(extractedItems: ExtractedItem[]): Promise<ShoppingSearchResults[]> {
    const results: ShoppingSearchResults[] = []

    for (const item of extractedItems) {
      try {
        console.log(`🛍️ Searching for visually similar products using IMAGE ONLY for ${item.pieceType}...`)
        
        let products: ProductResult[] = []
        
        // ONLY METHOD: Reverse image search using the extracted item image (VISUAL MATCHING ONLY)
        if (item.extractedImageUrl) {
          console.log(`🔍 Using ONLY reverse image search for visual matching...`)
          products = await this.searchByImage(item)
        } else {
          console.log(`⚠️ No extracted image available for ${item.pieceType} - cannot perform visual search`)
          // Skip items without extracted images - no fallback to text search
        }

        console.log(`✅ Gemini search returned ${products.length} products for ${item.pieceType}`)
        
        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          extractedImageUrl: item.extractedImageUrl,
          products: products, // All Gemini results
          searchMethod: item.extractedImageUrl && products.length > 0 ? 'gemini_web_search' : 'no_image_available',
          confidence: item.confidence,
          totalResults: products.length
        })

        if (products.length > 0) {
          console.log(`✅ Found ${products.length} visually matched products for ${item.pieceType} using IMAGE ONLY`)
        } else if (item.extractedImageUrl) {
          console.log(`⚠️ No visually similar products found for ${item.pieceType} - image search returned no results`)
        }
        
        // Rate limiting between items
        await new Promise(resolve => setTimeout(resolve, 1500))

      } catch (error) {
        console.error(`❌ Error in visual search for ${item.pieceType}:`, error)
        
        // No fallback products - only visual search allowed
        results.push({
          itemId: item.id,
          pieceType: item.pieceType,
          extractedImageUrl: item.extractedImageUrl,
          products: [], // No fallback products
          searchMethod: 'visual_search_failed',
          confidence: item.confidence,
          totalResults: 0
        })
      }
    }

    return results
  }

  private async searchByImage(item: ExtractedItem): Promise<ProductResult[]> {
    if (!item.extractedImageUrl) {
      console.log('Extracted image URL not available for visual search')
      return []
    }

    try {
      console.log(`🖼️ Performing Gemini web search with Google Search tool for: ${item.extractedImageUrl}`)
      
      // ONLY METHOD: Gemini with Google Search tool
      if (this.genAI) {
        const geminiResults = await this.searchWithGeminiWebSearch(item)
        console.log(`✅ Gemini web search found ${geminiResults.length} products`)
        return geminiResults
      }
      
      console.log(`⚠️ Google GenAI not available for web search`)
      return []
      
    } catch (error) {
      console.error('Gemini web search failed:', error)
      return []
    }
  }

  private async searchWithGeminiWebSearch(item: ExtractedItem): Promise<ProductResult[]> {
    if (!this.genAI || !item.extractedImageUrl) {
      console.log('Google GenAI or extracted image not available for web search')
      return []
    }

    try {
      console.log(`🤖 Using Google GenAI with Search tool for visual product matching...`)
      
      // Fetch the extracted item image
      const imageResponse = await axios.get(item.extractedImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      })
      
      const imageBuffer = Buffer.from(imageResponse.data)
      const base64Data = imageBuffer.toString('base64')
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg'
      
      // Define the Google Search tool
      const groundingTool = {
        googleSearch: {},
      }
      
      // Configure generation settings with Google Search
      const config = {
        tools: [groundingTool],
      }
      
      const prompt = `Look at this ${item.pieceType} image and search the web for current shopping products that match visually.

Find current, available products from retailers like Amazon, Target, Zara, H&M, ASOS, Nordstrom.

Item details:
- Type: ${item.pieceType}
- Color: ${item.color || 'similar color'}
- Style: ${item.style || 'similar style'}

Return current product listings in JSON format:
{
  "products": [
    {
      "title": "Product name",
      "price": "$XX.XX", 
      "url": "https://direct-product-page-url",
      "retailer": "Store Name"
    }
  ]
}

Search for 3-5 current products that match this ${item.pieceType} image.`

      // Make request with image and Google Search tool
      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { 
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config,
      })

      const responseText = response.text || ''
      console.log(`🤖 Google GenAI search response:`, responseText.substring(0, 500) + '...')
      
      // Parse the JSON response
      const products = this.parseGeminiWebSearchResponse(responseText)
      
      console.log(`✅ Google GenAI search parsed ${products.length} products`)
      return products
      
    } catch (error) {
      console.error('Google GenAI search failed:', error)
      return []
    }
  }

  private parseGeminiWebSearchResponse(responseText: string): ProductResult[] {
    try {
      console.log(`🔍 Parsing Gemini response...`)
      
      // Try to extract JSON from the response
      let jsonText = responseText
      
      // Look for JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      } else {
        // Try to find JSON wrapped in markdown code blocks
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1]
        } else {
          console.log(`❌ No JSON found in Gemini response`)
          return []
        }
      }
      
      const parsedResponse = JSON.parse(jsonText)
      console.log(`✅ Parsed JSON from Gemini:`, parsedResponse)
      
      if (parsedResponse.products && Array.isArray(parsedResponse.products)) {
        const products = parsedResponse.products
          .filter((product: any) => product.url && product.title)
          .map((product: any) => ({
            title: product.title,
            price: product.price || 'Price not available',
            currency: 'USD',
            url: product.url,
            retailer: product.retailer || 'Unknown Store',
            availability: 'available',
            source: 'gemini_web_search'
          }))
        
        console.log(`✅ Created ${products.length} products from Gemini response`)
        return products
      }
      
      console.log(`❌ No products array found in parsed response`)
      return []
    } catch (error) {
      console.error('Failed to parse Gemini web search response:', error)
      console.log('Raw response:', responseText.substring(0, 500))
      return []
    }
  }

  private extractProductsFromText(text: string): ProductResult[] {
    const products: ProductResult[] = []
    
    // Extract URLs that look like product pages
    const urlRegex = /https?:\/\/[^\s]+/g
    const urls = text.match(urlRegex) || []
    
    for (const url of urls) {
      try {
        if (this.isShoppingDomain(url) && this.isProductPage(url)) {
          products.push({
            title: `Product from ${this.extractRetailer(url)}`,
            price: 'Price not available',
            currency: 'USD',
            url: url,
            retailer: this.extractRetailer(url),
            availability: 'available',
            source: 'gemini_web_search_fallback'
          })
        }
      } catch (error) {
        // Skip invalid URLs
      }
    }
    
    return products.slice(0, 5)
  }

  private async searchWithGoogleLens(imageUrl: string): Promise<ProductResult[]> {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: this.serpApiKey,
          engine: 'google_lens',
          url: imageUrl,
          hl: 'en',
          gl: 'us'
        },
        timeout: 20000
      })

      if (response.data.shopping_results) {
        return this.processSerpShoppingResults(response.data.shopping_results, 'google_lens')
      }
      
      // Also check visual matches that might have shopping links
      if (response.data.visual_matches) {
        return this.processVisualMatches(response.data.visual_matches, 'google_lens')
      }

      return []
    } catch (error) {
      console.error('Google Lens search failed:', error)
      return []
    }
  }

  private async searchWithGoogleReverse(imageUrl: string): Promise<ProductResult[]> {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: this.serpApiKey,
          engine: 'google_reverse_image',
          image_url: imageUrl,
          hl: 'en',
          gl: 'us'
        },
        timeout: 20000
      })

      const products: ProductResult[] = []
      
      // Check inline shopping results
      if (response.data.inline_shopping_results) {
        const inlineProducts = this.processSerpShoppingResults(response.data.inline_shopping_results, 'google_reverse')
        products.push(...inlineProducts)
      }

      // Check image results for shopping links
      if (response.data.image_results) {
        const imageProducts = this.processImageResults(response.data.image_results, 'google_reverse')
        products.push(...imageProducts)
      }

      return products
    } catch (error) {
      console.error('Google reverse image search failed:', error)
      return []
    }
  }

  private async searchWithBingReverse(imageUrl: string): Promise<ProductResult[]> {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: this.serpApiKey,
          engine: 'bing_images',
          q: imageUrl,
          hl: 'en',
          gl: 'us'
        },
        timeout: 15000
      })

      if (response.data.images_results) {
        return this.processImageResults(response.data.images_results, 'bing_reverse')
      }

      return []
    } catch (error) {
      console.error('Bing reverse image search failed:', error)
      return []
    }
  }

  private processVisualMatches(visualMatches: any[], source: string): ProductResult[] {
    return visualMatches
      .filter(match => match.link && match.title)
      .filter(match => this.isShoppingDomain(match.link) && this.isProductPage(match.link))
      .map(match => ({
        title: this.cleanProductTitle(match.title),
        price: this.extractPriceFromSnippet(match.snippet || ''),
        currency: 'USD',
        url: match.link,
        retailer: this.extractRetailer(match.link),
        imageUrl: match.thumbnail,
        availability: 'available',
        source: source
      }))
      .filter(product => this.isValidProduct(product))
      .slice(0, 10) // Limit results
  }

  private processImageResults(imageResults: any[], source: string): ProductResult[] {
    return imageResults
      .filter(result => result.original && result.title)
      .filter(result => this.isShoppingDomain(result.original) && this.isProductPage(result.original))
      .map(result => ({
        title: this.cleanProductTitle(result.title),
        price: this.extractPriceFromSnippet(result.snippet || ''),
        currency: 'USD',
        url: result.original,
        retailer: this.extractRetailer(result.original),
        imageUrl: result.thumbnail,
        availability: 'available',
        source: source
      }))
      .filter(product => this.isValidProduct(product))
      .slice(0, 8) // Limit results
  }

  // REMOVED: Text-based Google Shopping search - using image search only
  // private async searchGoogleShopping(item: ExtractedItem): Promise<ProductResult[]> {
  //   // Text-based search removed - visual search only
  // }

  // REMOVED: Text-based retailer search - using image search only
  // private async searchMajorRetailers(item: ExtractedItem): Promise<ProductResult[]> {
  //   // Text-based retailer search removed - visual search only
  // }

  // REMOVED: Text-based product search - using image search only
  // private async searchProductFocused(item: ExtractedItem): Promise<ProductResult[]> {
  //   // Text-based product search removed - visual search only
  // }

  // REMOVED: Text-based query building - using image search only
  // private buildShoppingQuery(item: ExtractedItem): string {
  //   // Text-based search query building removed - visual search only
  // }

  // REMOVED: Text-based item type variations - using image search only  
  // private getItemTypeVariations(pieceType: string): string[] {
  //   // Text-based item variations removed - visual search only
  // }

  private processSerpShoppingResults(results: any[], source: string): ProductResult[] {
    return results
      .filter(result => result.link && result.title && result.price)
      .map(result => ({
        title: this.cleanProductTitle(result.title),
        price: this.extractPrice(result.price),
        currency: 'USD',
        url: result.link,
        retailer: result.source || this.extractRetailer(result.link),
        imageUrl: result.thumbnail,
        rating: result.rating,
        reviewCount: result.reviews,
        availability: result.delivery ? 'available' : 'unknown',
        source: source
      }))
      .filter(product => this.isValidProduct(product))
  }

  // REMOVED: Text-based retailer result processing - using image search only
  // private processRetailerResults(results: any[], retailerName: string): ProductResult[] {
  //   // Text-based retailer results processing removed - visual search only
  // }

  // REMOVED: Text-based custom search result processing - using image search only
  // private processCustomSearchResults(results: any[]): ProductResult[] {
  //   // Text-based custom search results processing removed - visual search only
  // }

  private isProductPage(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname.toLowerCase()
      
      // Common product page patterns
      const productPatterns = [
        '/product/',
        '/item/',
        '/p/',
        '/dp/',
        '/products/',
        'product-',
        'item-',
        '/buy/',
        '/shop/'
      ]
      
      return productPatterns.some(pattern => path.includes(pattern)) ||
             url.includes('?product') ||
             url.includes('&product')
    } catch {
      return false
    }
  }

  private isShoppingDomain(url: string): boolean {
    const shoppingDomains = [
      'amazon.com', 'ebay.com', 'etsy.com', 'target.com', 'walmart.com',
      'zara.com', 'hm.com', 'asos.com', 'nordstrom.com', 'macys.com',
      'gap.com', 'jcrew.com', 'bananarepublic.com', 'anthropologie.com',
      'urbanoutfitters.com', 'forever21.com', 'shein.com', 'zappos.com',
      'saks.com', 'barneys.com', 'bloomingdales.com', 'kohls.com',
      'tjmaxx.com', 'marshalls.com', 'oldnavy.com', 'uniqlo.com'
    ]
    
    return shoppingDomains.some(domain => url.toLowerCase().includes(domain))
  }

  private cleanProductTitle(title: string): string {
    return title
      .replace(/\s*-\s*(Amazon\.com|Target|Walmart|Zara|H&M|ASOS|Nordstrom|Macy's).*$/i, '')
      .replace(/^\s*(Buy|Shop|Find)\s+/i, '')
      .replace(/\s*\|\s*(Free Shipping|Fast Delivery).*$/i, '')
      .replace(/\s*\(\d+\)\s*$/, '') // Remove review counts in parentheses
      .substring(0, 100)
      .trim()
  }

  private extractPrice(priceText: string): string {
    if (!priceText) return 'Price not available'
    
    // Clean up price text
    const cleaned = priceText.replace(/[^\d.,\$]/g, '')
    const priceMatch = cleaned.match(/\$?[\d,]+\.?\d*/g)
    
    if (priceMatch && priceMatch.length > 0) {
      return priceMatch[0].startsWith('$') ? priceMatch[0] : `$${priceMatch[0]}`
    }
    
    return priceText
  }

  private extractPriceFromSnippet(snippet: string): string {
    const priceRegex = /\$[\d,]+\.?\d*/g
    const matches = snippet.match(priceRegex)
    return matches && matches.length > 0 ? matches[0] : 'Price not available'
  }

  private extractRetailer(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      
      const retailers: { [key: string]: string } = {
        'amazon.com': 'Amazon',
        'target.com': 'Target',
        'walmart.com': 'Walmart',
        'zara.com': 'Zara',
        'hm.com': 'H&M',
        'asos.com': 'ASOS',
        'nordstrom.com': 'Nordstrom',
        'macys.com': 'Macy\'s',
        'gap.com': 'Gap',
        'jcrew.com': 'J.Crew',
        'anthropologie.com': 'Anthropologie',
        'urbanoutfitters.com': 'Urban Outfitters',
        'forever21.com': 'Forever 21',
        'shein.com': 'SHEIN',
        'zappos.com': 'Zappos',
        'kohls.com': 'Kohl\'s'
      }

      for (const [domain, name] of Object.entries(retailers)) {
        if (hostname.includes(domain)) {
          return name
        }
      }

      // Extract brand name from domain
      return hostname.replace('www.', '').split('.')[0]
        .charAt(0).toUpperCase() + hostname.slice(1).split('.')[0]
    } catch {
      return 'Online Store'
    }
  }

  private isValidProduct(product: ProductResult): boolean {
    // Must have essential product information
    if (!product.title || !product.url) {
      return false
    }
    
    // Filter out obviously irrelevant results
    const title = product.title.toLowerCase()
    const irrelevantTerms = ['men\'s', 'boys', 'kids', 'children', 'baby', 'toddler']
    
    if (irrelevantTerms.some(term => title.includes(term) && !title.includes('women'))) {
      return false
    }
    
    return true
  }

  private deduplicateAndRankProducts(products: ProductResult[], item: ExtractedItem): ProductResult[] {
    console.log(`🔄 Deduplicating ${products.length} products from all sources...`)
    
    // Enhanced deduplication for multiple sources
    const seenUrls = new Set<string>()
    const seenTitles = new Map<string, ProductResult>()
    const unique: ProductResult[] = []
    
    for (const product of products) {
      // Skip exact URL duplicates
      if (seenUrls.has(product.url)) {
        console.log(`🗑️ Removing duplicate URL: ${product.url}`)
        continue
      }
      
      // Check for very similar titles
      const titleKey = this.normalizeProductTitle(product.title)
      const existingProduct = seenTitles.get(titleKey)
      
      if (existingProduct) {
        // Keep the one from the better source
        const currentScore = this.getSourceScore(product.source)
        const existingScore = this.getSourceScore(existingProduct.source)
        
        if (currentScore > existingScore) {
          console.log(`🔄 Replacing product from ${existingProduct.source} with better source ${product.source}: ${titleKey}`)
          // Remove the existing one and add the new one
          const index = unique.indexOf(existingProduct)
          if (index > -1) {
            unique.splice(index, 1)
          }
          seenUrls.delete(existingProduct.url)
          
          unique.push(product)
          seenUrls.add(product.url)
          seenTitles.set(titleKey, product)
        } else {
          console.log(`🗑️ Keeping existing product from better source: ${titleKey}`)
        }
      } else {
        // New product
        unique.push(product)
        seenUrls.add(product.url)
        seenTitles.set(titleKey, product)
      }
    }
    
    console.log(`✅ Deduplicated to ${unique.length} unique products`)
    
    // Rank by relevance to the extracted item
    const ranked = unique
      .map(product => ({
        ...product,
        relevanceScore: this.calculateRelevance(product, item)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    console.log(`🏆 Top 3 ranked products:`, ranked.slice(0, 3).map(p => ({
      title: p.title.substring(0, 50),
      source: p.source,
      score: p.relevanceScore,
      retailer: p.retailer
    })))
    
    return ranked
  }
  
  private normalizeProductTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
      .substring(0, 60)        // First 60 chars for comparison
  }
  
  private getSourceScore(source: string): number {
    const sourceScores: { [key: string]: number } = {
      'gemini_web_search': 5,
      'google_lens': 4,
      'google_reverse': 3,
      'bing_reverse': 2,
      'gemini_web_search_fallback': 1
    }
    return sourceScores[source] || 0
  }

  private calculateRelevance(product: ProductResult, item: ExtractedItem): number {
    let score = 0
    
    // VISUAL SEARCH ONLY SCORING - no text-based matching
    
    // Primary scoring based on visual search source quality
    if (product.source === 'gemini_web_search') {
      score += 25 // Gemini with web search is most comprehensive
    } else if (product.source === 'google_lens') {
      score += 20 // Google Lens is very accurate for visual matching
    } else if (product.source === 'google_reverse') {
      score += 15 // Google reverse image search
    } else if (product.source === 'bing_reverse') {
      score += 10 // Bing reverse image search
    } else if (product.source === 'gemini_web_search_fallback') {
      score += 8 // Gemini fallback parsing
    }
    
    // Prefer known retailers (visual results from trusted sources)
    const preferredRetailers = ['Amazon', 'Target', 'Nordstrom', 'Zara', 'H&M', 'ASOS', 'Macy\'s', 'Walmart']
    if (preferredRetailers.includes(product.retailer)) {
      score += 3
    }
    
    // Prefer products with prices (indicates valid product pages)
    if (product.price && product.price !== 'Price not available') {
      score += 2
    }
    
    // Prefer products with product images (better visual matching)
    if (product.imageUrl) {
      score += 1
    }
    
    // No penalties for non-visual sources since we only use visual search
    
    return score
  }

  // REMOVED: Fallback product generation - using image search only, no fallbacks
  // private async generateFallbackProducts(item: ExtractedItem): Promise<ProductResult[]> {
  //   // Fallback product generation removed - visual search only
  // }

  // REMOVED: Price generation for fallbacks - using image search only
  // private generateRealisticPrice(pieceType: string): number {
  //   // Price generation removed - visual search only
  // }

  // REMOVED: Search URL generation for fallbacks - using image search only
  // private generateSearchUrl(retailer: string, item: ExtractedItem): string {
  //   // Search URL generation removed - visual search only
  // }
}