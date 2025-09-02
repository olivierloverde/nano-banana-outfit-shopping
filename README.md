# Nano Banana Outfit Shopping 👗🍌

A mobile-first web application that allows users to browse model outfits infinitely, convert them to flat lay using Gemini 2.5 Flash, and shop for individual pieces using AI-powered search capabilities.

**This is a working Proof of Concept (PoC) demonstrating the capabilities of nano-banana AI models in fashion and visual understanding applications.**

https://github.com/user-attachments/assets/49defa80-a2ab-4658-b41c-a8a875feece2


## 🚀 Features

- **Infinite Outfit Browsing**: Scroll through endless model outfits with smooth infinite loading
- **AI-Powered Flat Lay Conversion**: Transform any outfit into a flat lay style using Google Gemini 2.5 Flash
- **Smart Item Detection**: Automatically identify and extract individual clothing pieces from outfits  
- **Shopping Integration**: Find similar items to shop using Gemini-powered search and enhanced APIs
- **Mobile-First Design**: Responsive, touch-friendly interface optimized for mobile devices
- **Real-time Processing**: Fast image analysis and conversion with caching for optimal performance

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React State** with hooks (no external state management)

### Backend
- **Node.js** with Express.js
- **TypeScript** throughout
- **Google Gemini 2.5 Flash** for AI image processing and search
- **Enhanced Search APIs** for product matching
- **File-based storage** for simplicity (no database required)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

That's it! No database or Redis setup required - this PoC uses file-based storage for simplicity.

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/nano-banana-outfit-shopping.git
cd nano-banana-outfit-shopping
```

### 2. Backend Setup

```bash
cd api
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual values (see [Environment Variables](#environment-variables) section below).

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Edit the `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. You're Ready!

No database or Redis setup required! The application uses file-based storage for this PoC.

## 🔑 Environment Variables

### Backend API (api/.env)

```env
# Required - Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Required - Google Service Account for enhanced Gemini capabilities  
GOOGLE_APPLICATION_CREDENTIALS=./google-svc.json

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Optional - Enhanced Shopping Features
GOOGLE_CUSTOM_SEARCH_API_KEY=your_custom_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
SERP_API_KEY=your_serp_api_key
```

### Frontend (frontend/.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🔐 Getting API Keys & Credentials

### 1. Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API key" 
3. Create a new project or select existing one
4. Generate your API key
5. Copy the key to your `.env` file as `GEMINI_API_KEY`

### 2. Google Cloud Service Account (Required for enhanced Gemini features)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Vertex AI API** (for advanced Gemini capabilities)
4. Go to **IAM & Admin** → **Service Accounts**
5. Click **Create Service Account**
6. Give it a name like "nano-banana-gemini"
7. Grant the **Vertex AI User** role
8. Click **Create Key** → **JSON**
9. Download the JSON file and rename it to `google-svc.json`
10. Place it in the `api/` directory
11. Set `GOOGLE_APPLICATION_CREDENTIALS=./google-svc.json` in your `.env`

### 3. Google Custom Search API (Optional - for enhanced shopping)

1. Go to [Google Custom Search Engine](https://cse.google.com/)
2. Create a new search engine
3. Get your **Search Engine ID**
4. Go to [Google Cloud Console](https://console.cloud.google.com/)
5. Enable **Custom Search API**
6. Create credentials → API Key
7. Add both values to your `.env` file

### 4. SerpAPI Key (Optional - for reverse image search)

1. Sign up at [SerpAPI](https://serpapi.com/)
2. Get your API key from the dashboard
3. Add to `.env` as `SERP_API_KEY`

## 🚀 Running the Application

### Start Backend (Terminal 1)

```bash
cd api
npm run dev
```

The API will be available at `http://localhost:3001`

### Start Frontend (Terminal 2) 

```bash
cd frontend  
npm run dev
```

The app will be available at `http://localhost:3000`

### Health Check

Visit `http://localhost:3001/health` to verify the backend is running and configured correctly.

## 📱 Usage

1. **Browse Outfits**: Open the app and scroll through the infinite feed of model outfits
2. **Convert to Flat Lay**: Click on any outfit to open the modal, then click "Convert to Flat Lay"
3. **Shop Items**: After conversion, browse the "Shop Items" tab to find similar pieces
4. **Mobile Experience**: The app is optimized for mobile - try it on your phone!

## 🖼️ Adding New Model Images

To add new outfit images to the application:

1. **ModelService Configuration**: The `ModelService` in `api/src/services/ModelService.ts` contains the mock data with outfit URLs
2. **Add New Images**: Simply add new image URLs to the `mockModels` array in the ModelService
3. **Image Requirements**: Use high-quality fashion/outfit images with good lighting and clear clothing visibility
4. **Supported Formats**: JPG, PNG, WebP formats are supported

Example:
```typescript
{
  id: 'new-model-id',
  name: 'Model Name',
  imageUrl: 'https://your-image-url.com/outfit.jpg',
  description: 'Casual summer outfit'
}
```

## 📁 Generated Files Location

When you use the flat lay conversion feature:

### **Flat Lay Images**
- **Location**: `api/public/generated/flat-lay/`
- **Naming**: `flat-lay-[timestamp]-[random].jpg`
- **Purpose**: AI-generated flat lay versions of outfits

### **Extracted Item Images**  
- **Location**: `api/public/generated/items/`
- **Naming**: `item-[itemId]-[timestamp].jpg`
- **Purpose**: Individual clothing pieces extracted from flat lays

### **Access URLs**
Generated images are accessible via:
- Flat lay: `http://localhost:3001/generated/flat-lay/[filename]`
- Items: `http://localhost:3001/generated/items/[filename]`

**Note**: These folders are created automatically when you first generate content.

## 🏗️ Project Structure

```
outfit-ai/
├── api/                          # Backend Express.js API
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── services/           # Business logic
│   │   │   ├── GeminiService.ts       # AI image processing
│   │   │   ├── GoogleLensService.ts   # Item detection
│   │   │   └── ...             # Other services
│   │   ├── routes/             # API routes  
│   │   ├── middleware/         # Express middleware
│   │   └── config/             # Configuration
│   ├── google-svc.json         # Google service account (add this)
│   └── .env                    # Backend environment variables
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   ├── hooks/            # Custom hooks
│   │   └── types/            # TypeScript definitions
│   └── .env.local            # Frontend environment variables
├── CLAUDE.md                 # Development instructions  
└── README.md                # This file
```

## 🧪 Testing

### Backend Tests

```bash
cd api
npm test
```

### Frontend Tests

```bash  
cd frontend
npm test
```

### Type Checking

```bash
# Backend
cd api
npm run type-check

# Frontend  
cd frontend
npm run type-check
```

### Linting

```bash
# Backend
cd api  
npm run lint

# Frontend
cd frontend
npm run lint
```

## 🚀 Production Deployment

### Build for Production

```bash
# Backend
cd api
npm run build
npm start

# Frontend
cd frontend  
npm run build
npm start
```

### Environment Variables for Production

Ensure all environment variables are properly set in your production environment. Never commit actual API keys or credentials to version control.

## 🔧 Development

### Adding New Features

1. Check the `DEVELOPMENT_PLAN.md` for planned features
2. Follow the existing code patterns and TypeScript conventions
3. Add tests for new functionality
4. Update documentation as needed

### API Endpoints

- `GET /api/models` - Get paginated outfit models
- `POST /api/gemini/flat-lay` - Convert outfit to flat lay
- `GET /health` - Health check endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Important Notes

- **API Keys**: Never commit API keys or credentials to version control
- **Rate Limits**: Be aware of API rate limits, especially for Google services
- **Costs**: Google Vision API and Gemini API have usage costs - monitor your usage
- **Mobile First**: The app is designed mobile-first - test on mobile devices

## 🐛 Troubleshooting

### Common Issues

1. **"Google service account not configured"**
   - Ensure `google-svc.json` is in the `api/` directory
   - Check that `GOOGLE_APPLICATION_CREDENTIALS` path is correct

2. **CORS errors**
   - Verify `FRONTEND_URL` in backend `.env` matches your frontend URL

### Getting Help

- Check the [Issues](https://github.com/your-username/nano-banana-outfit-shopping/issues) page
- Review the `CLAUDE.md` file for development guidance
- Ensure all environment variables are correctly configured

## 🙏 Acknowledgments

This Proof of Concept showcases the power of modern AI technologies:

- **Google Team**: For the incredible Gemini 2.5 Flash AI model and search capabilities that power the core functionality
- **Anthropic**: For Claude AI assistance in developing this application
- **Nano-Banana Models**: This PoC demonstrates the potential of nano-banana AI capabilities in fashion and visual understanding

## 🧪 About This PoC

This application serves as a working demonstration of how AI models can be applied to fashion and e-commerce:

- **Visual Understanding**: AI can identify and separate clothing items from complex fashion images
- **Style Transfer**: Converting real-world outfit photos to clean, shoppable flat lay presentations  
- **Smart Shopping**: Bridging the gap between inspiration and purchase through intelligent item matching
- **Mobile-First AI**: Bringing powerful AI capabilities to mobile users with responsive, fast interfaces

The nano-banana approach emphasizes efficiency and practical real-world applications of AI in consumer-facing products.

---

**Made with ❤️, AI, and a lot of ☕** - Enjoy exploring the future of fashion discovery!
