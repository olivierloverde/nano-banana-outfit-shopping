import { Request, Response } from 'express'
import { OutfitService } from '../services/OutfitService'
import { ApiResponse } from '../types'

export class OutfitController {
  private outfitService: OutfitService

  constructor() {
    this.outfitService = new OutfitService()
  }

  async getOutfitById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const outfit = await this.outfitService.getOutfitById(id)

      if (!outfit) {
        res.status(404).json({
          error: 'Outfit not found',
          message: `Outfit with id ${id} does not exist`
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

  async getOutfitPieces(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const pieces = await this.outfitService.getOutfitPieces(id)

      const response: ApiResponse<any[]> = {
        data: pieces
      }

      res.json(response)
    } catch (error) {
      console.error('Error fetching outfit pieces:', error)
      res.status(500).json({
        error: 'Failed to fetch outfit pieces',
        message: 'Internal server error'
      })
    }
  }
}