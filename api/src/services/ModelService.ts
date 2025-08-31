export class ModelService {
  // Curated Unsplash model images
  private modelImages = [
    'https://img01.ztat.net/article/spp-media-p1/c2f929754cfd44ca98d12e11884a6ec4/6d1326596f2b4fc39ddc0363e1890dde.jpg?imwidth=1800',
    'https://plus.unsplash.com/premium_photo-1673758905770-a62f4309c43c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bW9kZWx8ZW58MHx8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bW9kZWx8ZW58MHx8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fG1vZGVsfGVufDB8fDB8fHww',
    'https://plus.unsplash.com/premium_photo-1661775820832-f971657b13f6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fG1vZGVsfGVufDB8fDB8fHww',
    'https://images.unsplash.com/photo-1562572159-4efc207f5aff?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fG1vZGVsfGVufDB8fDB8fHww'
  ]

  // Mock data for development - replace with database calls
  private mockModels = Array.from({ length: 100 }, (_, index) => ({
    id: `model-${index + 1}`,
    name: `Fashion Model ${index + 1}`,
    imageUrl: this.modelImages[index % this.modelImages.length],
    originalSource: 'Unsplash',
    createdAt: new Date().toISOString()
  }))

  async getModels(page: number, limit: number) {
    // Simulate database query
    const offset = (page - 1) * limit
    const models = this.mockModels.slice(offset, offset + limit)
    
    return {
      models,
      total: this.mockModels.length
    }
  }

  async getModelById(id: string) {
    // Simulate database query
    return this.mockModels.find(model => model.id === id) || null
  }

  async getModelOutfit(modelId: string) {
    // Simulate database query for outfit
    const model = await this.getModelById(modelId)
    if (!model) return null

    return {
      id: `outfit-${modelId}`,
      modelId,
      flatLayUrl: null, // Will be populated after Gemini processing
      geminiProcessedAt: null,
      styleTags: ['casual', 'street-style'],
      createdAt: new Date().toISOString()
    }
  }

  async processModel(modelId: string) {
    // This would typically trigger background job processing
    // For now, just return a processing status
    return {
      modelId,
      status: 'processing',
      message: 'Model processing initiated'
    }
  }
}