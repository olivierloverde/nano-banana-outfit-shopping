import { Request, Response, NextFunction } from 'express'

export function validatePagination(req: Request, res: Response, next: NextFunction): void {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20

  if (page < 1) {
    res.status(400).json({
      error: 'Invalid pagination',
      message: 'Page must be greater than 0'
    })
    return
  }

  if (limit < 1 || limit > 100) {
    res.status(400).json({
      error: 'Invalid pagination',
      message: 'Limit must be between 1 and 100'
    })
    return
  }

  // Set validated values
  req.query.page = page.toString()
  req.query.limit = limit.toString()

  next()
}

export function validateImageUrl(req: Request, res: Response, next: NextFunction): void {
  const { imageUrl } = req.body

  if (!imageUrl) {
    res.status(400).json({
      error: 'Missing required field',
      message: 'imageUrl is required'
    })
    return
  }

  try {
    new URL(imageUrl)
  } catch {
    res.status(400).json({
      error: 'Invalid image URL',
      message: 'imageUrl must be a valid URL'
    })
    return
  }

  next()
}