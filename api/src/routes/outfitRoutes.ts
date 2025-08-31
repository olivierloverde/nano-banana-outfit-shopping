import { Router } from 'express'
import { OutfitController } from '../controllers/OutfitController'

const router = Router()
const outfitController = new OutfitController()

// GET /api/outfits/:id - Get outfit details
router.get('/:id', outfitController.getOutfitById.bind(outfitController))

// GET /api/outfits/:id/pieces - Get identified pieces for an outfit
router.get('/:id/pieces', outfitController.getOutfitPieces.bind(outfitController))

export { router as outfitRoutes }