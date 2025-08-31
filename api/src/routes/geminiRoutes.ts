import { Router } from 'express'
import { GeminiController } from '../controllers/GeminiController'
import { validateImageUrl } from '../middleware/validation'

const router = Router()
const geminiController = new GeminiController()

// POST /api/gemini/flat-lay - Convert image to flat lay
router.post('/flat-lay', validateImageUrl, geminiController.convertToFlatLay.bind(geminiController))

export { router as geminiRoutes }