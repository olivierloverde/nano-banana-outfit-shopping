import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import config from './config'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
import { modelRoutes } from './routes/modelRoutes'
import { outfitRoutes } from './routes/outfitRoutes'
import { geminiRoutes } from './routes/geminiRoutes'
import { healthRoutes } from './routes/healthRoutes'

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static file serving for generated images
app.use('/generated', express.static('public/generated'))

// Logging middleware
app.use(morgan('combined'))

// Health check route
app.use('/health', healthRoutes)

// API routes
app.use('/api/models', modelRoutes)
app.use('/api/outfits', outfitRoutes)
app.use('/api/gemini', geminiRoutes)

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`)
  console.log(`📝 Environment: ${config.nodeEnv}`)
  console.log(`🌐 CORS origin: ${config.frontendUrl}`)
  
  // Test Gemini connection if API key is provided
  if (config.google.geminiApiKey) {
    console.log('🔑 Gemini API key configured')
  } else {
    console.warn('⚠️  Gemini API key not configured - some features will be unavailable')
  }
})

export default app