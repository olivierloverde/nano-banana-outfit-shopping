import { Router } from 'express'
import { ModelController } from '../controllers/ModelController'
import { validatePagination } from '../middleware/validation'

const router = Router()
const modelController = new ModelController()

// GET /api/models - Get paginated models for infinite scroll
router.get('/', validatePagination, modelController.getModels.bind(modelController))

// GET /api/models/:id - Get specific model details
router.get('/:id', modelController.getModelById.bind(modelController))

// GET /api/models/:id/outfit - Get outfit details for a model
router.get('/:id/outfit', modelController.getModelOutfit.bind(modelController))

// POST /api/models/:id/process - Trigger Gemini processing for a model
router.post('/:id/process', modelController.processModel.bind(modelController))

export { router as modelRoutes }