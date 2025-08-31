import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

interface Config {
  // Server Configuration
  port: number
  nodeEnv: string
  frontendUrl: string
  
  // Google API Configuration
  google: {
    geminiApiKey: string
    cloudProjectId?: string
    applicationCredentials?: string
  }

  // Logging
  logLevel: string
}

const config: Config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Google API Configuration
  google: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    cloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    applicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
}

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    { key: 'GEMINI_API_KEY', value: config.google.geminiApiKey, name: 'Gemini API Key' }
  ]

  const missing = requiredVars.filter(({ value }) => !value)
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:')
    missing.forEach(({ name, key }) => {
      console.warn(`   - ${name} (${key})`)
    })
    
    if (config.nodeEnv === 'production') {
      console.error('❌ Required environment variables missing in production!')
      process.exit(1)
    } else {
      console.warn('⚠️  Some features may not work without proper configuration')
    }
  }
}

// Validate configuration on load
validateConfig()

export default config
export { Config }