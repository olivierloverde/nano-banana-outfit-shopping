import { Model, Outfit, PaginatedResponse, ApiResponse, OutfitPiece } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        errorData
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Network or other errors
    console.error('API Error:', error)
    throw new ApiError(0, 'Network error or server unavailable')
  }
}

export const api = {
  // Models
  async getModels(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Model>> {
    return fetchApi(`/api/models?page=${page}&limit=${limit}`)
  },

  async getModelById(id: string): Promise<ApiResponse<Model>> {
    return fetchApi(`/api/models/${id}`)
  },

  async getModelOutfit(id: string): Promise<ApiResponse<Outfit>> {
    return fetchApi(`/api/models/${id}/outfit`)
  },

  async processModel(id: string): Promise<ApiResponse<any>> {
    return fetchApi(`/api/models/${id}/process`, {
      method: 'POST',
    })
  },

  // Outfits
  async getOutfitById(id: string): Promise<ApiResponse<Outfit>> {
    return fetchApi(`/api/outfits/${id}`)
  },

  async getOutfitPieces(id: string): Promise<ApiResponse<OutfitPiece[]>> {
    return fetchApi(`/api/outfits/${id}/pieces`)
  },

  // Gemini
  async convertToFlatLay(imageUrl: string): Promise<ApiResponse<any>> {
    return fetchApi('/api/gemini/flat-lay', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    })
  },

  // Health
  async healthCheck(): Promise<any> {
    return fetchApi('/health')
  },
}

export { ApiError }