import { Request, Response } from 'express'
import { ModelService } from '../services/ModelService'
import { ApiResponse, PaginatedResponse } from '../types'

export class ModelController {
  private modelService: ModelService

  constructor() {
    this.modelService = new ModelService()
  }

  async getModels(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20

      const result = await this.modelService.getModels(page, limit)

      const response: PaginatedResponse<any> = {
        data: result.models,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: page * limit < result.total
        }
      }

      res.json(response)
    } catch (error) {
      console.error('Error fetching models:', error)
      res.status(500).json({
        error: 'Failed to fetch models',
        message: 'Internal server error'
      })
    }
  }

  async getModelById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const model = await this.modelService.getModelById(id)

      if (!model) {
        res.status(404).json({
          error: 'Model not found',
          message: `Model with id ${id} does not exist`
        })
        return
      }

      const response: ApiResponse<any> = {
        data: model
      }

      res.json(response)
    } catch (error) {
      console.error('Error fetching model:', error)
      res.status(500).json({
        error: 'Failed to fetch model',
        message: 'Internal server error'
      })
    }
  }

  async getModelOutfit(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const outfit = await this.modelService.getModelOutfit(id)

      if (!outfit) {
        res.status(404).json({
          error: 'Outfit not found',
          message: `Outfit for model ${id} does not exist`
        })
        return
      }

      const response: ApiResponse<any> = {
        data: outfit
      }

      res.json(response)
    } catch (error) {
      console.error('Error fetching outfit:', error)
      res.status(500).json({
        error: 'Failed to fetch outfit',
        message: 'Internal server error'
      })
    }
  }

  async processModel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      // Trigger background processing
      const result = await this.modelService.processModel(id)

      const response: ApiResponse<any> = {
        data: result,
        message: 'Model processing initiated'
      }

      res.json(response)
    } catch (error) {
      console.error('Error processing model:', error)
      res.status(500).json({
        error: 'Failed to process model',
        message: 'Internal server error'
      })
    }
  }
}