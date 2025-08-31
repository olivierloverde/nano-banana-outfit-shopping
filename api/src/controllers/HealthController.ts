import { Request, Response } from 'express'
import config from '../config'
import { GeminiService } from '../services/GeminiService'

export class HealthController {
  private geminiService: GeminiService

  constructor() {
    this.geminiService = new GeminiService()
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          api: 'healthy',
          gemini: config.google.geminiApiKey ? 'configured' : 'not_configured',
          // Add database, redis, etc. status checks here
        },
        config: {
          port: config.port,
          frontendUrl: config.frontendUrl,
          geminiConfigured: !!config.google.geminiApiKey
        }
      }

      res.json(healthStatus)
    } catch (error) {
      console.error('Health check failed:', error)
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      })
    }
  }

  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const services: any = {
        api: 'healthy'
      }

      // Test Gemini connection if configured
      if (config.google.geminiApiKey) {
        try {
          const geminiWorking = await this.geminiService.testConnection()
          services.gemini = geminiWorking ? 'healthy' : 'unhealthy'
        } catch (error) {
          services.gemini = 'unhealthy'
          console.error('Gemini health check failed:', error)
        }
      } else {
        services.gemini = 'not_configured'
      }

      const overallStatus = Object.values(services).every(status => 
        status === 'healthy' || status === 'not_configured'
      ) ? 'healthy' : 'degraded'

      const healthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
        services
      }

      const statusCode = overallStatus === 'healthy' ? 200 : 503
      res.status(statusCode).json(healthStatus)
    } catch (error) {
      console.error('Detailed health check failed:', error)
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      })
    }
  }
}