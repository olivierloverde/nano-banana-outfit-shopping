import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'
import config from '../config'

export interface ExtractedItem {
  id: string
  pieceType: string
  description: string
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  extractedImagePath?: string
  extractedImageUrl?: string
  color?: string
  pattern?: string
  style?: string
}

export class ItemExtractionService {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null

  constructor() {
    if (config.google.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(config.google.geminiApiKey)
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-image-preview" 
      })
    }
  }

  async extractIndividualItems(flatLayImageUrl: string): Promise<ExtractedItem[]> {
    if (!this.genAI || !this.model) {
      throw new Error('Gemini API not configured')
    }

    try {
      console.log('🔍 Extracting individual items from flat lay using Gemini...')
      
      // Fetch the flat lay image
      const imageResponse = await axios.get(flatLayImageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      })
      
      const imageBuffer = Buffer.from(imageResponse.data)
      const base64Data = imageBuffer.toString('base64')
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg'
      
      console.log(`📷 Flat lay image fetched: ${imageBuffer.length} bytes`)

      const prompt = `Analyze this flat lay image and identify each individual clothing item and accessory. For each item you find, provide:

1. Item type (dress, shirt, pants, shoes, bag, sunglasses, jewelry, etc.)
2. Detailed description including color, style, and key features
3. Bounding box coordinates (normalized 0-1) showing where the item is located
4. Confidence score (0-1) for how certain you are about the identification
5. Color description
6. Pattern (solid, striped, floral, etc.) if applicable
7. Style characteristics (casual, formal, vintage, modern, etc.)

IMPORTANT RULES:
- For shoes, boots, or any footwear: Treat a PAIR of shoes as ONE single item, not two separate items. If you see both left and right shoes, identify them as one "shoes" item with a bounding box that encompasses both shoes.
- For earrings: Treat a pair as ONE single item, not two separate items.
- For gloves: Treat a pair as ONE single item, not two separate items.
- Do NOT create separate entries for left and right items that naturally come in pairs.

Please respond with a JSON array in this exact format:
[
  {
    "pieceType": "dress",
    "description": "Red long-sleeve midi dress with belt",
    "boundingBox": {"x": 0.2, "y": 0.1, "width": 0.6, "height": 0.7},
    "confidence": 0.95,
    "color": "red",
    "pattern": "solid",
    "style": "casual elegant"
  },
  {
    "pieceType": "shoes",
    "description": "Black leather ankle boots pair",
    "boundingBox": {"x": 0.1, "y": 0.8, "width": 0.4, "height": 0.15},
    "confidence": 0.92,
    "color": "black",
    "pattern": "solid",
    "style": "casual"
  }
]

Only include actual clothing items and accessories visible in the image. Be as detailed and accurate as possible with descriptions to help with shopping searches.`

      const startTime = Date.now()
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ])

      const processingTime = (Date.now() - startTime) / 1000
      console.log(`⚡ Gemini item extraction completed in ${processingTime}s`)

      const response = await result.response
      const analysisText = response.text()
      
      console.log('📋 Raw Gemini response:', analysisText)

      // Parse the JSON response
      const extractedItems = this.parseGeminiResponse(analysisText, flatLayImageUrl)
      
      // Remove any remaining duplicates before processing
      const deduplicatedItems = this.removeDuplicateItems(extractedItems)
      console.log(`🔍 Removed ${extractedItems.length - deduplicatedItems.length} duplicate items`)
      
      // Generate individual item images (cropped from original)
      const itemsWithImages = await this.generateItemImages(deduplicatedItems, imageBuffer, mimeType)
      
      console.log(`✅ Successfully extracted ${itemsWithImages.length} items`)
      
      return itemsWithImages

    } catch (error) {
      console.error('❌ Item extraction error:', error)
      
      // Fallback to basic item detection
      console.log('🔄 Falling back to basic item extraction...')
      return this.generateFallbackItems(flatLayImageUrl)
    }
  }

  private parseGeminiResponse(analysisText: string, flatLayImageUrl: string): ExtractedItem[] {
    try {
      // Try to extract JSON from the response
      let jsonText = analysisText
      
      // Look for JSON array in the response
      const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      } else {
        // Try to find JSON objects wrapped in markdown code blocks
        const codeBlockMatch = analysisText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1]
        }
      }
      
      const parsedItems = JSON.parse(jsonText)
      
      if (!Array.isArray(parsedItems)) {
        throw new Error('Response is not an array')
      }
      
      return parsedItems.map((item: any, index: number) => ({
        id: `extracted-${createHash('md5').update(flatLayImageUrl + index).digest('hex').substring(0, 8)}`,
        pieceType: item.pieceType || 'unknown',
        description: item.description || `${item.pieceType} item`,
        boundingBox: item.boundingBox || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        confidence: item.confidence || 0.8,
        color: item.color,
        pattern: item.pattern,
        style: item.style
      }))
      
    } catch (error) {
      console.error('Failed to parse Gemini JSON response:', error)
      console.log('Raw response:', analysisText)
      
      // Try to extract items using regex fallback
      return this.extractItemsWithRegex(analysisText, flatLayImageUrl)
    }
  }

  private extractItemsWithRegex(analysisText: string, flatLayImageUrl: string): ExtractedItem[] {
    const items: ExtractedItem[] = []
    
    // Common clothing items to look for
    const clothingTypes = ['dress', 'shirt', 'pants', 'shoes', 'bag', 'sunglasses', 'jewelry', 'jacket', 'coat', 'skirt', 'shorts']
    
    for (let i = 0; i < clothingTypes.length; i++) {
      const type = clothingTypes[i]
      const regex = new RegExp(type, 'gi')
      
      if (regex.test(analysisText)) {
        items.push({
          id: `extracted-fallback-${i}`,
          pieceType: type,
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} identified in flat lay`,
          boundingBox: {
            x: 0.1 + (i * 0.1) % 0.8,
            y: 0.1 + Math.floor(i / 3) * 0.3,
            width: 0.3,
            height: 0.3
          },
          confidence: 0.7,
          color: 'various',
          pattern: 'unknown',
          style: 'casual'
        })
      }
    }
    
    return items.slice(0, 5) // Limit to 5 items
  }

  private async generateItemImages(items: ExtractedItem[], imageBuffer: Buffer, mimeType: string): Promise<ExtractedItem[]> {
    if (!this.genAI || !this.model) {
      console.log('Gemini not available for item image generation')
      return items
    }

    const itemsWithImages: ExtractedItem[] = []
    const base64Data = imageBuffer.toString('base64')
    
    for (const item of items) {
      try {
        console.log(`🖼️ Extracting image for ${item.pieceType} using Gemini...`)
        
        // Generate a unique filename for this item
        const itemHash = createHash('md5').update(item.id + item.description).digest('hex')
        const itemFilename = `item_${itemHash}_${Date.now()}.png`
        const itemPath = path.join('public', 'generated', 'items', itemFilename)
        
        // Create the prompt to extract just this specific item
        const extractionPrompt = `Extract and isolate the ${item.description} from this flat lay image. Create a clean image showing only this specific item on a white background, removing all other clothing items and accessories from the image. 

Item to extract: ${item.description}
Item type: ${item.pieceType}
${item.color ? `Color: ${item.color}` : ''}
${item.pattern ? `Pattern: ${item.pattern}` : ''}
${item.style ? `Style: ${item.style}` : ''}

Focus on this item located at approximately x:${item.boundingBox.x}, y:${item.boundingBox.y} in the image. Create a clean, isolated image of just this item that can be used for shopping searches.`

        const startTime = Date.now()
        
        const result = await this.model.generateContent([
          extractionPrompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ])

        const processingTime = (Date.now() - startTime) / 1000
        console.log(`⚡ Item extraction completed in ${processingTime}s for ${item.pieceType}`)

        const response = await result.response
        
        // Check if we got an image response
        let extractedImageUrl = null
        let extractedImagePath = null
        
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0]
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData) {
                // We got a generated image - save it
                extractedImagePath = itemPath
                extractedImageUrl = await this.saveExtractedItemImage(part.inlineData, itemPath)
                console.log(`✅ Saved extracted image for ${item.pieceType}: ${extractedImageUrl}`)
                break
              }
            }
          }
        }

        // If no image was generated, try a different approach with cropping instruction
        if (!extractedImageUrl) {
          console.log(`🔄 Trying alternative extraction for ${item.pieceType}...`)
          extractedImageUrl = await this.tryAlternativeExtraction(item, base64Data, mimeType, itemPath)
        }
        
        const enhancedItem: ExtractedItem = {
          ...item,
          extractedImagePath: extractedImagePath || undefined,
          extractedImageUrl: extractedImageUrl || undefined,
          description: await this.enhanceItemDescription(item)
        }
        
        itemsWithImages.push(enhancedItem)
        
      } catch (error) {
        console.warn(`Failed to extract image for item ${item.id}:`, error)
        // Include item without extracted image but with enhanced description
        const enhancedItem: ExtractedItem = {
          ...item,
          description: await this.enhanceItemDescription(item)
        }
        itemsWithImages.push(enhancedItem)
      }
    }
    
    return itemsWithImages
  }

  private async enhanceItemDescription(item: ExtractedItem): Promise<string> {
    // Create a more detailed description for shopping search
    const parts = []
    
    if (item.color && item.color !== 'various' && item.color !== 'unknown') {
      parts.push(item.color)
    }
    
    if (item.pattern && item.pattern !== 'solid' && item.pattern !== 'unknown') {
      parts.push(item.pattern)
    }
    
    parts.push(item.pieceType)
    
    if (item.style && item.style !== 'unknown') {
      parts.push(item.style)
    }
    
    // Add some context based on item type
    switch (item.pieceType.toLowerCase()) {
      case 'dress':
        parts.push('women\'s', 'fashion')
        break
      case 'shoes':
        parts.push('footwear')
        break
      case 'bag':
        parts.push('handbag', 'accessory')
        break
      case 'sunglasses':
        parts.push('eyewear', 'accessory')
        break
    }
    
    return parts.join(' ')
  }

  private generateFallbackItems(flatLayImageUrl: string): ExtractedItem[] {
    // Generate some basic items as fallback
    const fallbackItems: ExtractedItem[] = [
      {
        id: `fallback-dress-${Date.now()}`,
        pieceType: 'dress',
        description: 'Dress from flat lay outfit',
        boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.7 },
        confidence: 0.6,
        color: 'various',
        pattern: 'unknown',
        style: 'casual'
      },
      {
        id: `fallback-shoes-${Date.now()}`,
        pieceType: 'shoes',
        description: 'Shoes from flat lay outfit',
        boundingBox: { x: 0.1, y: 0.8, width: 0.3, height: 0.15 },
        confidence: 0.6,
        color: 'various',
        pattern: 'unknown',
        style: 'casual'
      },
      {
        id: `fallback-bag-${Date.now()}`,
        pieceType: 'bag',
        description: 'Bag from flat lay outfit',
        boundingBox: { x: 0.7, y: 0.3, width: 0.25, height: 0.3 },
        confidence: 0.6,
        color: 'various',
        pattern: 'unknown',
        style: 'casual'
      }
    ]
    
    return fallbackItems
  }

  private async saveExtractedItemImage(inlineData: any, outputPath: string): Promise<string> {
    try {
      console.log('💾 Saving extracted item image...')
      
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      
      // Convert base64 data to buffer and save
      const imageBuffer = Buffer.from(inlineData.data, 'base64')
      await fs.writeFile(outputPath, imageBuffer)
      
      console.log('✅ Extracted item image saved:', outputPath)
      
      // Return the URL where the frontend can access the image
      const publicUrl = `/generated/items/${path.basename(outputPath)}`
      return `http://localhost:${config.port}${publicUrl}`
      
    } catch (error) {
      console.error('❌ Error saving extracted item image:', error)
      throw error
    }
  }

  private async tryAlternativeExtraction(
    item: ExtractedItem, 
    base64Data: string, 
    mimeType: string, 
    itemPath: string
  ): Promise<string | null> {
    if (!this.genAI || !this.model) {
      return null
    }

    try {
      // Try a more focused cropping approach
      const croppingPrompt = `Crop and extract only the ${item.pieceType} from this flat lay image. The ${item.pieceType} is located at coordinates x:${item.boundingBox.x}, y:${item.boundingBox.y} with width:${item.boundingBox.width}, height:${item.boundingBox.height}. 

Create a clean product image of just this ${item.pieceType} on a white background, suitable for e-commerce. Remove all other items from the image and focus only on this specific piece of clothing.

Description: ${item.description}
${item.color ? `Expected color: ${item.color}` : ''}
${item.pattern ? `Expected pattern: ${item.pattern}` : ''}`

      const result = await this.model.generateContent([
        croppingPrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ])

      const response = await result.response
      
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0]
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              return await this.saveExtractedItemImage(part.inlineData, itemPath)
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('Alternative extraction failed:', error)
      return null
    }
  }

  private removeDuplicateItems(items: ExtractedItem[]): ExtractedItem[] {
    const deduplicatedItems: ExtractedItem[] = []
    const seenItems = new Set<string>()
    
    for (const item of items) {
      const itemKey = this.generateItemKey(item)
      
      // Check if we've already seen a similar item
      if (!seenItems.has(itemKey)) {
        seenItems.add(itemKey)
        deduplicatedItems.push(item)
        continue
      }
      
      // For paired items (shoes, earrings), check for "left/right" duplicates
      const isDuplicate = this.isDuplicatePairedItem(item, deduplicatedItems)
      
      if (!isDuplicate) {
        deduplicatedItems.push(item)
      } else {
        console.log(`🗑️ Removing duplicate ${item.pieceType}: ${item.description}`)
      }
    }
    
    return deduplicatedItems
  }
  
  private generateItemKey(item: ExtractedItem): string {
    // Create a key based on item type, color, and general description
    const normalizedType = this.normalizePieceType(item.pieceType)
    const normalizedColor = item.color ? item.color.toLowerCase() : 'unknown'
    const normalizedDescription = this.normalizeDescription(item.description)
    
    return `${normalizedType}-${normalizedColor}-${normalizedDescription}`
  }
  
  private normalizePieceType(pieceType: string): string {
    const type = pieceType.toLowerCase()
    
    // Normalize similar item types
    const typeMap: { [key: string]: string } = {
      'shoe': 'shoes',
      'boot': 'shoes',
      'boots': 'shoes',
      'sneaker': 'shoes',
      'sneakers': 'shoes',
      'sandal': 'shoes',
      'sandals': 'shoes',
      'heel': 'shoes',
      'heels': 'shoes',
      'earring': 'earrings',
      'glove': 'gloves',
      'sock': 'socks',
      'stocking': 'socks'
    }
    
    return typeMap[type] || type
  }
  
  private normalizeDescription(description: string): string {
    // Remove "left", "right", "pair" from description for comparison
    return description
      .toLowerCase()
      .replace(/\b(left|right|pair|pairs|both)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50) // First 50 chars for comparison
  }
  
  private isDuplicatePairedItem(newItem: ExtractedItem, existingItems: ExtractedItem[]): boolean {
    const newItemType = this.normalizePieceType(newItem.pieceType)
    const pairedTypes = ['shoes', 'earrings', 'gloves', 'socks']
    
    if (!pairedTypes.includes(newItemType)) {
      return false
    }
    
    // Check if we already have this type of paired item
    for (const existingItem of existingItems) {
      const existingType = this.normalizePieceType(existingItem.pieceType)
      
      if (existingType === newItemType) {
        // Check color similarity
        const colorMatch = this.colorsMatch(newItem.color, existingItem.color)
        
        // Check description similarity
        const descriptionSimilarity = this.calculateDescriptionSimilarity(
          this.normalizeDescription(newItem.description),
          this.normalizeDescription(existingItem.description)
        )
        
        // Check spatial proximity (for items in similar locations)
        const spatialSimilarity = this.calculateSpatialSimilarity(
          newItem.boundingBox,
          existingItem.boundingBox
        )
        
        // If color matches and descriptions are similar, or if they're spatially close, consider it a duplicate
        if (colorMatch && (descriptionSimilarity > 0.6 || spatialSimilarity > 0.3)) {
          return true
        }
      }
    }
    
    return false
  }
  
  private colorsMatch(color1?: string, color2?: string): boolean {
    if (!color1 || !color2) return true // If either is unknown, assume match
    
    const c1 = color1.toLowerCase()
    const c2 = color2.toLowerCase()
    
    // Direct match
    if (c1 === c2) return true
    
    // Similar colors
    const colorGroups = [
      ['black', 'dark', 'charcoal'],
      ['white', 'cream', 'ivory', 'off-white'],
      ['blue', 'navy', 'denim'],
      ['brown', 'tan', 'beige', 'camel'],
      ['red', 'burgundy', 'wine'],
      ['pink', 'rose', 'blush']
    ]
    
    for (const group of colorGroups) {
      if (group.includes(c1) && group.includes(c2)) {
        return true
      }
    }
    
    return false
  }
  
  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    // Simple word overlap calculation
    const words1 = new Set(desc1.split(' ').filter(w => w.length > 2))
    const words2 = new Set(desc2.split(' ').filter(w => w.length > 2))
    
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
  
  private calculateSpatialSimilarity(box1: any, box2: any): number {
    // Calculate overlap of bounding boxes
    const x1 = Math.max(box1.x, box2.x)
    const y1 = Math.max(box1.y, box2.y)
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width)
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height)
    
    if (x2 <= x1 || y2 <= y1) return 0 // No overlap
    
    const overlapArea = (x2 - x1) * (y2 - y1)
    const box1Area = box1.width * box1.height
    const box2Area = box2.width * box2.height
    const unionArea = box1Area + box2Area - overlapArea
    
    return unionArea > 0 ? overlapArea / unionArea : 0
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.genAI || !this.model) {
        return false
      }
      
      const result = await this.model.generateContent("Test connection")
      const response = await result.response
      return response.text().length > 0
    } catch (error) {
      console.error('Item extraction service test failed:', error)
      return false
    }
  }
}