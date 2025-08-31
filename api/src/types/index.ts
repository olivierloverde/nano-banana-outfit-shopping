export interface Model {
  id: string
  name?: string
  imageUrl: string
  originalSource?: string
  createdAt: string
}

export interface Outfit {
  id: string
  modelId: string
  flatLayUrl?: string
  geminiProcessedAt?: string
  styleTags?: string[]
  createdAt: string
}

export interface OutfitPiece {
  id: string
  outfitId: string
  pieceType: string // 'shirt', 'pants', 'shoes', etc.
  confidenceScore: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  googleLensData?: Record<string, any>
  createdAt: string
}

export interface ShoppingItem {
  id: string
  outfitPieceId: string
  productName: string
  price: number
  currency: string
  affiliateUrl: string
  retailer: string
  availabilityStatus: string
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

export interface GeminiResponse {
  originalImageUrl: string
  flatLayImageUrl: string
  status: string
  processingTime: number
  confidence: number
  createdAt: string
}