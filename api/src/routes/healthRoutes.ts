import { Router } from 'express'
import { HealthController } from '../controllers/HealthController'

const router = Router()
const healthController = new HealthController()

// GET /health - Basic health check endpoint
router.get('/', healthController.healthCheck.bind(healthController))

// GET /health/detailed - Detailed health check with service tests
router.get('/detailed', healthController.detailedHealthCheck.bind(healthController))

export { router as healthRoutes }