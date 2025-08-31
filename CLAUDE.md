# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Outfit AI is a mobile-first web application that allows users to browse model outfits infinitely, convert them to flat lay using Gemini 2.5 Flash, and shop for individual pieces using Google Lens integration.

## Architecture & Structure

This is a full-stack TypeScript application with:

### Frontend (`/frontend`)
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS with mobile-first approach
- **State**: Zustand for lightweight state management
- **Key Features**: Infinite scroll, responsive modals, image optimization

### Backend API (`/api`)
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with TypeScript models
- **Caching**: Redis for API responses and sessions
- **AI Integration**: Gemini 2.5 Flash for image processing, Google Lens for item identification

### Project Structure
```
outfit-ai/
├── frontend/          # Next.js app
│   ├── src/app/      # App router pages
│   ├── src/components/ # React components
│   ├── src/hooks/    # Custom hooks (useInfiniteScroll)
│   └── src/types/    # TypeScript definitions
├── api/              # Express.js API
│   ├── src/controllers/ # Route handlers
│   ├── src/services/   # Business logic (GeminiService, ModelService)
│   ├── src/routes/     # API routes
│   └── src/middleware/ # Express middleware
├── DEVELOPMENT_PLAN.md # Comprehensive development plan
└── README.md          # Project documentation
```

## Development Commands

### Frontend (Next.js)
```bash
cd frontend
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

### Backend API (Express.js)
```bash
cd api
npm run dev        # Start development server with nodemon (http://localhost:3001)
npm run build      # Compile TypeScript to JavaScript
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run Jest tests
```

## Key Components & Files

### Frontend
- `src/app/page.tsx` - Main homepage with ModelFeed
- `src/components/ModelFeed.tsx` - Infinite scroll implementation
- `src/components/ModelCard.tsx` - Individual model card with hover effects
- `src/components/OutfitModal.tsx` - Modal for outfit details with tabs
- `src/hooks/useInfiniteScroll.ts` - Custom hook for infinite scrolling logic

### Backend
- `src/index.ts` - Express server setup with middleware
- `src/routes/modelRoutes.ts` - Model-related API endpoints
- `src/services/GeminiService.ts` - Gemini 2.5 Flash integration
- `src/controllers/ModelController.ts` - Model business logic

## Environment Setup

### Required Environment Variables

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)

**Backend** (`.env`):
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Google service account JSON

## Development Workflow

1. **Start Backend First**: `cd api && npm run dev`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Key Endpoints**:
   - `GET /api/models?page=1&limit=20` - Paginated models for infinite scroll
   - `POST /api/gemini/flat-lay` - Convert image to flat lay
   - `GET /health` - API health check

## Current Implementation Status

**✅ Completed (MVP Phase 1)**:
- Project structure and configuration
- Frontend infinite scroll with mock data
- Backend API with Express.js setup
- Model feed with responsive cards
- Outfit modal with tabbed interface
- Basic Gemini service structure

**🚧 Next Steps (Phase 2)**:
- Database models and migrations
- Actual Gemini 2.5 Flash API integration
- Google Lens API integration
- User authentication
- Shopping item identification

## Performance Considerations

- Images use Next.js Image component with lazy loading
- Infinite scroll with Intersection Observer API
- API responses are cached with Redis
- Mobile-first responsive design with Tailwind
- TypeScript for type safety across the stack

## Testing Strategy

- Unit tests with Jest for business logic
- Integration tests for API endpoints
- E2E tests with Playwright for user flows
- Performance testing for infinite scroll under load