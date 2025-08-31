import { Request, Response, NextFunction } from 'express'

interface ErrorWithStatus extends Error {
  status?: number
  statusCode?: number
}

export function errorHandler(
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  const status = error.status || error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : message,
    message: status === 500 ? 'Something went wrong' : message,
    timestamp: new Date().toISOString(),
    path: req.url
  })
}