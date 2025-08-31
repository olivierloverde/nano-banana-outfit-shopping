import { Request, Response } from 'express'
import { GeminiService } from '../services/GeminiService'
import { ApiResponse } from '../types'

export class GeminiController {
  private geminiService: GeminiService

  constructor() {
    this.geminiService = new GeminiService()
  }

  async convertToFlatLay(req: Request, res: Response): Promise<void> {
    try {
      const { imageUrl } = req.body

      if (!imageUrl) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'imageUrl is required'
        })
        return
      }

      const result = await this.geminiService.convertToFlatLay(imageUrl)

      const response: ApiResponse<any> = {
        data: result,
        message: 'Image converted to flat lay successfully'
      }

      res.json(response)
    } catch (error) {
      console.error('Error converting to flat lay:', error)
      
      if (error instanceof Error) {
        res.status(400).json({
          error: 'Conversion failed',
          message: error.message
        })
        return
      }

      res.status(500).json({
        error: 'Failed to convert image',
        message: 'Internal server error'
      })
    }
  }
}